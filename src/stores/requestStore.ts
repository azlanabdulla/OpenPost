import { create } from 'zustand';
import {
  HttpRequest,
  HttpResponse,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  AuthConfig,
  RequestSettings,
} from '../types/http';
import { extractParamsFromUrl, syncUrlWithParams, generateId } from '../utils/url';
import { HttpExecutionError } from '../utils/httpExecutor';
import { sanitizeRequestForStorage } from '../utils/sanitizer';
import { useToastStore } from './toastStore';

export interface TabItem {
  id: string;
  name: string;
  isDirty: boolean;
  request: HttpRequest;
  response: HttpResponse | null;
  isLoading: boolean;
  error: HttpExecutionError | string | null;
  abortController?: AbortController;
}

const STORAGE_KEY = 'openpost_draft_tabs_v1';
const STORAGE_BACKUP_KEY = 'openpost_draft_tabs_v1_bak';

function saveDrafts(tabs: TabItem[], activeTabId: string) {
  try {
    const serializable = tabs.map((t) => ({
      id: t.id,
      name: t.name,
      isDirty: t.isDirty,
      request: sanitizeRequestForStorage(t.request),
    }));
    const jsonStr = JSON.stringify({ tabs: serializable, activeTabId });

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, jsonStr);
        // Retain rolling backup
        localStorage.setItem(STORAGE_BACKUP_KEY, jsonStr);
      } catch (storageErr) {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Storage Quota Exceeded (OP-SAFE-001)',
          message: 'Local storage is full or restricted. Tab drafts are currently kept in memory only.',
          durationMs: 7000,
        });
      }
    }

    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke('save_drafts', { draftsJson: jsonStr })
            .then(async () => {
              // Update last known disk mtime after successful write
              try {
                const mtime = await invoke<number>('get_drafts_metadata');
                if (mtime > 0) {
                  useRequestStore.setState({ lastKnownDiskMtime: mtime });
                }
              } catch {}
            })
            .catch((diskErr) => {
              console.error('Tauri disk write failure:', diskErr);
              useToastStore.getState().addToast({
                type: 'error',
                title: 'Disk Write Failed (OP-SAFE-002)',
                message: `Failed to commit drafts to disk: ${diskErr}. In-memory state preserved.`,
                durationMs: 8000,
              });
            });
        })
        .catch(() => {});
    }
  } catch (err) {
    console.error('Failed to serialize drafts:', err);
  }
}

function loadDrafts(): { tabs: TabItem[]; activeTabId: string } | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('Draft file corrupted, attempting recovery from backup...', parseErr);
      const bakRaw = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (bakRaw) {
        try {
          parsed = JSON.parse(bakRaw);
          useToastStore.getState().addToast({
            type: 'warning',
            title: 'Corrupted Draft Recovered',
            message: 'Detected corrupted draft file. Restored from previous safe backup.',
            durationMs: 7000,
          });
        } catch {
          // Backup also corrupted
        }
      }
      if (!parsed) {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Corrupted Draft Detected',
          message: 'Saved workspace drafts were corrupted and could not be parsed. Initialized clean workspace.',
          durationMs: 8000,
        });
        return null;
      }
    }

    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      const restoredTabs: TabItem[] = parsed.tabs.map((t: any) => ({
        id: t.id || generateId(),
        name: t.name || 'Restored Request',
        isDirty: !!t.isDirty,
        request: t.request || createDefaultRequest(),
        response: null,
        isLoading: false,
        error: null,
      }));
      return {
        tabs: restoredTabs,
        activeTabId: parsed.activeTabId || restoredTabs[0].id,
      };
    }
  } catch {
    // Fall back to default
  }
  return null;
}

export function createDefaultRequest(overrides?: Partial<HttpRequest>): HttpRequest {
  return {
    id: generateId(),
    name: 'Untitled Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    params: [
      { id: generateId(), key: '', value: '', enabled: true, description: '' },
    ],
    headers: [
      { id: generateId(), key: 'Accept', value: '*/*', enabled: true, description: 'Default accept header' },
    ],
    body: {
      type: 'none',
      rawJson: '{\n  \n}',
      rawText: '',
      formUrlencoded: [],
      multipart: [],
    },
    auth: {
      type: 'none',
    },
    settings: {
      timeoutMs: 30000,
      verifySsl: true,
      followRedirects: true,
    },
    ...overrides,
  };
}

export function createDefaultTab(name = 'New Request', overrides?: Partial<HttpRequest>): TabItem {
  const req = createDefaultRequest(overrides);
  req.name = overrides?.name || name;
  const initialParams = extractParamsFromUrl(req.url);
  if (initialParams.length > 0) {
    req.params = initialParams;
  }
  return {
    id: req.id,
    name: req.name,
    isDirty: false,
    request: req,
    response: null,
    isLoading: false,
    error: null,
  };
}

interface RequestStoreState {
  tabs: TabItem[];
  activeTabId: string;
  pendingCloseTabId: string | null;
  lastKnownDiskMtime: number;

  // Tab actions
  addTab: (request?: Partial<HttpRequest>) => void;
  closeTab: (tabId: string) => void;
  requestCloseTab: (tabId: string) => void;
  confirmCloseTab: () => void;
  cancelCloseTab: () => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;

  // Active request modifications
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setParams: (params: KeyValueParam[]) => void;
  setHeaders: (headers: KeyValueParam[]) => void;
  setBody: (body: RequestBody) => void;
  setAuth: (auth: AuthConfig) => void;
  setSettings: (settings: Partial<RequestSettings>) => void;

  // Request execution state
  setIsLoading: (tabId: string, isLoading: boolean, abortController?: AbortController) => void;
  setResponse: (tabId: string, response: HttpResponse | null) => void;
  setError: (tabId: string, error: HttpExecutionError | string | null) => void;
  cancelRequest: (tabId: string) => void;
}

const defaultInitialTab = createDefaultTab('Get Todo');
const storedState = loadDrafts();

export const useRequestStore = create<RequestStoreState>((set, get) => ({
  tabs: storedState ? storedState.tabs : [defaultInitialTab],
  activeTabId: storedState ? storedState.activeTabId : defaultInitialTab.id,
  pendingCloseTabId: null,
  lastKnownDiskMtime: 0,

  addTab: (reqOverrides) => {
    const newTab = createDefaultTab('New Request', reqOverrides);
    set((state) => {
      const nextTabs = [...state.tabs, newTab];
      saveDrafts(nextTabs, newTab.id);
      return {
        tabs: nextTabs,
        activeTabId: newTab.id,
      };
    });
  },

  requestCloseTab: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && tab.isDirty) {
      set({ pendingCloseTabId: tabId });
    } else {
      get().closeTab(tabId);
    }
  },

  confirmCloseTab: () => {
    const { pendingCloseTabId, closeTab } = get();
    if (pendingCloseTabId) {
      closeTab(pendingCloseTabId);
      set({ pendingCloseTabId: null });
    }
  },

  cancelCloseTab: () => {
    set({ pendingCloseTabId: null });
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const closedTab = tabs.find((t) => t.id === tabId);

    if (tabs.length === 1) {
      // Always keep at least one tab
      const freshTab = createDefaultTab('New Request');
      saveDrafts([freshTab], freshTab.id);
      set({ tabs: [freshTab], activeTabId: freshTab.id, pendingCloseTabId: null });
    } else {
      const filtered = tabs.filter((t) => t.id !== tabId);
      let nextActiveId = activeTabId;
      if (activeTabId === tabId) {
        const idx = tabs.findIndex((t) => t.id === tabId);
        const nextTab = tabs[idx + 1] || tabs[idx - 1] || filtered[0];
        nextActiveId = nextTab.id;
      }

      saveDrafts(filtered, nextActiveId);
      set({ tabs: filtered, activeTabId: nextActiveId, pendingCloseTabId: null });
    }

    // Undo action notification (OP-SAFE-003)
    if (closedTab) {
      useToastStore.getState().addToast({
        type: 'info',
        title: 'Tab Closed',
        message: `"${closedTab.name}" has been closed.`,
        durationMs: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            const currentTabs = get().tabs;
            if (!currentTabs.some((t) => t.id === closedTab.id)) {
              const restoredTabs = [...currentTabs, closedTab];
              saveDrafts(restoredTabs, closedTab.id);
              set({ tabs: restoredTabs, activeTabId: closedTab.id });
            }
          },
        },
      });
    }
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  renameTab: (tabId, name) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, name, request: { ...tab.request, name }, isDirty: true }
          : tab
      ),
    }));
  },

  setMethod: (method) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              isDirty: true,
              request: { ...tab.request, method },
            }
          : tab
      ),
    }));
  },

  setUrl: (url) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        // When URL changes, extract query parameters to keep Params table in sync
        const extracted = extractParamsFromUrl(url);
        // If there are existing descriptions, retain them
        const mergedParams = extracted.map((newP) => {
          const old = tab.request.params.find((op) => op.key === newP.key);
          return old ? { ...newP, description: old.description } : newP;
        });

        // Always ensure at least one empty row at the end
        if (mergedParams.length === 0 || mergedParams[mergedParams.length - 1].key !== '') {
          mergedParams.push({ id: generateId(), key: '', value: '', enabled: true, description: '' });
        }

        return {
          ...tab,
          isDirty: true,
          request: {
            ...tab.request,
            url,
            params: mergedParams,
          },
        };
      }),
    }));
  },

  setParams: (params) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        // Sync URL with modified params
        const newUrl = syncUrlWithParams(tab.request.url, params);

        return {
          ...tab,
          isDirty: true,
          request: {
            ...tab.request,
            url: newUrl,
            params,
          },
        };
      }),
    }));
  },

  setHeaders: (headers) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              isDirty: true,
              request: { ...tab.request, headers },
            }
          : tab
      ),
    }));
  },

  setBody: (body) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              isDirty: true,
              request: { ...tab.request, body },
            }
          : tab
      ),
    }));
  },

  setAuth: (auth) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              isDirty: true,
              request: { ...tab.request, auth },
            }
          : tab
      ),
    }));
  },

  setSettings: (settings) => {
    const { activeTabId } = get();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              isDirty: true,
              request: {
                ...tab.request,
                settings: { ...tab.request.settings, ...settings },
              },
            }
          : tab
      ),
    }));
  },

  setIsLoading: (tabId, isLoading, abortController) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              isLoading,
              abortController: isLoading ? abortController : undefined,
              error: isLoading ? null : tab.error,
            }
          : tab
      ),
    }));
  },

  setResponse: (tabId, response) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              response,
              isLoading: false,
              error: null,
            }
          : tab
      ),
    }));
  },

  setError: (tabId, error) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              error,
              isLoading: false,
            }
          : tab
      ),
    }));
  },

  cancelRequest: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.abortController) {
      tab.abortController.abort();
    }
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              isLoading: false,
              error: {
                code: 'OP-NET-004',
                title: 'Request Cancelled',
                message: 'The in-flight request was cancelled by user.',
                isCancelled: true,
                durationMs: 0,
              },
            }
          : t
      ),
    }));
  },
}));

export async function checkExternalDraftChanges(): Promise<boolean> {
  if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const mtime = await invoke<number>('get_drafts_metadata');
      const lastKnown = useRequestStore.getState().lastKnownDiskMtime;
      if (lastKnown > 0 && mtime > 0 && mtime > lastKnown) {
        useToastStore.getState().addToast({
          type: 'warning',
          title: 'File Changed on Disk (OP-SAFE-004)',
          message: 'Workspace drafts were modified by an external program.',
          durationMs: 10000,
          action: {
            label: 'Reload from Disk',
            onClick: async () => {
              try {
                const content = await invoke<string>('load_drafts');
                if (content) {
                  const parsed = JSON.parse(content.replace(/^RESTORED_FROM_BACKUP:/, ''));
                  if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                    useRequestStore.setState({
                      tabs: parsed.tabs,
                      activeTabId: parsed.activeTabId || parsed.tabs[0]?.id,
                      lastKnownDiskMtime: mtime,
                    });
                    useToastStore.getState().addToast({
                      type: 'success',
                      title: 'Drafts Reloaded',
                      message: 'Successfully reloaded updated workspace state from disk.',
                      durationMs: 4000,
                    });
                  }
                }
              } catch (reloadErr) {
                console.error('Failed to reload external draft:', reloadErr);
              }
            },
          },
        });
        return true;
      }
    } catch {
      // Ignore if Tauri metadata not available
    }
  }
  return false;
}

