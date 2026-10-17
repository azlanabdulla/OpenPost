import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeRequestForStorage } from '../src/utils/sanitizer';
import { createDefaultRequest } from '../src/stores/requestStore';
import { HttpRequest } from '../src/types/http';

describe('Draft & Storage Secret Sanitization (OP-R2-001 / OP-AUDIT-012)', () => {
  let sampleRequest: HttpRequest;

  beforeEach(() => {
    sampleRequest = createDefaultRequest({
      url: 'https://api.example.com/v1/secure',
      auth: {
        type: 'bearer',
        bearer: { token: 'super-secret-jwt-token-998877' },
      },
      headers: [
        { id: '1', key: 'Authorization', value: 'Bearer raw-header-token', enabled: true },
        { id: '2', key: 'X-API-KEY', value: 'secret-api-key-value', enabled: true },
        { id: '3', key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      params: [
        { id: 'p1', key: 'api_key', value: 'query-param-secret', enabled: true },
        { id: 'p2', key: 'page', value: '1', enabled: true },
      ],
    });
  });

  it('redacts bearer tokens before persistence', () => {
    const sanitized = sanitizeRequestForStorage(sampleRequest);
    expect(sanitized.auth.bearer?.token).toBe('');
    expect(sampleRequest.auth.bearer?.token).toBe('super-secret-jwt-token-998877'); // In-memory request remains intact
  });

  it('redacts basic auth password before persistence', () => {
    const basicReq = createDefaultRequest({
      auth: {
        type: 'basic',
        basic: { username: 'admin', password: 'SuperSecretPassword!' },
      },
    });

    const sanitized = sanitizeRequestForStorage(basicReq);
    expect(sanitized.auth.basic?.username).toBe('admin');
    expect(sanitized.auth.basic?.password).toBe('');
  });

  it('redacts sensitive headers like Authorization and X-API-KEY', () => {
    const sanitized = sanitizeRequestForStorage(sampleRequest);
    const authHeader = sanitized.headers.find((h) => h.key === 'Authorization');
    const apiKeyHeader = sanitized.headers.find((h) => h.key === 'X-API-KEY');
    const contentTypeHeader = sanitized.headers.find((h) => h.key === 'Content-Type');

    expect(authHeader?.value).toBe('');
    expect(apiKeyHeader?.value).toBe('');
    expect(contentTypeHeader?.value).toBe('application/json');
  });

  it('redacts sensitive query params like api_key', () => {
    const sanitized = sanitizeRequestForStorage(sampleRequest);
    const secretParam = sanitized.params.find((p) => p.key === 'api_key');
    const regularParam = sanitized.params.find((p) => p.key === 'page');

    expect(secretParam?.value).toBe('');
    expect(regularParam?.value).toBe('1');
  });

  it('serializes to JSON without any secrets leaking in storage string', () => {
    const sanitized = sanitizeRequestForStorage(sampleRequest);
    const jsonString = JSON.stringify(sanitized);

    expect(jsonString).not.toContain('super-secret-jwt-token-998877');
    expect(jsonString).not.toContain('raw-header-token');
    expect(jsonString).not.toContain('secret-api-key-value');
    expect(jsonString).not.toContain('query-param-secret');
  });

  it('redacts secret query parameters embedded in URL string', () => {
    const urlReq = createDefaultRequest({
      url: 'https://api.example.com/items?token=jwt_secret_token_abc&secret=my_secret_val&category=books',
    });
    const sanitized = sanitizeRequestForStorage(urlReq);
    expect(sanitized.url).not.toContain('jwt_secret_token_abc');
    expect(sanitized.url).not.toContain('my_secret_val');
    expect(sanitized.url).toContain('category=books');
  });

  it('redacts form-urlencoded and multipart secrets', () => {
    const formReq = createDefaultRequest({
      body: {
        type: 'form-urlencoded',
        formUrlencoded: [
          { id: '1', key: 'password', value: 'my_form_pwd', enabled: true },
          { id: '2', key: 'username', value: 'john_doe', enabled: true },
        ],
        multipart: [
          { id: 'm1', key: 'token', type: 'text', value: 'my_multipart_token', enabled: true },
          { id: 'm2', key: 'field', type: 'text', value: 'regular_data', enabled: true },
        ],
      },
    });

    const sanitized = sanitizeRequestForStorage(formReq);
    expect(sanitized.body.formUrlencoded?.[0].value).toBe('');
    expect(sanitized.body.formUrlencoded?.[1].value).toBe('john_doe');
    expect(sanitized.body.multipart?.[0].value).toBe('');
    expect(sanitized.body.multipart?.[1].value).toBe('regular_data');
  });

  it('redacts sensitive fields in raw JSON bodies', () => {
    const jsonReq = createDefaultRequest({
      body: {
        type: 'json',
        rawJson: JSON.stringify({
          username: 'johndoe',
          password: 'SecretPassword123!',
          nested: {
            apiKey: 'super-key-99',
            publicField: 'safe',
          },
        }),
      },
    });

    const sanitized = sanitizeRequestForStorage(jsonReq);
    const parsed = JSON.parse(sanitized.body.rawJson || '{}');
    expect(parsed.username).toBe('johndoe');
    expect(parsed.password).toBe('');
    expect(parsed.nested.apiKey).toBe('');
    expect(parsed.nested.publicField).toBe('safe');
  });
});

