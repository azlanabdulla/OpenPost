const http = require('http');
const zlib = require('zlib');

// 1x1 transparent PNG binary bytes
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  if (url === '/cookies') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Set-Cookie', [
      'session_id=sess_998877; Path=/; HttpOnly; Secure; SameSite=Strict',
      'csrf_token=csrf_token_xyz; Path=/; Secure',
      'user_pref=dark_mode; Path=/; Domain=localhost'
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
      timestamp: Date.now()
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

const PORT = 9876;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock server running at http://127.0.0.1:${PORT}`);
});
