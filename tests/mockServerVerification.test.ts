import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import net from 'net';
import zlib from 'zlib';
import { executeHttpRequest, parseCookieHeader } from '../src/utils/httpExecutor';
import { createDefaultRequest } from '../src/stores/requestStore';

// 1x1 transparent PNG binary bytes
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

let serverInstance: http.Server | null = null;
let baseUrl = '';

describe('Real Mock Server Verification (OP-R2-005, 006, 007, 008)', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      const s = http.createServer((req, res) => {
        const url = req.url || '/';

        if (url === '/cookies') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Set-Cookie', [
            'session_id=sess_998877; Path=/; HttpOnly; Secure; SameSite=Strict',
            'csrf_token=csrf_token_xyz; Path=/; Secure',
            'user_pref=dark_mode; Path=/; Domain=localhost',
          ]);
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', cookies_sent: 3 }));
          return;
        }

        if (url === '/image') {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Length', PNG_BYTES.length);
          res.writeHead(200);
          res.end(PNG_BYTES);
          return;
        }

        if (url === '/gzip') {
          const payload = JSON.stringify({
            message: 'Hello from GZIP compressed endpoint!',
            compressed: true,
            timestamp: Date.now(),
          });
          const compressed = zlib.gzipSync(Buffer.from(payload));
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          res.writeHead(200);
          res.end(compressed);
          return;
        }

        if (url === '/html') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.writeHead(200);
          res.end('<!DOCTYPE html><html><head><title>Mock HTML</title></head><body><h1>Sandboxed Document</h1><p>OpenPost Mock Server Response</p></body></html>');
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      });

      s.on('error', (err: Error) => {
        reject(err);
      });

      s.listen(0, '127.0.0.1', () => {
        serverInstance = s;
        const addr = s.address() as net.AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve, reject) => {
        serverInstance!.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('verifies binary PNG image response is detected as binary and base64 encoded', async () => {
    const req = createDefaultRequest({
      url: `${baseUrl}/image`,
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
      url: `${baseUrl}/gzip`,
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
      url: `${baseUrl}/html`,
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
