import { describe, it, expect } from 'vitest';
import { executeHttpRequest, parseCookieHeader } from '../src/utils/httpExecutor';
import { createDefaultRequest } from '../src/stores/requestStore';

describe('Real Mock Server Verification (OP-R2-005, 006, 007, 008)', () => {
  it('verifies binary PNG image response is detected as binary and base64 encoded', async () => {
    const req = createDefaultRequest({
      url: 'http://127.0.0.1:9876/image',
      method: 'GET',
    });

    const res = await executeHttpRequest(req);
    expect(res.statusCode).toBe(200);
    expect(res.isBinary).toBe(true);
    expect(res.contentType).toContain('image/png');
    expect(res.body.length).toBeGreaterThan(0);
    // Base64 PNG signature check
    expect(res.body).toContain('iVBORw0KGgo');
  });

  it('verifies gzip response is transparently decompressed', async () => {
    const req = createDefaultRequest({
      url: 'http://127.0.0.1:9876/gzip',
      method: 'GET',
    });

    const res = await executeHttpRequest(req);
    expect(res.statusCode).toBe(200);
    expect(res.contentType).toContain('application/json');
    // Decompressed payload can be parsed as JSON
    const data = JSON.parse(res.body);
    expect(data.message).toBe('Hello from GZIP compressed endpoint!');
    expect(data.compressed).toBe(true);
  });

  it('verifies HTML response is retrieved for sandboxed iframe preview', async () => {
    const req = createDefaultRequest({
      url: 'http://127.0.0.1:9876/html',
      method: 'GET',
    });

    const res = await executeHttpRequest(req);
    expect(res.statusCode).toBe(200);
    expect(res.contentType).toContain('text/html');
    expect(res.body).toContain('<h1>Sandboxed Document</h1>');
    expect(res.body).toContain('OpenPost Mock Server Response');
  });

  it('verifies multi-Set-Cookie parsing extracts all attributes', () => {
    const rawCookies = [
      'session_id=sess_998877; Path=/; HttpOnly; Secure; SameSite=Strict',
      'csrf_token=csrf_token_xyz; Path=/; Secure',
      'user_pref=dark_mode; Path=/; Domain=localhost',
    ];

    const cookies = rawCookies.map(parseCookieHeader);
    expect(cookies).toHaveLength(3);

    // Cookie 1
    expect(cookies[0].name).toBe('session_id');
    expect(cookies[0].value).toBe('sess_998877');
    expect(cookies[0].httpOnly).toBe(true);
    expect(cookies[0].secure).toBe(true);

    // Cookie 2
    expect(cookies[1].name).toBe('csrf_token');
    expect(cookies[1].value).toBe('csrf_token_xyz');
    expect(cookies[1].secure).toBe(true);

    // Cookie 3
    expect(cookies[2].name).toBe('user_pref');
    expect(cookies[2].value).toBe('dark_mode');
    expect(cookies[2].domain).toBe('localhost');
  });
});
