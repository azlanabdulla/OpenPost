import { describe, it, expect, beforeEach } from 'vitest';
import { useRequestStore, createDefaultRequest } from '../src/stores/requestStore';
import { sanitizeClientHistorySecrets } from '../src/stores/historyStore';
import { buildOpenPostExport, buildPostmanExport } from '../src/utils/exporter';
import { sanitizeRequestForStorage } from '../src/utils/sanitizer';

describe('Exhaustive Secrets Leakage Verification (Phase 2 Item 1)', () => {
  const SENSITIVE_TOKENS = [
    'TEST_SECRET_BEARER_TOKEN_99999',
    'TEST_SECRET_BASIC_PASSWORD_88888',
    'TEST_SECRET_APIKEY_VALUE_77777',
    'TEST_SECRET_HEADER_AUTH_66666',
    'TEST_SECRET_HEADER_APIKEY_55555',
    'TEST_SECRET_QUERY_APIKEY_44444',
    'TEST_SECRET_URL_TOKEN_33333',
    'TEST_SECRET_BODY_FIELD_22222',
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('proves zero secret tokens leak into localStorage drafts, exports, or history serialization', () => {
    const store = useRequestStore.getState();

    const sensitiveRequest = createDefaultRequest({
      name: 'Sensitive Authenticated Request',
      method: 'POST',
      url: `https://api.internal.bank/v1/transfer?token=TEST_SECRET_URL_TOKEN_33333&account=123`,
      auth: {
        type: 'bearer',
        bearer: { token: 'TEST_SECRET_BEARER_TOKEN_99999' },
      },
      headers: [
        { id: 'h1', key: 'Authorization', value: 'Bearer TEST_SECRET_HEADER_AUTH_66666', enabled: true },
        { id: 'h2', key: 'X-API-KEY', value: 'TEST_SECRET_HEADER_APIKEY_55555', enabled: true },
        { id: 'h3', key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      params: [
        { id: 'p1', key: 'api_key', value: 'TEST_SECRET_QUERY_APIKEY_44444', enabled: true },
        { id: 'p2', key: 'account', value: '123', enabled: true },
      ],
      body: {
        type: 'json',
        rawJson: JSON.stringify({
          client_id: 'client_123',
          password: 'TEST_SECRET_BASIC_PASSWORD_88888',
          secret_key: 'TEST_SECRET_BODY_FIELD_22222',
          api_key: 'TEST_SECRET_APIKEY_VALUE_77777',
        }),
        rawText: '',
        formUrlencoded: [],
        multipart: [],
      },
    });

    // 1. Check in-memory state holds the credentials for active use
    expect(sensitiveRequest.auth.bearer?.token).toBe('TEST_SECRET_BEARER_TOKEN_99999');

    // 2. Check localStorage drafts persistence
    store.addTab(sensitiveRequest);
    const draftsJson = localStorage.getItem('openpost_draft_tabs_v1') || '';
    expect(draftsJson.length).toBeGreaterThan(0);

    for (const secret of SENSITIVE_TOKENS) {
      expect(draftsJson).not.toContain(secret);
    }

    // 3. Check OpenPost native export (secretsExcluded = true by default)
    const tabItem = {
      id: sensitiveRequest.id,
      name: sensitiveRequest.name,
      request: sensitiveRequest,
    };
    const openPostExport = buildOpenPostExport([tabItem], true);
    const openPostExportJson = JSON.stringify(openPostExport);

    for (const secret of SENSITIVE_TOKENS) {
      expect(openPostExportJson).not.toContain(secret);
    }

    // 4. Check Postman Collection v2.1 export (secretsExcluded = true by default)
    const postmanExport = buildPostmanExport([tabItem], true, 'Bank API');
    const postmanExportJson = JSON.stringify(postmanExport);

    for (const secret of SENSITIVE_TOKENS) {
      expect(postmanExportJson).not.toContain(secret);
    }

    // 5. Check History serialization
    const rawHeaders: Record<string, string> = {
      Authorization: 'Bearer TEST_SECRET_HEADER_AUTH_66666',
      'X-API-KEY': 'TEST_SECRET_HEADER_APIKEY_55555',
      'Content-Type': 'application/json',
    };
    const { sanitizedUrl, sanitizedHeadersJson } = sanitizeClientHistorySecrets(
      sensitiveRequest.url,
      rawHeaders
    );

    for (const secret of SENSITIVE_TOKENS) {
      expect(sanitizedUrl).not.toContain(secret);
      expect(sanitizedHeadersJson).not.toContain(secret);
    }

    // 6. Check sanitizeRequestForStorage directly
    const sanitizedDirect = sanitizeRequestForStorage(sensitiveRequest);
    const sanitizedDirectJson = JSON.stringify(sanitizedDirect);

    for (const secret of SENSITIVE_TOKENS) {
      expect(sanitizedDirectJson).not.toContain(secret);
    }
  });
});
