import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistoryStore, type HistoryEntry } from '../src/stores/historyStore';
import { useToastStore } from '../src/stores/toastStore';
import { APP_MESSAGES } from '../src/messages';

const rpc = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: rpc.invoke }));

const fixtureEntries: HistoryEntry[] = [
  {
    id: 'hist-test-1',
    timestamp: 1710000001000,
    method: 'GET',
    url: 'https://api.example.com/items',
    headersJson: '{"Accept":"application/json"}',
    responseStatus: 200,
    responseStatusText: 'OK',
    responseDurationMs: 30,
    responseSizeBytes: 100,
  },
  {
    id: 'hist-test-2',
    timestamp: 1710000002000,
    method: 'POST',
    url: 'https://api.example.com/items',
    headersJson: '{"Content-Type":"application/json"}',
    body: '{"name":"item-2"}',
    bodyType: 'json',
    responseStatus: 201,
    responseStatusText: 'Created',
    responseDurationMs: 45,
    responseSizeBytes: 150,
  },
];

const previousTauri = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__');
const originalIndexedDB = window.indexedDB;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    configurable: true,
    value: {},
  });
  useHistoryStore.setState({
    entries: structuredClone(fixtureEntries),
    searchQuery: '',
    isLoading: false,
    isClearing: false,
  });
  useToastStore.setState({ toasts: [] });
  rpc.invoke.mockReset();
});

afterEach(() => {
  if (previousTauri) {
    Object.defineProperty(window, '__TAURI_INTERNALS__', previousTauri);
  } else {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  }
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: originalIndexedDB,
  });
  useHistoryStore.setState({ entries: [], searchQuery: '', isLoading: false, isClearing: false });
  useToastStore.setState({ toasts: [] });
  vi.restoreAllMocks();
});

describe('history clear failure handling & contracts', () => {
  it('keeps entries in store when clear_history rejects', async () => {
    rpc.invoke.mockRejectedValueOnce(new Error('Tauri IPC clear failed'));

    await useHistoryStore.getState().clearHistory();

    expect(rpc.invoke).toHaveBeenCalledWith('clear_history');
    expect(useHistoryStore.getState().entries).toEqual(fixtureEntries);
    expect(useHistoryStore.getState().isClearing).toBe(false);
  });

  it('shows error toast with OP-HIST-001 code and no success toast on failure', async () => {
    rpc.invoke.mockRejectedValueOnce(new Error('Locked SQLite file'));

    await useHistoryStore.getState().clearHistory();

    const toasts = useToastStore.getState().toasts;
    expect(toasts.map((t) => t.title)).not.toContain('History Cleared');

    const errToast = toasts.find((t) => t.type === 'error');
    expect(errToast).toBeDefined();
    expect(errToast?.title).toContain(APP_MESSAGES.HIST_CLEAR_FAILED.code);
    expect(errToast?.message).toBe(APP_MESSAGES.HIST_CLEAR_FAILED.message);
    expect(errToast?.action?.label).toBe('Retry');
  });

  it('allows user to retry clearing history via the error toast retry action', async () => {
    // First attempt rejects
    rpc.invoke.mockRejectedValueOnce(new Error('Temporary lock'));

    await useHistoryStore.getState().clearHistory();
    expect(useHistoryStore.getState().entries.length).toBe(2);

    const errToast = useToastStore.getState().toasts.find((t) => t.type === 'error');
    expect(errToast?.action).toBeDefined();

    // Second attempt (retry) succeeds
    rpc.invoke.mockResolvedValueOnce(undefined);
    await errToast!.action!.onClick();

    expect(useHistoryStore.getState().entries).toEqual([]);
    const titles = useToastStore.getState().toasts.map((t) => t.title);
    expect(titles).toContain('History Cleared');
  });

  it('preserves entries added during a pending clear when clear rejects', async () => {
    let rejectClear!: (err: Error) => void;
    const pendingPromise = new Promise<void>((_, reject) => {
      rejectClear = reject;
    });
    rpc.invoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'clear_history') return pendingPromise;
      if (cmd === 'record_history_entry') return;
      throw new Error(`Unexpected command: ${cmd}`);
    });

    const clearPromise = useHistoryStore.getState().clearHistory();

    // While clear is pending, add a new entry
    await useHistoryStore.getState().addEntry({
      method: 'PUT',
      url: 'https://api.example.com/items/concurrent',
      headersJson: '{}',
    });

    expect(useHistoryStore.getState().entries.length).toBe(3);

    // Now fail the clear
    rejectClear(new Error('Simulated clear error'));
    await clearPromise;

    // All entries survive (original 2 + concurrent 1)
    expect(useHistoryStore.getState().entries.length).toBe(3);
    expect(useHistoryStore.getState().entries.some((e) => e.url.includes('concurrent'))).toBe(true);
    expect(useToastStore.getState().toasts.map((t) => t.title)).not.toContain('History Cleared');
  });

  it('preserves entries added during a pending clear when clear succeeds', async () => {
    let resolveClear!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveClear = resolve;
    });
    rpc.invoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'clear_history') return pendingPromise;
      if (cmd === 'record_history_entry') return;
      throw new Error(`Unexpected command: ${cmd}`);
    });

    const clearPromise = useHistoryStore.getState().clearHistory();

    // While clear is pending, add a new entry
    await useHistoryStore.getState().addEntry({
      method: 'PATCH',
      url: 'https://api.example.com/items/newly-added',
      headersJson: '{}',
    });

    expect(useHistoryStore.getState().entries.length).toBe(3);

    // Now complete the clear
    resolveClear();
    await clearPromise;

    // Only the concurrent entry survives; previous 2 are cleared
    expect(useHistoryStore.getState().entries.length).toBe(1);
    expect(useHistoryStore.getState().entries[0].url).toBe('https://api.example.com/items/newly-added');
    expect(useToastStore.getState().toasts.map((t) => t.title)).toContain('History Cleared');
  });

  it('prevents double clicks while a clear is pending', async () => {
    let resolveClear!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveClear = resolve;
    });
    rpc.invoke.mockReturnValue(pendingPromise);

    const call1 = useHistoryStore.getState().clearHistory();
    expect(useHistoryStore.getState().isClearing).toBe(true);

    // Rapid double-click second call
    const call2 = useHistoryStore.getState().clearHistory();

    resolveClear();
    await Promise.all([call1, call2]);

    expect(useHistoryStore.getState().isClearing).toBe(false);
    // IPC clear_history was only invoked once!
    expect(rpc.invoke).toHaveBeenCalledTimes(1);
  });
});

describe('single entry delete failure handling & contracts', () => {
  it('keeps the entry in store when delete_history_item rejects', async () => {
    rpc.invoke.mockRejectedValueOnce(new Error('Tauri IPC delete failed'));

    await useHistoryStore.getState().deleteEntry('hist-test-1');

    expect(rpc.invoke).toHaveBeenCalledWith('delete_history_item', { id: 'hist-test-1' });
    expect(useHistoryStore.getState().entries.length).toBe(2);
    expect(useHistoryStore.getState().entries.some((e) => e.id === 'hist-test-1')).toBe(true);
  });

  it('shows error toast with OP-HIST-002 and no success/undo toast when delete rejects', async () => {
    rpc.invoke.mockRejectedValueOnce(new Error('Database locked'));

    await useHistoryStore.getState().deleteEntry('hist-test-1');

    const toasts = useToastStore.getState().toasts;
    expect(toasts.map((t) => t.title)).not.toContain('History Entry Deleted');

    const errToast = toasts.find((t) => t.type === 'error');
    expect(errToast).toBeDefined();
    expect(errToast?.title).toContain(APP_MESSAGES.HIST_DELETE_FAILED.code);
    expect(errToast?.message).toBe(APP_MESSAGES.HIST_DELETE_FAILED.message);
    expect(errToast?.action?.label).toBe('Retry');
  });

  it('allows retrying deleteEntry via the error toast retry action', async () => {
    rpc.invoke.mockRejectedValueOnce(new Error('Temporary lock'));

    await useHistoryStore.getState().deleteEntry('hist-test-1');
    expect(useHistoryStore.getState().entries.length).toBe(2);

    const errToast = useToastStore.getState().toasts.find((t) => t.type === 'error');
    expect(errToast?.action).toBeDefined();

    // Retry succeeds
    rpc.invoke.mockResolvedValueOnce(undefined);
    await errToast!.action!.onClick();

    expect(useHistoryStore.getState().entries.length).toBe(1);
    expect(useHistoryStore.getState().entries.some((e) => e.id === 'hist-test-1')).toBe(false);
    expect(useToastStore.getState().toasts.map((t) => t.title)).toContain('History Entry Deleted');
  });
});

describe('IndexedDB fallback failure handling', () => {
  beforeEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('IndexedDB fallback: clearHistory handles failure properly', async () => {
    const mockDB = {
      objectStoreNames: { contains: () => true },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => {
        const tx: any = {
          objectStore: vi.fn(() => ({
            clear: vi.fn(() => ({})),
          })),
          oncomplete: null,
          onerror: null,
          onabort: null,
          error: new Error('IDB transaction failure'),
        };
        setTimeout(() => tx.onerror?.(), 0);
        return tx;
      }),
    };
    const openReq: any = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: vi.fn(() => {
          setTimeout(() => openReq.onsuccess?.(), 0);
          return openReq;
        }),
      },
    });

    await useHistoryStore.getState().clearHistory();

    // Entries preserved
    expect(useHistoryStore.getState().entries).toEqual(fixtureEntries);
    expect(useToastStore.getState().toasts.map((t) => t.title)).not.toContain('History Cleared');

    const errToast = useToastStore.getState().toasts.find((t) => t.type === 'error');
    expect(errToast?.title).toContain(APP_MESSAGES.HIST_CLEAR_FAILED.code);
  });

  it('IndexedDB fallback: deleteEntry handles failure properly', async () => {
    const mockDB = {
      objectStoreNames: { contains: () => true },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => {
        const tx: any = {
          objectStore: vi.fn(() => ({
            delete: vi.fn(() => ({})),
          })),
          oncomplete: null,
          onerror: null,
          onabort: null,
          error: new Error('IDB delete error'),
        };
        setTimeout(() => tx.onerror?.(), 0);
        return tx;
      }),
    };
    const openReq: any = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: vi.fn(() => {
          setTimeout(() => openReq.onsuccess?.(), 0);
          return openReq;
        }),
      },
    });

    await useHistoryStore.getState().deleteEntry('hist-test-1');

    // Entry preserved
    expect(useHistoryStore.getState().entries.length).toBe(2);
    expect(useToastStore.getState().toasts.map((t) => t.title)).not.toContain('History Entry Deleted');

    const errToast = useToastStore.getState().toasts.find((t) => t.type === 'error');
    expect(errToast?.title).toContain(APP_MESSAGES.HIST_DELETE_FAILED.code);
  });
});
