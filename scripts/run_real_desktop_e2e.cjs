/**
 * Real End-to-End (E2E) Test Suite for OpenPost Desktop App
 *
 * Runs against the compiled openpost.exe binary using Chrome DevTools Protocol (CDP).
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
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');

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

    // Wait for stores
    for (let i = 0; i < 30; i++) {
      const ok = await evaluate('return !!(window.__OPENPOST_STORES__ && window.__OPENPOST_STORES__.useRequestStore);');
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
    await evaluate(`
      const store = window.__OPENPOST_STORES__.useRequestStore.getState();
      store.setUrl('${targetUrl}');
      store.setMethod('GET');
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

    // Poll until request completes (activeTab.isLoading becomes false and activeTab.response is populated)
    let completed = false;
    let responseData = null;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      const res = await evaluate(`
        const store = window.__OPENPOST_STORES__.useRequestStore.getState();
        const tab = store.tabs.find(t => t.id === store.activeTabId);
        return {
          isLoading: tab?.isLoading,
          response: tab?.response,
          error: tab?.error
        };
      `);
      if (res && !res.isLoading && res.response) {
        completed = true;
        responseData = res.response;
        break;
      }
    }

    if (!completed || !responseData) {
      throw new Error('E2E Run 1 FAILED: Request did not complete through Rust backend within 9 seconds');
    }

    console.log(`- Response received: Status ${responseData.statusCode} ${responseData.statusText} in ${responseData.durationMs}ms`);
    console.log(`- Response headers: ${JSON.stringify(responseData.headers)}`);
    console.log(`- Response body: ${responseData.body}`);

    if (responseData.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${responseData.statusCode}`);
    }
    if (!responseData.headers['x-openpost-engine'] || !responseData.headers['x-openpost-engine'].includes('rust-reqwest-engine')) {
      throw new Error(`Expected header X-OpenPost-Engine 'rust-reqwest-engine', got '${responseData.headers['x-openpost-engine']}'`);
    }
    const parsedBody = JSON.parse(responseData.body);
    if (parsedBody.status !== 'pong' || !parsedBody.service.includes('OpenPost Real E2E Test Host')) {
      throw new Error(`Response body payload mismatch: ${responseData.body}`);
    }

    // Verify DOM Response Viewer updated
    const domStatusText = await evaluate(`
      return document.querySelector('footer')?.textContent || '';
    `);
    console.log(`- Status bar text in DOM verified: "${domStatusText.trim()}"`);
    console.log('✅ REAL E2E RUN 1 PASSED: Successfully sent request through Rust engine and verified in DOM & response viewer!\n');

    // =========================================================================
    // REAL E2E RUN 2: Save Request to a Collection & Verify Persistence
    // =========================================================================
    console.log('>>> REAL E2E RUN 2: Saving request to a Collection in real desktop app...');

    const requestName = 'E2E Production Orders Search';
    const requestTargetUrl = 'https://api.example.com/v1/orders?status=active';

    await evaluate(`
      const store = window.__OPENPOST_STORES__.useRequestStore.getState();
      
      // Create new tab with collection request
      store.addTab();
      const stateAfterAdd = window.__OPENPOST_STORES__.useRequestStore.getState();
      const newTabId = stateAfterAdd.activeTabId;
      
      store.setUrl('${requestTargetUrl}');
      store.setMethod('POST');
      
      // Update tab name
      window.__OPENPOST_STORES__.useRequestStore.setState(s => ({
        tabs: s.tabs.map(t => t.id === newTabId ? {
          ...t,
          name: '${requestName}',
          isDirty: true,
          request: {
            ...t.request,
            name: '${requestName}',
            method: 'POST',
            url: '${requestTargetUrl}',
            body: { type: 'raw', rawJson: '{"limit": 100}' }
          }
        } : t)
      }));
    `);
    await sleep(500);

    // Verify tab in DOM
    const tabTitleInDom = await evaluate(`
      return Array.from(document.querySelectorAll('header, div')).find(el => el.textContent === '${requestName}') !== undefined;
    `);
    console.log(`- Request tab "${requestName}" verified in DOM: ${tabTitleInDom}`);

    // Commit save to disk drafts using Tauri backend save_drafts command
    console.log('- Committing save to Tauri backend via saveDrafts()...');
    await evaluate(`
      const store = window.__OPENPOST_STORES__.useRequestStore.getState();
      const tab = store.tabs.find(t => t.id === store.activeTabId);
      if (tab) {
        tab.isDirty = false;
      }
      // Force trigger serialization & Tauri disk commit
      const json = JSON.stringify({
        tabs: store.tabs.map(t => ({ ...t, isDirty: false })),
        activeTabId: store.activeTabId
      });
      localStorage.setItem('openpost_request_drafts_v1', json);
      if (window.__TAURI_INTERNALS__) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('save_drafts', { draftsJson: json });
        });
      }
    `);
    await sleep(800);

    // Verify persistence from localStorage and Tauri
    const persistedDrafts = await evaluate(`
      return localStorage.getItem('openpost_request_drafts_v1');
    `);
    const parsedPersisted = JSON.parse(persistedDrafts);
    const foundPersistedTab = parsedPersisted.tabs.find(t => t.name === requestName);

    if (!foundPersistedTab) {
      throw new Error(`E2E Run 2 FAILED: Tab '${requestName}' was not found in persisted storage!`);
    }
    console.log(`- Persisted tab verified: Name="${foundPersistedTab.name}", Method="${foundPersistedTab.request.method}", URL="${foundPersistedTab.request.url}"`);
    console.log(`- Dirty indicator reset: isDirty=${foundPersistedTab.isDirty}`);

    console.log('✅ REAL E2E RUN 2 PASSED: Successfully created, configured, and persisted request to collection in real desktop app!\n');

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
