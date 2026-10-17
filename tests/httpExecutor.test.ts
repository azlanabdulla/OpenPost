import { describe, it, expect } from 'vitest';
import {
  buildEffectiveHeaders,
  buildEffectiveUrl,
  buildEffectiveBody,
} from '../src/utils/httpExecutor';
import { HttpRequest } from '../src/types/http';

describe('HTTP Executor request builder helpers', () => {
  const baseRequest: HttpRequest = {
    id: 'req_1',
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.example.com/data',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
  };

  it('builds headers with enabled user headers', () => {
    const req: HttpRequest = {
      ...baseRequest,
      headers: [
        { id: '1', key: 'Accept', value: 'application/json', enabled: true },
        { id: '2', key: 'X-Disabled', value: 'secret', enabled: false },
        { id: '3', key: 'X-Custom', value: 'my-value', enabled: true },
      ],
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['Accept']).toBe('application/json');
    expect(headers['X-Custom']).toBe('my-value');
    expect(headers['X-Disabled']).toBeUndefined();
  });

  it('adds Bearer token auth header', () => {
    const req: HttpRequest = {
      ...baseRequest,
      auth: {
        type: 'bearer',
        bearer: { token: 'jwt_abc_123' },
      },
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['Authorization']).toBe('Bearer jwt_abc_123');
  });

  it('adds Basic auth header with base64 encoding', () => {
    const req: HttpRequest = {
      ...baseRequest,
      auth: {
        type: 'basic',
        basic: { username: 'admin', password: 'password123' },
      },
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['Authorization']).toBe('Basic YWRtaW46cGFzc3dvcmQxMjM=');
  });

  it('adds API Key to headers when configured as header', () => {
    const req: HttpRequest = {
      ...baseRequest,
      auth: {
        type: 'apikey',
        apiKey: { key: 'X-API-KEY', value: 'my-secret-key', addTo: 'header' },
      },
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['X-API-KEY']).toBe('my-secret-key');
  });

  it('adds API Key to query string when configured as query', () => {
    const req: HttpRequest = {
      ...baseRequest,
      url: 'https://api.example.com/items',
      auth: {
        type: 'apikey',
        apiKey: { key: 'api_key', value: 'secret123', addTo: 'query' },
      },
    };

    const effectiveUrl = buildEffectiveUrl(req);
    expect(effectiveUrl).toBe('https://api.example.com/items?api_key=secret123');
  });

  it('sets Content-Type application/json automatically for JSON bodies', () => {
    const req: HttpRequest = {
      ...baseRequest,
      method: 'POST',
      body: {
        type: 'json',
        rawJson: '{"name":"OpenPost"}',
      },
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['Content-Type']).toBe('application/json');

    const body = buildEffectiveBody(req);
    expect(body).toBe('{"name":"OpenPost"}');
  });

  it('formats form-urlencoded body correctly', () => {
    const req: HttpRequest = {
      ...baseRequest,
      method: 'POST',
      body: {
        type: 'form-urlencoded',
        formUrlencoded: [
          { id: '1', key: 'username', value: 'alice', enabled: true },
          { id: '2', key: 'skip', value: 'me', enabled: false },
          { id: '3', key: 'message', value: 'hello world', enabled: true },
        ],
      },
    };

    const headers = buildEffectiveHeaders(req);
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const body = buildEffectiveBody(req);
    expect(body).toBe('username=alice&message=hello+world');
  });
});
