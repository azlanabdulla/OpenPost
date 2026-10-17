import { create } from 'zustand';
import { useRequestStore } from './requestStore';
import { useToastStore } from './toastStore';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headersJson: string;
  body?: string;
  bodyType?: string;
  responseStatus?: number;
  responseStatusText?: string;
  responseDurationMs?: number;
  responseSizeBytes?: number;
  error?: string;
}

interface RawBackendHistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers_json: string;
  body?: string | null;
  body_type?: string | null;
  response_status?: number | null;
  response_status_text?: string | null;
  response_duration_ms?: number | null;
  response_size_bytes?: number | null;
  error?: string | null;
}

interface HistoryState {
  entries: HistoryEntry[];
  searchQuery: string;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  loadHistory: () => Promise<void>;
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  restoreEntryToTab: (entry: HistoryEntry, inNewTab?: boolean) => void;
}

const MAX_HISTORY_LIMIT = 100;
const IDB_NAME = 'openpost_db';
const IDB_STORE = 'request_history';

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

// Client-side sanitizer for secrets before persistent storage
export function sanitizeClientHistorySecrets(url: string, headers: Record<string, string>): { sanitizedUrl: string; sanitizedHeadersJson: string } {
  // 1. Sanitize headers
  const cleanHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const kLower = k.toLowerCase();
    if (
      kLower === 'authorization' ||
      kLower === 'cookie' ||
      kLower === 'set-cookie' ||
      kLower.includes('token') ||
      kLower.includes('secret') ||
      kLower.includes('api-key') ||
      kLower.includes('apikey')
    ) {
      cleanHeaders[k] = '[REDACTED]';
    } else {
      cleanHeaders[k] = v;
    }
  }

  // 2. Sanitize URL query parameters (preserving unresolved {{templates}})
  let sanitizedUrl = url;
  if (url.includes('?')) {
    const [base, query] = url.split('?', 2);
    const params = query.split('&').map((pair) => {
      if (pair.includes('=')) {
        const [k, val] = pair.split('=', 2);
        const kLower = k.toLowerCase();
        const isTemplate = val.startsWith('{{') && val.endsWith('}}');
        if (
          !isTemplate &&
          (kLower.includes('token') ||
            kLower.includes('api_key') ||
            kLower.includes('apikey') ||
            kLower.includes('secret') ||
            kLower.includes('password') ||
            kLower.includes('auth'))
        ) {
          return `${k}=[REDACTED]`;
        }
      }
      return pair;
    });
    sanitizedUrl = `${base}?${params.join('&')}`;
  }

  return {
    sanitizedUrl,
    sanitizedHeadersJson: JSON.stringify(cleanHeaders),
  };
}

// Browser IndexedDB Fallback helper
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  searchQuery: '',
  isLoading: false,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const raw = await invoke<RawBackendHistoryEntry[]>('get_history');
        const mapped: HistoryEntry[] = (raw || []).map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          method: r.method,
          url: r.url,
          headersJson: r.headers_json,
          body: r.body ?? undefined,
          bodyType: r.body_type ?? undefined,
          responseStatus: r.response_status ?? undefined,
          responseStatusText: r.response_status_text ?? undefined,
          responseDurationMs: r.response_duration_ms ?? undefined,
          responseSizeBytes: r.response_size_bytes ?? undefined,
          error: r.error ?? undefined,
        }));
        set({ entries: mapped, isLoading: false });
      } else {
        // Fallback to IndexedDB
        if (typeof indexedDB === 'undefined') {
          set({ entries: [], isLoading: false });
          return;
        }
        const db = await openIndexedDB();
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const index = store.index('timestamp');
        const request = index.getAll();
        request.onsuccess = () => {
          const all: HistoryEntry[] = request.result || [];
          all.sort((a, b) => b.timestamp - a.timestamp);
          set({ entries: all.slice(0, MAX_HISTORY_LIMIT), isLoading: false });
        };
        request.onerror = () => {
          set({ isLoading: false });
        };
      }
    } catch (err) {
      console.error('Failed to load request history:', err);
      set({ isLoading: false });
    }
  },

  addEntry: async (entryData) => {
    const id = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = Date.now();

    // Parse headers if needed to sanitize
    let headersObj: Record<string, string> = {};
    try {
      headersObj = JSON.parse(entryData.headersJson);
    } catch {
      // Keep empty if invalid
    }

    const { sanitizedUrl, sanitizedHeadersJson } = sanitizeClientHistorySecrets(
      entryData.url,
      headersObj
    );

    const fullEntry: HistoryEntry = {
      ...entryData,
      id,
      timestamp,
      url: sanitizedUrl,
      headersJson: sanitizedHeadersJson,
    };

    // Optimistic UI update
    const current = get().entries;
    const updated = [fullEntry, ...current.filter((e) => e.id !== id)].slice(0, MAX_HISTORY_LIMIT);
    set({ entries: updated });

    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('record_history_entry', {
          entry: {
            id: fullEntry.id,
            timestamp: fullEntry.timestamp,
            method: fullEntry.method,
            url: fullEntry.url,
            headers_json: fullEntry.headersJson,
            body: fullEntry.body ?? null,
            body_type: fullEntry.bodyType ?? null,
            response_status: fullEntry.responseStatus ?? null,
            response_status_text: fullEntry.responseStatusText ?? null,
            response_duration_ms: fullEntry.responseDurationMs ?? null,
            response_size_bytes: fullEntry.responseSizeBytes ?? null,
            error: fullEntry.error ?? null,
          },
          maxLimit: MAX_HISTORY_LIMIT,
        });
      } else if (typeof indexedDB !== 'undefined') {
        const db = await openIndexedDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(fullEntry);
      }
    } catch (err) {
      console.error('Failed to record history entry:', err);
    }
  },

  deleteEntry: async (id: string) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    }));

    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_history_item', { id });
      } else if (typeof indexedDB !== 'undefined') {
        const db = await openIndexedDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  },

  clearHistory: async () => {
    set({ entries: [] });
    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('clear_history');
      } else if (typeof indexedDB !== 'undefined') {
        const db = await openIndexedDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  },

  restoreEntryToTab: (entry: HistoryEntry, inNewTab = false) => {
    const { addTab, activeTabId, setMethod, setUrl, setHeaders, setBody } = useRequestStore.getState();
    const { addToast } = useToastStore.getState();

    let targetTabId = activeTabId;
    if (inNewTab || !targetTabId) {
      addTab();
      targetTabId = useRequestStore.getState().activeTabId;
    }

    if (!targetTabId) return;

    let hadRedactions = false;

    // 1. Scrub URL query params: replace =[REDACTED] with empty value =
    let cleanUrl = entry.url;
    if (cleanUrl.includes('[REDACTED]')) {
      cleanUrl = cleanUrl.replace(/=\[REDACTED\]/g, '=');
      hadRedactions = true;
    }

    setMethod(entry.method as any);
    setUrl(cleanUrl);

    // 2. Scrub headers: if header contains [REDACTED], reset value to empty string
    try {
      const parsed = JSON.parse(entry.headersJson);
      const headersList = Object.entries(parsed).map(([key, value]) => {
        const valStr = String(value);
        if (valStr.includes('[REDACTED]')) {
          hadRedactions = true;
          return {
            id: `hdr-${Math.random().toString(36).slice(2, 9)}`,
            key,
            value: '',
            enabled: true,
          };
        }
        return {
          id: `hdr-${Math.random().toString(36).slice(2, 9)}`,
          key,
          value: valStr,
          enabled: true,
        };
      });
      setHeaders(headersList);
    } catch {
      // Keep headers as is
    }

    // 3. Scrub body: reset any [REDACTED] values to empty string
    if (entry.body) {
      let cleanBody = entry.body;
      if (cleanBody.includes('[REDACTED]')) {
        hadRedactions = true;
        try {
          const parsed = JSON.parse(cleanBody);
          const scrubJson = (obj: any) => {
            if (typeof obj === 'object' && obj !== null) {
              for (const k of Object.keys(obj)) {
                if (obj[k] === '[REDACTED]') {
                  obj[k] = '';
                } else if (typeof obj[k] === 'object') {
                  scrubJson(obj[k]);
                }
              }
            }
          };
          scrubJson(parsed);
          cleanBody = JSON.stringify(parsed, null, 2);
        } catch {
          cleanBody = cleanBody.replace(/\[REDACTED\]/g, '');
        }
      }

      const isJson = entry.bodyType === 'json' || (!entry.bodyType && cleanBody.trim().startsWith('{'));
      setBody({
        type: isJson ? 'json' : 'text',
        rawJson: isJson ? cleanBody : undefined,
        rawText: !isJson ? cleanBody : undefined,
      });
    }

    // 4. Notify user if credentials were reset to empty fields
    if (hadRedactions) {
      addToast({
        type: 'warning',
        title: 'Credentials Cleared',
        message: 'Restored from history. Redacted tokens, keys, and passwords were reset to empty fields for security.',
        durationMs: 5000,
      });
    } else {
      addToast({
        type: 'info',
        title: 'Request Restored',
        message: `${entry.method} ${cleanUrl} loaded into active tab.`,
        durationMs: 3000,
      });
    }
  },
}));
