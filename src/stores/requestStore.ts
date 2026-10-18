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
      localStorage.setItem(STORAGE_KEY, jsonStr);
    }

    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke('save_drafts', { draftsJson: jsonStr }).catch(() => {});
        })
        .catch(() => {});
    }
  } catch {
    // Ignore storage quota or disabled storage
  }
}

function loadDrafts(): { tabs: TabItem[]; activeTabId: string } | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
    if (tabs.length === 1) {
      // Always keep at least one tab
      const freshTab = createDefaultTab('New Request');
      saveDrafts([freshTab], freshTab.id);
      set({ tabs: [freshTab], activeTabId: freshTab.id, pendingCloseTabId: null });
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      const nextTab = tabs[idx + 1] || tabs[idx - 1] || filtered[0];
      nextActiveId = nextTab.id;
    }

    saveDrafts(filtered, nextActiveId);
    set({ tabs: filtered, activeTabId: nextActiveId, pendingCloseTabId: null });
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
