import { describe, it, expect } from 'vitest';
import { sanitizeRequestForStorage } from '../src/utils/sanitizer';
import { createDefaultRequest } from '../src/stores/requestStore';

describe('Export Sanitization & Exclude Secrets Engine (OP-R2-016)', () => {
  it('excludes secrets when exporting requests with excludeSecrets enabled', () => {
    const rawReq = createDefaultRequest({
      name: 'Production Payment Request',
      url: 'https://api.payments.com/v1/charge',
      auth: {
        type: 'apikey',
        apiKey: {
          key: 'X-SECRET-KEY',
          value: 'sk_live_999888777666555',
          addTo: 'header',
        },
      },
      headers: [
        { id: '1', key: 'Authorization', value: 'Bearer token-to-redact', enabled: true },
        { id: '2', key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      params: [
        { id: 'p1', key: 'secret_token', value: 'query-token-value', enabled: true },
      ],
    });

    const exportedReq = sanitizeRequestForStorage(rawReq);
    const exportJson = JSON.stringify({
      openpostFormat: '1.0.0',
      secretsExcluded: true,
      requests: [{ request: exportedReq }],
    });

    expect(exportJson).not.toContain('sk_live_999888777666555');
    expect(exportJson).not.toContain('Bearer token-to-redact');
    expect(exportJson).not.toContain('query-token-value');
    expect(exportJson).toContain('Production Payment Request');
  });
});
