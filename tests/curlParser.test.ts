import { describe, it, expect } from 'vitest';
import { parseCurlCommand } from '../src/utils/curlParser';

describe('cURL Import Parser Engine (OP-R2-015)', () => {
  it('parses basic GET cURL command', () => {
    const { request, unsupportedFlags } = parseCurlCommand('curl https://jsonplaceholder.typicode.com/todos/1');
    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://jsonplaceholder.typicode.com/todos/1');
    expect(unsupportedFlags).toEqual([]);
  });

  it('parses POST method, custom headers, and JSON body', () => {
    const curl = `curl -X POST https://api.example.com/v1/users -H "Content-Type: application/json" -H "Accept: application/json" -d '{"name": "Alice"}'`;
    const { request } = parseCurlCommand(curl);

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/v1/users');
    expect(request.headers.some((h) => h.key === 'Content-Type' && h.value === 'application/json')).toBe(true);
    expect(request.headers.some((h) => h.key === 'Accept' && h.value === 'application/json')).toBe(true);
    expect(request.body.type).toBe('json');
    expect(request.body.rawJson).toBe('{"name": "Alice"}');
  });

  it('maps -k / --insecure to verifySsl = false', () => {
    const { request } = parseCurlCommand('curl -k https://self-signed.local/api');
    expect(request.settings?.verifySsl).toBe(false);

    const { request: req2 } = parseCurlCommand('curl --insecure https://self-signed.local/api');
    expect(req2.settings?.verifySsl).toBe(false);
  });

  it('maps -u / --user to Basic Auth', () => {
    const { request } = parseCurlCommand('curl -u admin:secret123 https://api.example.com');
    expect(request.auth.type).toBe('basic');
    expect(request.auth.basic?.username).toBe('admin');
    expect(request.auth.basic?.password).toBe('secret123');
  });

  it('detects and reports unsupported cURL flags', () => {
    const curl = 'curl https://api.example.com/stream --limit-rate 50k --socks5 127.0.0.1:9050';
    const { unsupportedFlags } = parseCurlCommand(curl);

    expect(unsupportedFlags).toContain('--limit-rate');
    expect(unsupportedFlags).toContain('--socks5');
  });
});
