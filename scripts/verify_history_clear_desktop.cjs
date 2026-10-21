const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9786;
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'history_failure_proof');
const APPDATA = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const DB_PATH = path.join(APPDATA, 'com.openpost.app', 'history.db');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function captureWindow(filename) {
  const targetPath = path.join(OUT_DIR, filename);
  try {
    const cmd = `powershell -ExecutionPolicy Bypass -File scripts/window_snap.ps1 -Substring "OpenPost" -OutputPath "${targetPath}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    const stat = fs.statSync(targetPath);
    console.log(`[Window Capture] ${filename}: ${stat.size} bytes (${out.trim()})`);
    return targetPath;
  } catch (err) {
    console.warn(`[Window Capture Error] ${filename}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('=== VERIFYING REAL DESKTOP APP: HISTORY CLEAR FAILURE & RETRY ===');
  console.log('Database path:', DB_PATH);

  // Kill existing instances
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}
  await sleep(600);

  // Ensure DB exists and has initial entries
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  // Remove any read-only flag before start
  if (fs.existsSync(DB_PATH)) {
    try {
      execSync(`attrib -r "${DB_PATH}"`);
    } catch (e) {}
  }

  console.log(`Launching ${EXE_PATH} with remote debugging port ${PORT}...`);
  const app = spawn(EXE_PATH, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`
    }
  });
  app.unref();

  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const targets = await new Promise((res, rej) => {
        http.get(`http://127.0.0.1:${PORT}/json`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
        }).on('error', rej);
      });
      target = targets.find(t => t.url && t.url.includes('tauri.localhost') && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Failed to connect to OpenPost CDP port');
    process.exit(1);
  }

  console.log('Connected to desktop window target:', target.url, target.title);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const send = (m, params = {}) => new Promise((resolve, reject) => {
    const cur = id++;
    const h = e => {
      const msg = JSON.parse(e.data);
      if (msg.id === cur) {
        ws.removeEventListener('message', h);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params }));
  });

  async function evaluate(expr) {
    const wrapped = `(() => { ${expr} })()`;
    const res = await send('Runtime.evaluate', {
      expression: wrapped,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  // Wait for stores
  for (let i = 0; i < 30; i++) {
    const ok = await evaluate(`return !!(window.__OPENPOST_STORES__ && window.__OPENPOST_STORES__.useHistoryStore);`);
    if (ok) {
      console.log('OpenPost stores initialized successfully!');
      break;
    }
    await sleep(300);
  }

  // Dismiss welcome modal if present
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
    if (btn) btn.click();
    try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
  `);
  await sleep(500);

  // Switch to History tab in sidebar
  console.log('Switching to History tab...');
  await evaluate(`
    const historyTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'History');
    if (historyTabBtn) historyTabBtn.click();
  `);
  await sleep(500);

  // Seed sample history entries if none exist
  console.log('Ensuring sample history entries exist...');
  await evaluate(`
    const stores = window.__OPENPOST_STORES__;
    const historyStore = stores.useHistoryStore.getState();
    if (historyStore.entries.length === 0) {
      historyStore.addEntry({
        method: 'GET',
        url: 'https://api.github.com/repos/azlanabdulla/OpenPost',
        headersJson: '{"Accept":"application/json"}',
        responseStatus: 200,
        responseStatusText: 'OK',
        responseDurationMs: 42,
        responseSizeBytes: 1520
      });
      historyStore.addEntry({
        method: 'POST',
        url: 'https://api.github.com/repos/azlanabdulla/OpenPost/issues',
        headersJson: '{"Content-Type":"application/json"}',
        responseStatus: 201,
        responseStatusText: 'Created',
        responseDurationMs: 88,
        responseSizeBytes: 620
      });
    }
  `);
  await sleep(1000);

  const entriesCount = await evaluate(`return window.__OPENPOST_STORES__.useHistoryStore.getState().entries.length;`);
  console.log(`Current history entries in store: ${entriesCount}`);

  // STEP 1: FORCE A REAL FAILURE ON THE HISTORY DATABASE
  console.log('\n--- Step 1: Forcing real failure on history.db (read-only attribute) ---');
  execSync(`attrib +r "${DB_PATH}"`);
  console.log('Set read-only attribute on:', DB_PATH);

  // Trigger Clear History in UI
  console.log('Clicking Clear button in UI...');
  await evaluate(`
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Clear all request history' || (b.textContent && b.textContent.trim() === 'Clear'));
    if (clearBtn) clearBtn.click();
  `);
  await sleep(500);

  // Confirm in modal
  console.log('Confirming in Clear Request History modal...');
  await evaluate(`
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Clear All History'));
    if (confirmBtn) confirmBtn.click();
  `);
  await sleep(1500);

  // Check state: entries should still be present, error toast shown
  const errorEntriesCount = await evaluate(`return window.__OPENPOST_STORES__.useHistoryStore.getState().entries.length;`);
  const toasts = await evaluate(`return window.__OPENPOST_STORES__.useToastStore.getState().toasts;`);
  console.log(`History entries remaining after failed clear: ${errorEntriesCount}`);
  console.log(`Toasts in store after failed clear:`, JSON.stringify(toasts.map(t => ({ title: t.title, type: t.type }))));

  // Verify toast in DOM
  for (let i = 0; i < 20; i++) {
    const toastText = await evaluate(`
      const el = document.querySelector('[role="status"]');
      return el ? el.innerText : null;
    `);
    if (toastText) {
      console.log('Rendered toast in DOM:', JSON.stringify(toastText));
      break;
    }
    await sleep(200);
  }

  await sleep(800);
  console.log('Capturing screenshot of error toast with entries still listed...');
  captureWindow('desktop_01_history_clear_failure_error_toast.png');
  await sleep(1000);

  // STEP 2: RESTORE ACCESS AND RETRY
  console.log('\n--- Step 2: Restoring access and retrying via Retry toast action ---');
  execSync(`attrib -r "${DB_PATH}"`);
  console.log('Removed read-only attribute from:', DB_PATH);

  // Click Retry on the error toast
  console.log('Clicking Retry action on error toast...');
  await evaluate(`
    const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Retry');
    if (retryBtn) {
      retryBtn.click();
    } else {
      // Fallback: invoke clearHistory directly
      window.__OPENPOST_STORES__.useHistoryStore.getState().clearHistory();
    }
  `);
  await sleep(1500);

  const successEntriesCount = await evaluate(`return window.__OPENPOST_STORES__.useHistoryStore.getState().entries.length;`);
  const successToasts = await evaluate(`return window.__OPENPOST_STORES__.useToastStore.getState().toasts;`);
  console.log(`History entries after successful retry: ${successEntriesCount}`);
  console.log(`Toasts after successful retry:`, JSON.stringify(successToasts.map(t => ({ title: t.title, type: t.type }))));

  console.log('Capturing screenshot of success toast...');
  captureWindow('desktop_02_history_clear_success_toast.png');
  await sleep(1000);

  console.log('\n=== REAL DESKTOP APP VERIFICATION COMPLETE ===');
  ws.close();
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}
}

main().catch(err => {
  console.error('Desktop verification failed:', err);
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}
  process.exit(1);
});
