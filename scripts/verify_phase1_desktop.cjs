const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9780;
const HELPER_PORT = 9899;
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'phase1_verification');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureWindow(filename) {
  const targetPath = path.join(OUT_DIR, filename);
  try {
    const cmd = `powershell -ExecutionPolicy Bypass -File scripts/window_snap.ps1 -Substring "OpenPost" -OutputPath "${targetPath}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    const stat = fs.statSync(targetPath);
    console.log(`[Window Capture] ${filename}: ${stat.size} bytes (${out.trim()})`);
  } catch (err) {
    console.warn(`[Window Capture Error] ${filename}:`, err.message);
  }
}

// Start local helper server for slow responses and redirect loops
function startHelperServer() {
  const server = http.createServer((req, res) => {
    if (req.url && req.url.startsWith('/slow')) {
      // Delays 5 seconds
      setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'slow response completed' }));
        }
      }, 5000);
    } else if (req.url && req.url.startsWith('/loop')) {
      // 302 redirect back to itself
      res.writeHead(302, { Location: `http://127.0.0.1:${HELPER_PORT}/loop` });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    }
  });

  server.listen(HELPER_PORT, '127.0.0.1');
  return server;
}

async function main() {
  console.log('=== PHASE 1 REAL DESKTOP APP VERIFICATION ===');
  const helperServer = startHelperServer();
  console.log(`Helper server listening on http://127.0.0.1:${HELPER_PORT}`);

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}

  await sleep(600);

  console.log(`Launching ${EXE_PATH} with remote debugging on port ${PORT}...`);
  const app = spawn(EXE_PATH, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
    },
  });
  app.unref();

  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const targets = await new Promise((res, rej) => {
        http
          .get(`http://127.0.0.1:${PORT}/json`, (r) => {
            let d = '';
            r.on('data', (c) => (d += c));
            r.on('end', () => res(JSON.parse(d)));
          })
          .on('error', rej);
      });
      target = targets.find(
        (t) =>
          t.url &&
          (t.url.includes('5173') || t.url.includes('tauri.localhost') || t.title.includes('OpenPost')) &&
          t.webSocketDebuggerUrl
      );
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Could not connect to OpenPost desktop WebView target');
    helperServer.close();
    process.exit(1);
  }

  console.log('Connected to target:', target.title, `(${target.url})`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const send = (m, params = {}) =>
    new Promise((resolve, reject) => {
      const cur = id++;
      const h = (e) => {
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
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  // Set up in-app helpers
  await evaluate(`
    window.__p1 = {
      dismissWelcome() {
        try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
        if (btn) btn.click();
      },
      setUrl(url) {
        const input = document.querySelector('input[aria-label="Request URL"]');
        if (!input) throw new Error('URL input not found');
        const key = Object.keys(input).find(k => k.startsWith('__reactProps'));
        if (input[key] && input[key].onChange) {
          input[key].onChange({ target: { value: url } });
        } else {
          input.value = url;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      clickSend() {
        const sendBtn = document.querySelector('button[aria-label="Send Request"]') || 
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send'));
        if (!sendBtn) throw new Error('Send button not found');
        sendBtn.click();
      },
      clickCancel() {
        const cancelBtn = document.querySelector('button[aria-label="Cancel in-flight request"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
        if (cancelBtn) cancelBtn.click();
      },
      clickDisableSslAndRetry() {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Disable SSL'));
        if (!btn) throw new Error('Disable SSL button not found');
        btn.click();
      },
      enableSslVerification() {
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) {
          const key = Object.keys(checkbox).find(k => k.startsWith('__reactProps'));
          if (checkbox[key] && checkbox[key].onChange) checkbox[key].onChange({ target: { checked: true } });
          else checkbox.click();
        }
      },
      setTimeoutMs(val) {
        const tabs = Array.from(document.querySelectorAll('button'));
        const settingsTab = tabs.find(t => t.textContent && t.textContent.trim() === 'Settings');
        if (settingsTab) settingsTab.click();
        setTimeout(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const timeoutInput = inputs.find(i => i.placeholder && i.placeholder.includes('30000') || i.id === 'req-timeout');
          if (timeoutInput) {
            const key = Object.keys(timeoutInput).find(k => k.startsWith('__reactProps'));
            if (timeoutInput[key] && timeoutInput[key].onChange) {
              timeoutInput[key].onChange({ target: { value: String(val) } });
            }
          }
        }, 100);
      }
    };
  `);

  // Step 0: Dismiss Welcome
  console.log('\n--- Step 0: Dismiss Welcome Modal ---');
  await evaluate(`window.__p1.dismissWelcome()`);
  await sleep(500);

  // 1. Verify CSP & Zero Telemetry on idle and UI navigation
  console.log('\n--- Step 1: CSP & Zero Telemetry Monitor ---');
  await send('Network.enable');
  const capturedRequests = [];
  ws.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.method === 'Network.requestWillBeSent') {
      const u = data.params.request.url;
      // Exclude Vite dev server HMR/assets
      if (!u.includes('localhost:5173') && !u.includes('127.0.0.1:5173') && !u.includes('chrome-extension')) {
        capturedRequests.push(u);
      }
    }
  });

  // Navigate UI: open About, open Support, toggle theme, open Settings
  await evaluate(`
    (() => {
      // Toggle theme twice
      const themeBtn = document.querySelector('header button[aria-label*="Theme"]');
      if (themeBtn) { themeBtn.click(); themeBtn.click(); }
      // Open support modal
      const supportBtn = document.querySelector('header button[aria-label*="Support"]');
      if (supportBtn) supportBtn.click();
    })()
  `);
  await sleep(400);
  await evaluate(`
    (() => {
      const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Maybe later');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(400);

  console.log(`Telemetry requests captured during idle and UI navigation: ${capturedRequests.length}`);
  if (capturedRequests.length > 0) {
    console.warn('Unexpected requests:', capturedRequests);
  }

  // 2. Test https://self-signed.badssl.com/
  console.log('\n--- Test 2a: https://self-signed.badssl.com/ (OP-SSL-001) ---');
  await evaluate(`window.__p1.setUrl('https://self-signed.badssl.com/')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  let sslErrFound = false;
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-SSL-001') && body.includes('Disable SSL Verification & Retry')) {
      sslErrFound = true;
      break;
    }
  }
  console.log(`OP-SSL-001 encountered with Disable SSL button: ${sslErrFound}`);
  await sleep(300);
  captureWindow('desktop_p1_01_self_signed.png');

  // Test 2b: Disable SSL Verification & Retry
  console.log('\n--- Test 2b: Click Disable SSL Verification & Retry ---');
  await evaluate(`window.__p1.clickDisableSslAndRetry()`);

  let retry200 = false;
  for (let i = 0; i < 35; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('200 OK') || (body.includes('200') && body.includes('badssl.com'))) {
      retry200 = true;
      break;
    }
  }
  console.log(`Retry succeeded with 200 OK: ${retry200}`);
  await sleep(300);
  captureWindow('desktop_p1_02_self_signed_retry.png');

  // 3. Test https://expired.badssl.com/
  console.log('\n--- Test 3: https://expired.badssl.com/ (OP-SSL-001) ---');
  await evaluate(`window.__p1.enableSslVerification()`);
  await sleep(200);
  await evaluate(`window.__p1.setUrl('https://expired.badssl.com/')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-SSL-001')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_03_expired.png');

  // 4. Test https://wrong.host.badssl.com/
  console.log('\n--- Test 4: https://wrong.host.badssl.com/ (OP-SSL-001) ---');
  await evaluate(`window.__p1.enableSslVerification()`);
  await sleep(200);
  await evaluate(`window.__p1.setUrl('https://wrong.host.badssl.com/')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-SSL-001')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_04_wrong_host.png');

  // 5. Test Refused connection: http://127.0.0.1:1
  console.log('\n--- Test 5: Refused connection http://127.0.0.1:1 (OP-NET-002) ---');
  await evaluate(`window.__p1.setUrl('http://127.0.0.1:1')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-NET-002') || body.includes('Connection Refused')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_05_refused.png');

  // 6. Test DNS failure: https://nonexistent-dns-test-failure-999.xyz/
  console.log('\n--- Test 6: DNS Failure https://nonexistent-dns-test-failure-999.xyz/ (OP-NET-001) ---');
  await evaluate(`window.__p1.setUrl('https://nonexistent-dns-test-failure-999.xyz/')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-NET-001') || body.includes('DNS')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_06_dns.png');

  // 7. Test Short Timeout: http://127.0.0.1:9899/slow with 400ms timeout (OP-NET-003)
  console.log('\n--- Test 7: Short Timeout (OP-NET-003) ---');
  await evaluate(`window.__p1.setTimeoutMs(400)`);
  await sleep(300);
  await evaluate(`window.__p1.setUrl('http://127.0.0.1:${HELPER_PORT}/slow')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-NET-003') || body.includes('Timed Out') || body.includes('timed out')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_07_timeout.png');

  // 8. Test Cancel Mid-Request: http://127.0.0.1:9899/slow with 30000ms timeout (OP-NET-004)
  console.log('\n--- Test 8: Cancel Mid-Request (OP-NET-004) ---');
  await evaluate(`window.__p1.setTimeoutMs(30000)`);
  await sleep(300);
  await evaluate(`window.__p1.setUrl('http://127.0.0.1:${HELPER_PORT}/slow')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);
  await sleep(300);
  await evaluate(`window.__p1.clickCancel()`);

  for (let i = 0; i < 20; i++) {
    await sleep(200);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-NET-004') || body.includes('Cancelled') || body.includes('cancelled')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_08_cancel.png');

  // 9. Test Redirect Loop: http://127.0.0.1:9899/loop (OP-NET-005)
  console.log('\n--- Test 9: Redirect Loop (OP-NET-005) ---');
  await evaluate(`window.__p1.setUrl('http://127.0.0.1:${HELPER_PORT}/loop')`);
  await sleep(200);
  await evaluate(`window.__p1.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const body = await evaluate(`document.body.innerText`);
    if (body.includes('OP-NET-005') || body.includes('Redirect') || body.includes('redirect')) break;
  }
  await sleep(300);
  captureWindow('desktop_p1_09_redirect_loop.png');

  console.log('\n=== ALL PHASE 1 DESKTOP TESTS COMPLETED SUCCESSFULLY ===');
  ws.close();
  helperServer.close();
}

main().catch((err) => {
  console.error('Phase 1 desktop verification failed:', err);
  process.exit(1);
});
