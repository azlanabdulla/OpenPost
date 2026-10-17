import { describe, it, expect, beforeEach } from 'vitest';
import {
  useHistoryStore,
  sanitizeClientHistorySecrets,
  HistoryEntry,
} from '../src/stores/historyStore';
import { useRequestStore } from '../src/stores/requestStore';

describe('Request History Store & Secret Redaction (Problem 2)', () => {
  beforeEach(() => {
    useHistoryStore.setState({ entries: [], searchQuery: '', isLoading: false });
  });

  it('redacts Authorization, Cookie, and API tokens in headers while keeping safe headers', () => {
    const rawHeaders = {
      Authorization: 'Bearer super-secret-jwt-token-12345',
      Cookie: 'session_id=xyz987; user=admin',
      'X-API-Key': 'secret-api-key',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const url = 'https://api.example.com/v1/users';
    const { sanitizedUrl, sanitizedHeadersJson } = sanitizeClientHistorySecrets(url, rawHeaders);

    const parsed = JSON.parse(sanitizedHeadersJson);
    expect(parsed['Authorization']).toBe('[REDACTED]');
    expect(parsed['Cookie']).toBe('[REDACTED]');
    expect(parsed['X-API-Key']).toBe('[REDACTED]');
    expect(parsed['Content-Type']).toBe('application/json');
    expect(parsed['Accept']).toBe('application/json');
    expect(sanitizedUrl).toBe(url);
  });

  it('redacts sensitive query parameters in URL while strictly preserving {{unresolved_templates}}', () => {
    const rawUrl =
      'https://api.example.com/v1/search?token=my_secret_token&api_key=my_key&q=query&auth=passwd&page={{page_number}}';
    const { sanitizedUrl } = sanitizeClientHistorySecrets(rawUrl, {});

    expect(sanitizedUrl).toContain('token=[REDACTED]');
    expect(sanitizedUrl).toContain('api_key=[REDACTED]');
    expect(sanitizedUrl).toContain('auth=[REDACTED]');
    expect(sanitizedUrl).toContain('q=query');
    // Strict requirement: unresolved {{templates}} must NOT be redacted
    expect(sanitizedUrl).toContain('page={{page_number}}');
  });

  it('adds entries and enforces the maximum rolling limit of 100 entries', async () => {
    const store = useHistoryStore.getState();

    // Add 105 entries
    for (let i = 1; i <= 105; i++) {
      await store.addEntry({
        method: 'GET',
        url: `https://api.example.com/item/${i}`,
        headersJson: '{}',
        responseStatus: 200,
        responseStatusText: 'OK',
        responseDurationMs: 15,
        responseSizeBytes: 120,
      });
    }

    const currentEntries = useHistoryStore.getState().entries;
    expect(currentEntries.length).toBe(100);
    // The newest item (105) must be at index 0
    expect(currentEntries[0].url).toBe('https://api.example.com/item/105');
  });

  it('deletes an individual entry by id', async () => {
    const store = useHistoryStore.getState();
    await store.addEntry({
      method: 'GET',
      url: 'https://api.example.com/test-1',
      headersJson: '{}',
    });
    await store.addEntry({
      method: 'POST',
      url: 'https://api.example.com/test-2',
      headersJson: '{}',
    });

    const entries = useHistoryStore.getState().entries;
    expect(entries.length).toBe(2);
    const idToDelete = entries[0].id;

    await store.deleteEntry(idToDelete);
    const updated = useHistoryStore.getState().entries;
    expect(updated.length).toBe(1);
    expect(updated.find((e) => e.id === idToDelete)).toBeUndefined();
  });

  it('clears all history entries', async () => {
    const store = useHistoryStore.getState();
    await store.addEntry({
      method: 'GET',
      url: 'https://api.example.com/item-a',
      headersJson: '{}',
    });
    await store.addEntry({
      method: 'GET',
      url: 'https://api.example.com/item-b',
      headersJson: '{}',
    });

    expect(useHistoryStore.getState().entries.length).toBe(2);
    await store.clearHistory();
    expect(useHistoryStore.getState().entries.length).toBe(0);
  });

  it('restores a history entry into the active tab in useRequestStore', () => {
    const reqStore = useRequestStore.getState();
    reqStore.addTab();

    const entryToRestore: HistoryEntry = {
      id: 'hist-restore-1',
      timestamp: Date.now(),
      method: 'POST',
      url: 'https://api.example.com/v1/webhook',
      headersJson: JSON.stringify({ 'X-Custom-Header': 'CustomValue' }),
      body: '{"event":"user_created"}',
      bodyType: 'json',
      responseStatus: 201,
      responseStatusText: 'Created',
    };

    useHistoryStore.getState().restoreEntryToTab(entryToRestore, false);

    const activeTab = useRequestStore
      .getState()
      .tabs.find((t) => t.id === useRequestStore.getState().activeTabId);
    expect(activeTab).toBeDefined();
    expect(activeTab?.request.method).toBe('POST');
    expect(activeTab?.request.url).toBe('https://api.example.com/v1/webhook');
    expect(activeTab?.request.body.rawJson).toBe('{"event":"user_created"}');
    expect(activeTab?.request.headers.some((h) => h.key === 'X-Custom-Header' && h.value === 'CustomValue')).toBe(
      true
    );
  });

  it('restoring a history entry with [REDACTED] credentials resets them to empty fields rather than sending literal [REDACTED]', () => {
    const reqStore = useRequestStore.getState();
    reqStore.addTab();

    const redactedEntry: HistoryEntry = {
      id: 'hist-redacted-test',
      timestamp: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/v1/auth?token=[REDACTED]&api_key=[REDACTED]&valid=true',
      headersJson: JSON.stringify({
        Authorization: '[REDACTED]',
        Cookie: '[REDACTED]',
        'X-API-Key': '[REDACTED]',
        Accept: 'application/json',
      }),
      body: '{"password":"[REDACTED]","username":"admin"}',
      bodyType: 'json',
      responseStatus: 200,
    };

    useHistoryStore.getState().restoreEntryToTab(redactedEntry, false);

    const activeTab = useRequestStore
      .getState()
      .tabs.find((t) => t.id === useRequestStore.getState().activeTabId);
    expect(activeTab).toBeDefined();

    // URL should have empty query values, not literal [REDACTED]
    expect(activeTab?.request.url).not.toContain('[REDACTED]');
    expect(activeTab?.request.url).toContain('token=&api_key=&valid=true');

    // Headers with [REDACTED] should be reset to empty string
    const authHeader = activeTab?.request.headers.find((h) => h.key === 'Authorization');
    expect(authHeader).toBeDefined();
    expect(authHeader?.value).toBe('');

    const cookieHeader = activeTab?.request.headers.find((h) => h.key === 'Cookie');
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader?.value).toBe('');

    // Safe header preserved
    const acceptHeader = activeTab?.request.headers.find((h) => h.key === 'Accept');
    expect(acceptHeader?.value).toBe('application/json');

    // Body password field should be reset to empty string
    expect(activeTab?.request.body.rawJson).not.toContain('[REDACTED]');
    expect(JSON.parse(activeTab?.request.body.rawJson!).password).toBe('');
    expect(JSON.parse(activeTab?.request.body.rawJson!).username).toBe('admin');
  });
});
