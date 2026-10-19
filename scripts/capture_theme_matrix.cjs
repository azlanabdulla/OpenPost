/**
 * Theme Matrix Screenshot Suite for OpenPost Desktop App
 *
 * Captures all 10 screens/modals in both Dark and Light themes:
 * 1. Main UI
 * 2. Settings Modal
 * 3. Export Modal
 * 4. Import Modal
 * 5. Support Modal
 * 6. About Modal
 * 7. History Panel
 * 8. Environments Panel
 * 9. Welcome Modal
 * 10. Crash Screen (ErrorBoundary with redacted secrets)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const PORT = 9787;
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'theme_matrix');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function captureWindow(filename) {
  const targetPath = path.join(OUT_DIR, filename);
  try {
    const cmd = `powershell -ExecutionPolicy Bypass -File scripts/window_snap.ps1 -Substring "OpenPost" -OutputPath "${targetPath}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    const stat = fs.statSync(targetPath);
    console.log(`[Capture] ${filename} (${stat.size} bytes)`);
    return targetPath;
  } catch (err) {
    console.error(`[Capture Error] ${filename}:`, err.message);
    return null;
  }
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
  console.log('================================================================');
  console.log('   CAPTURING DESKTOP THEME MATRIX (10 SCREENS x 2 THEMES)       ');
  console.log('================================================================\n');

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch(e) {}
  await sleep(600);

  console.log(`Launching ${EXE_PATH}...`);
  const app = spawn(EXE_PATH, [], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` }
  });
  app.unref();

  const { ws } = await connectToCDP(PORT);
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
      throw new Error(`CDP Exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  };

  // Wait for stores
  for (let i = 0; i < 30; i++) {
    const ok = await evaluate('return !!(window.__OPENPOST_STORES__ && window.__OPENPOST_STORES__.useThemeStore);');
    if (ok) break;
    await sleep(300);
  }

  // Populate some sample history entries so History panel looks authentic
  await evaluate(`
    const hist = window.__OPENPOST_STORES__.useHistoryStore;
    if (hist && (!hist.getState().entries || hist.getState().entries.length === 0)) {
      hist.setState({
        entries: [
          {
            id: 'h1',
            timestamp: Date.now() - 60000,
            method: 'GET',
            url: 'https://api.github.com/repos/azlanabdulla/OpenPost',
            headersJson: '{"accept":"application/json"}',
            responseStatus: 200,
            responseStatusText: 'OK',
            responseDurationMs: 142,
            responseSizeBytes: 4219,
            body: ''
          },
          {
            id: 'h2',
            timestamp: Date.now() - 360000,
            method: 'POST',
            url: 'https://api.company.internal/v1/oauth/token',
            headersJson: '{"content-type":"application/json"}',
            responseStatus: 201,
            responseStatusText: 'Created',
            responseDurationMs: 89,
            responseSizeBytes: 512,
            body: '{"grant_type":"client_credentials"}'
          },
          {
            id: 'h3',
            timestamp: Date.now() - 7200000,
            method: 'DELETE',
            url: 'https://jsonplaceholder.typicode.com/posts/42',
            headersJson: '{}',
            responseStatus: 204,
            responseStatusText: 'No Content',
            responseDurationMs: 310,
            responseSizeBytes: 0,
            body: ''
          }
        ]
      });
    }
  `);

  const themes = ['dark', 'light'];

  for (const theme of themes) {
    console.log(`\n=================== PROCESSING THEME: ${theme.toUpperCase()} ===================`);
    
    // Set theme
    await evaluate(`
      window.__OPENPOST_STORES__.useThemeStore.getState().setMode('${theme}');
    `);
    await sleep(500);

    // 1. Welcome Modal (first, if not dismissed, or show it)
    console.log(`Capturing 09_welcome_${theme}.png...`);
    // Ensure welcome is visible
    await evaluate(`
      localStorage.removeItem('openpost_welcome_dismissed_v1');
    `);
    // If not open in state, we can dismiss it or take it now
    // Let's check if welcome modal is open:
    let isWelcome = await evaluate(`return !!document.querySelector('button[aria-label="Close dialog"]');`);
    if (!isWelcome) {
      // reload or show welcome modal
      // We can also click through it
    }
    // Let's take welcome screenshot if open, or test
    // Dismiss welcome modal to proceed with other screens
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
      if (btn) btn.click();
      try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
    `);
    await sleep(500);

    // 1. Main UI
    console.log(`Capturing 01_main_${theme}.png...`);
    // Ensure collections sidebar tab is active
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Collections tab"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Collections'));
      if (btn) btn.click();
    `);
    await sleep(400);
    captureWindow(`01_main_${theme}.png`);

    // 2. Settings Modal
    console.log(`Capturing 02_settings_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Open application settings"]') || document.querySelector('button[aria-label="Settings"]');
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`02_settings_${theme}.png`);
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close dialog"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 3. Export Modal
    console.log(`Capturing 03_export_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Export requests"]');
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`03_export_${theme}.png`);
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close dialog"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 4. Import Modal
    console.log(`Capturing 04_import_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Import requests or cURL"]') || document.querySelector('button[aria-label="Import Requests"]');
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`04_import_${theme}.png`);
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close dialog"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 5. Support Modal
    console.log(`Capturing 05_support_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Support OpenPost"]');
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`05_support_${theme}.png`);
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close dialog"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 6. About Modal
    console.log(`Capturing 06_about_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="About OpenPost"]');
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`06_about_${theme}.png`);
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close dialog"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 7. History Panel
    console.log(`Capturing 07_history_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="History tab"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('History'));
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`07_history_${theme}.png`);

    // 8. Environments Panel
    console.log(`Capturing 08_environments_${theme}.png...`);
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Environments tab"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Environments'));
      if (btn) btn.click();
    `);
    await sleep(600);
    captureWindow(`08_environments_${theme}.png`);

    // Reset sidebar to collections
    await evaluate(`
      const btn = document.querySelector('button[aria-label="Collections tab"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Collections'));
      if (btn) btn.click();
    `);
    await sleep(400);

    // 9. Welcome Modal
    console.log(`Capturing 09_welcome_${theme}.png...`);
    await evaluate(`window.dispatchEvent(new CustomEvent('openpost-open-welcome'));`);
    await sleep(600);
    captureWindow(`09_welcome_${theme}.png`);
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
      if (btn) btn.click();
    `);
    await sleep(500);

    // 10. Crash Screen
    console.log(`Capturing 10_crash_${theme}.png...`);
    await evaluate(`if (window.__triggerTestCrash) window.__triggerTestCrash();`);
    await sleep(600);
    captureWindow(`10_crash_${theme}.png`);
    // Reload window to recover cleanly for next theme
    console.log('Reloading window to recover from crash screen...');
    await evaluate(`window.location.reload();`);
    await sleep(1500);

    // Dismiss welcome modal after reload
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
      if (btn) btn.click();
      try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
    `);
    await sleep(500);
  }

  ws.close();
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch(e) {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
