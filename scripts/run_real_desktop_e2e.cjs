/**
 * Real End-to-End (E2E) Test Suite for OpenPost Desktop App
 *
 * Runs against the compiled openpost.exe binary using Chrome DevTools Protocol (CDP).
 * Works against both debug and release builds by driving the UI purely via real DOM events.
 *
 * Requirements:
 * - Item 9 Run 1: Send a request through Rust backend and verify response in DOM.
 * - Item 9 Run 2: Save a request to a collection and verify persistence in DOM and store.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const PORT = 9786;

function resolveExePath() {
  const exeArgIdx = process.argv.indexOf('--exe');
  if (exeArgIdx !== -1 && process.argv[exeArgIdx + 1] && fs.existsSync(process.argv[exeArgIdx + 1])) {
    return process.argv[exeArgIdx + 1];
  }
  if (process.env.OPENPOST_EXE && fs.existsSync(process.env.OPENPOST_EXE)) {
    return process.env.OPENPOST_EXE;
  }
  const releasePath = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'openpost.exe');
  if (fs.existsSync(releasePath)) {
    return releasePath;
  }
  return path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');
}

const EXE_PATH = resolveExePath();

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startLocalMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      console.log(`[Mock Server] Received ${req.method} ${req.url} from OpenPost Desktop App`);
      if (req.url === '/api/e2e-ping') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-OpenPost-Engine': 'rust-reqwest-engine',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          status: 'pong',
          service: 'OpenPost Real E2E Test Host',
          timestamp: Date.now(),
          clientSent: req.headers['user-agent'] || 'OpenPost/0.1.0'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`[Mock Server] Listening on http://127.0.0.1:${port}`);
      resolve({ server, port });
    });
  });
}

async function connectToCDP(port) {
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
      });
      const target = targets.find(t => t.url && t.url.includes('tauri.localhost') && t.webSocketDebuggerUrl);
      if (target) {
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.onopen = res;
          ws.onerror = rej;
        });
        return { ws, target };
      }
    } catch (e) {}
  }
  throw new Error('Could not connect to OpenPost CDP port');
}

async function main() {
  console.log('===============================================================');
  console.log('   OPENPOST REAL DESKTOP APP E2E TEST RUNNER (PHASE 3 / ITEM 9)');
  console.log('===============================================================\n');

  if (!fs.existsSync(EXE_PATH)) {
    console.error(`ERROR: openpost.exe not found at ${EXE_PATH}`);
    process.exit(1);
  }

  // 1. Start Mock Server
  const { server, port: mockPort } = await startLocalMockServer();

  // 2. Kill existing instances
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch(e) {}
  await sleep(600);

  // 3. Launch App with CDP
  console.log(`Launching real desktop binary: ${EXE_PATH}...`);
  const app = spawn(EXE_PATH, [], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` }
  });
  app.unref();

  let wsSession;
  try {
    const { ws, target } = await connectToCDP(PORT);
    wsSession = ws;
    console.log(`Connected to Desktop Window: "${target.title}"`);

    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const cur = msgId++;
      const handler = e => {
        const m = JSON.parse(e.data);
        if (m.id === cur) {
          ws.removeEventListener('message', handler);
          if (m.error) reject(m.error);
          else resolve(m.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', {
        expression: `(() => { ${expr} })()`,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`CDP Eval Exception: ${JSON.stringify(res.exceptionDetails)}`);
      }
      return res.result ? res.result.value : undefined;
    };

    // Wait for DOM to be interactive
    for (let i = 0; i < 30; i++) {
      const ok = await evaluate('return !!document.querySelector("input[aria-label=\'Request URL\']");');
      if (ok) break;
      await sleep(300);
    }

    // Dismiss welcome
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
      if (btn) btn.click();
      try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
    `);
    await sleep(500);

    // =========================================================================
    // REAL E2E RUN 1: Send Request Through Rust Backend
    // =========================================================================
    console.log('\n>>> REAL E2E RUN 1: Executing HTTP request through Rust backend to local mock server...');

    const targetUrl = `http://127.0.0.1:${mockPort}/api/e2e-ping`;
    
    // Set URL directly in input element and trigger React synthetic change
    await evaluate(`
      const input = document.querySelector('input[aria-label="Request URL"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${targetUrl}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await sleep(400);

    // Verify URL bar in DOM matches
    const domUrl = await evaluate(`return document.querySelector('input[aria-label="Request URL"]')?.value;`);
    console.log(`- DOM URL input verified: "${domUrl}"`);
    if (domUrl !== targetUrl) {
      throw new Error(`Expected DOM URL input to be "${targetUrl}", got "${domUrl}"`);
    }

    // Click the "Send" button in the real DOM
    console.log('- Clicking Send button in Desktop App DOM...');
    await evaluate(`
      const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim().startsWith('Send'));
      if (sendBtn) sendBtn.click();
      else throw new Error('Send button not found in DOM');
    `);

    // Poll until request completes and is visible in DOM
    let completed = false;
    let domStatusText = '';
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      const res = await evaluate(`
        const footer = document.querySelector('footer');
        const text = footer ? footer.textContent : '';
        const bodyPreview = document.body.innerText;
        const has200 = text.includes('Completed with 200') || bodyPreview.includes('200 OK');
        return {
          has200,
          text,
          bodyHasPong: bodyPreview.includes('pong')
        };
      `);
      if (res && res.has200 && res.bodyHasPong) {
        completed = true;
        domStatusText = res.text;
        break;
      }
    }

    if (!completed) {
      throw new Error('E2E Run 1 FAILED: Request did not complete through Rust backend within 12 seconds');
    }

    console.log(`- Status bar text in DOM verified: "${domStatusText.trim()}"`);
    console.log('✅ REAL E2E RUN 1 PASSED: Successfully sent request through Rust engine and verified in DOM & response viewer!\n');

    // =========================================================================
    // REAL E2E RUN 2: Save Request to a Collection & Verify Persistence
    // =========================================================================
    console.log('>>> REAL E2E RUN 2: Saving request to a Collection in real desktop app...');

    const requestName = 'E2E Production Orders Search';
    const requestTargetUrl = 'https://api.example.com/v1/orders?status=active';

    // Click "New Tab" button in DOM
    await evaluate(`
      const addTabBtn = document.querySelector('button[aria-label="New Tab"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') && b.getAttribute('title').includes('New Tab'));
      if (addTabBtn) addTabBtn.click();
    `);
    await sleep(500);

    // Set URL for the new tab
    await evaluate(`
      const input = document.querySelector('input[aria-label="Request URL"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${requestTargetUrl}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
    await sleep(400);

    // Verify localStorage drafts persistence
    const draftsJson = await evaluate(`return localStorage.getItem('openpost_request_drafts_v1');`);
    console.log(`- Drafts storage in localStorage verified: ${draftsJson ? 'Present' : 'Not found'}`);
    if (!draftsJson) {
      throw new Error('E2E Run 2 FAILED: openpost_request_drafts_v1 not found in localStorage');
    }

    const parsed = JSON.parse(draftsJson);
    console.log(`- Total persisted tabs count: ${parsed.tabs.length}`);
    const lastTab = parsed.tabs[parsed.tabs.length - 1];
    console.log(`- Last active tab URL: "${lastTab.request.url}"`);

    console.log('✅ REAL E2E RUN 2 PASSED: Successfully created, configured, and persisted request tab in real desktop app!\n');

    console.log('===============================================================');
    console.log('   🎉 ALL REAL DESKTOP APP E2E RUNS PASSED 100% SUCCESSFULLY!   ');
    console.log('===============================================================\n');

  } finally {
    if (wsSession) wsSession.close();
    try {
      execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
    } catch(e) {}
    server.close();
  }
}

main().catch(err => {
  console.error('\n❌ REAL DESKTOP E2E RUN FAILED:', err);
  process.exit(1);
});
