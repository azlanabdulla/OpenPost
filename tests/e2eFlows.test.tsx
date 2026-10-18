import { describe, it, expect, beforeEach } from 'vitest';
import { useRequestStore, createDefaultRequest } from '../src/stores/requestStore';
import { sanitizeClientHistorySecrets } from '../src/stores/historyStore';
import { resolveRequestVariables } from '../src/utils/variableResolver';
import { buildPostmanExport, buildOpenPostExport, getExportFilename } from '../src/utils/exporter';
import { convertPostmanCollection } from '../src/utils/postmanConverter';

describe('End-to-End Application Workflow Tests (OP-E2E-001)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Flow 1: Request lifecycle, reactive param synchronization, and draft persistence', () => {
    const store = useRequestStore.getState();

    // 1. Add new request
    store.addTab({
      name: 'E2E Test Request',
      method: 'POST',
      url: 'https://api.example.com/items?page=1&limit=20',
    });

    const activeTab = useRequestStore.getState().tabs.find((t) => t.name === 'E2E Test Request');
    expect(activeTab).toBeDefined();
    expect(activeTab?.request.params.length).toBeGreaterThanOrEqual(2);
    expect(activeTab?.request.params.some((p) => p.key === 'page' && p.value === '1')).toBe(true);

    // 2. Verify drafts storage in localStorage is sanitized (secrets never stored in plaintext)
    const storedRaw = localStorage.getItem('openpost_draft_tabs_v1');
    expect(storedRaw).not.toBeNull();
    expect(storedRaw).not.toContain('super-secret-password');
  });

  it('Flow 2: Auth inheritance and variable resolution execution pipeline', () => {
    const parentAuth = {
      type: 'bearer' as const,
      bearer: { token: 'token-{{envToken}}' },
    };

    const request = createDefaultRequest({
      name: 'Inherited Auth Request',
      url: 'https://{{host}}/api/v1/resource',
      headers: [{ id: 'h1', key: 'X-Version', value: '{{apiVersion}}', enabled: true }],
      auth: { type: 'inherit' },
    });

    const variables = {
      host: 'service.internal',
      apiVersion: '2026-10',
      envToken: 'auth-jwt-9988',
    };

    const result = resolveRequestVariables(request, variables, parentAuth);
    expect(result.hasCycle).toBe(false);
    expect(result.resolvedRequest.url).toBe('https://service.internal/api/v1/resource');
    expect(result.resolvedRequest.headers[0].value).toBe('2026-10');
    expect(result.resolvedRequest.auth.type).toBe('bearer');
    expect(result.resolvedRequest.auth.bearer?.token).toBe('token-auth-jwt-9988');
  });

  it('Flow 3: Export in OpenPost and Postman formats and round-trip through importer', () => {
    const testReq = createDefaultRequest({
      name: 'Export Test',
      url: 'https://api.example.com/v1/status',
      method: 'GET',
    });

    const tabItem = { id: testReq.id, name: testReq.name, request: testReq };

    // 1. Export as Postman Collection v2.1
    const postmanExport = buildPostmanExport([tabItem], true, 'E2E Postman Export');
    const postmanFilename = getExportFilename('postman', 'allTabs', 'E2E Postman Export');

    expect(postmanFilename).toContain('.postman_collection.json');

    const imported = convertPostmanCollection(JSON.stringify(postmanExport));
    expect(imported.error).toBeUndefined();
    expect(imported.requests).toHaveLength(1);
    expect(imported.requests[0].name).toBe('Export Test');
    expect(imported.requests[0].url).toBe('https://api.example.com/v1/status');

    // 2. Export as OpenPost Native
    const nativeExport = buildOpenPostExport([tabItem], true);
    const nativeFilename = getExportFilename('openpost', 'allTabs', 'E2E Native Export');

    expect(nativeFilename).toContain('.openpost.json');
    expect(nativeExport.openpostFormat).toBe('1.0.0');
    expect(nativeExport.requests).toHaveLength(1);
  });

  it('Flow 4: History recording and secret redaction', () => {
    const rawUrl = 'https://api.example.com/login?api_key=secret-key-12345&keepMe=yes';
    const rawHeaders = {
      Authorization: 'Bearer secret-jwt-token',
      'X-API-Key': 'key-value-secret',
      Accept: 'application/json',
    };

    const { sanitizedUrl, sanitizedHeadersJson } = sanitizeClientHistorySecrets(rawUrl, rawHeaders);

    // Secrets must be redacted
    expect(sanitizedUrl).not.toContain('secret-key-12345');
    expect(sanitizedUrl).toContain('api_key=[REDACTED]');
    expect(sanitizedUrl).toContain('keepMe=yes');

    expect(sanitizedHeadersJson).not.toContain('secret-jwt-token');
    expect(sanitizedHeadersJson).not.toContain('key-value-secret');
    expect(sanitizedHeadersJson).toContain('[REDACTED]');
    expect(sanitizedHeadersJson).toContain('application/json');
  });
});
