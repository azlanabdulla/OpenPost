const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9777;
const EXE_PATH = fs.existsSync(path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe'))
  ? path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe')
  : path.join(process.env.LOCALAPPDATA || '', 'OpenPost', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'desktop_verified');

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
    console.log(`[Window Capture] ${filename}: size=${stat.size} bytes (${out.trim()})`);
  } catch (err) {
    console.warn(`[Window Capture Error] ${filename}:`, err.message);
  }
}

async function main() {
  console.log('=== REAL DESKTOP APP VERIFICATION SUITE ===');

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}

  await sleep(600);

  console.log(`Starting ${EXE_PATH} with debugging port ${PORT}...`);
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
  for (let i = 0; i < 35; i++) {
    await sleep(400);
    try {
      const targets = await new Promise((res, rej) => {
        http.get(`http://127.0.0.1:${PORT}/json`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
        }).on('error', rej);
      });
      target = targets.find(t => t.url && (t.url.includes('tauri.localhost') || t.title.includes('OpenPost')) && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Could not connect to OpenPost tauri.localhost target');
    process.exit(1);
  }

  console.log('Connected to target:', target.title, `(${target.url})`);
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
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  // Set up helper functions in the desktop app
  await evaluate(`
    window.__desktopHelper = {
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
      clickDisableSslAndRetry() {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Disable SSL'));
        if (!btn) throw new Error('Disable SSL button not found');
        btn.click();
      },
      enableSslVerification() {
        const settingsTab = Array.from(document.querySelectorAll('button')).find(t => t.textContent && t.textContent.trim() === 'Settings');
        if (settingsTab) settingsTab.click();
      }
    };
  `);

  // Step 0: Dismiss Welcome modal
  console.log('\n--- Step 0: Dismiss Welcome Modal ---');
  await evaluate(`window.__desktopHelper.dismissWelcome()`);
  await sleep(600);

  // Test 1: https://self-signed.badssl.com/
  console.log('\n--- Test 1: https://self-signed.badssl.com/ ---');
  await evaluate(`window.__desktopHelper.setUrl('https://self-signed.badssl.com/')`);
  await sleep(300);
  await evaluate(`window.__desktopHelper.clickSend()`);

  // Wait for Rust reqwest to fail SSL handshake
  let sslErrorFound = false;
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('OP-SSL-001') || text.includes('Disable SSL Verification')) {
      sslErrorFound = true;
      break;
    }
  }
  console.log(`Structured SSL error OP-SSL-001 present: ${sslErrorFound}`);
  await sleep(400);
  captureWindow('desktop_01_self_signed_error.png');

  // Test 1b: Disable SSL Verification & Retry
  console.log('\n--- Test 1b: Click Disable SSL Verification & Retry ---');
  await evaluate(`window.__desktopHelper.clickDisableSslAndRetry()`);
  
  let retrySuccess = false;
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('200 OK') || (text.includes('200') && text.includes('badssl.com'))) {
      retrySuccess = true;
      break;
    }
  }
  console.log(`Retry succeeded with 200 OK: ${retrySuccess}`);
  await sleep(500);
  captureWindow('desktop_02_self_signed_retry_success.png');

  // Test 2: https://expired.badssl.com/
  console.log('\n--- Test 2: https://expired.badssl.com/ ---');
  // Re-enable SSL verification via settings checkbox or state
  await evaluate(`
    (() => {
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        const key = Object.keys(checkbox).find(k => k.startsWith('__reactProps'));
        if (checkbox[key] && checkbox[key].onChange) checkbox[key].onChange({ target: { checked: true } });
        else checkbox.click();
      }
    })()
  `);
  await evaluate(`window.__desktopHelper.setUrl('https://expired.badssl.com/')`);
  await sleep(300);
  await evaluate(`window.__desktopHelper.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('OP-SSL') || text.includes('Certificate Verification Failed')) break;
  }
  await sleep(400);
  captureWindow('desktop_03_expired_badssl_error.png');

  // Test 3: https://wrong.host.badssl.com/
  console.log('\n--- Test 3: https://wrong.host.badssl.com/ ---');
  await evaluate(`window.__desktopHelper.setUrl('https://wrong.host.badssl.com/')`);
  await sleep(300);
  await evaluate(`window.__desktopHelper.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('OP-SSL') || text.includes('Certificate Verification Failed')) break;
  }
  await sleep(400);
  captureWindow('desktop_04_wrong_host_badssl_error.png');

  // Test 4: Refused connection: http://127.0.0.1:1
  console.log('\n--- Test 4: Refused Connection http://127.0.0.1:1 ---');
  await evaluate(`window.__desktopHelper.setUrl('http://127.0.0.1:1')`);
  await sleep(300);
  await evaluate(`window.__desktopHelper.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('OP-NET-002') || text.includes('Connection Refused') || text.includes('Failed to connect')) break;
  }
  await sleep(400);
  captureWindow('desktop_05_connection_refused_error.png');

  // Test 5: DNS Failure: https://nonexistent-dns-test-fail-1234.xyz/
  console.log('\n--- Test 5: DNS Failure https://nonexistent-dns-test-fail-1234.xyz/ ---');
  await evaluate(`window.__desktopHelper.setUrl('https://nonexistent-dns-test-fail-1234.xyz/')`);
  await sleep(300);
  await evaluate(`window.__desktopHelper.clickSend()`);

  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const text = await evaluate(`document.body.innerText`);
    if (text.includes('OP-NET-001') || text.includes('Could not resolve') || text.includes('DNS') || text.includes('failed')) break;
  }
  await sleep(400);
  captureWindow('desktop_06_dns_failure_error.png');

  // Test 6: Timeout input
  console.log('\n--- Test 6: Per-Request Timeout Input ---');
  await evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const settingsTab = tabs.find(t => t.textContent && t.textContent.trim() === 'Settings');
      if (settingsTab) settingsTab.click();
    })()
  `);
  await sleep(400);
  await evaluate(`
    (() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const timeoutInput = inputs.find(i => i.placeholder && i.placeholder.includes('30000') || i.id === 'req-timeout');
      if (timeoutInput) {
        const key = Object.keys(timeoutInput).find(k => k.startsWith('__reactProps'));
        if (timeoutInput[key] && timeoutInput[key].onChange) {
          timeoutInput[key].onChange({ target: { value: '5000' } });
        }
      }
    })()
  `);
  await sleep(400);
  captureWindow('desktop_07_timeout_input.png');

  // Test 7: Import cURL typing
  console.log('\n--- Test 7: Import cURL Typing ---');
  await evaluate(`
    (() => {
      const importBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Import'));
      if (importBtn) importBtn.click();
    })()
  `);
  await sleep(500);
  await evaluate(`
    (() => {
      const curlTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('cURL'));
      if (curlTab) curlTab.click();
    })()
  `);
  await sleep(300);
  await evaluate(`
    (() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.focus();
        const key = Object.keys(ta).find(k => k.startsWith('__reactProps'));
        const val = "curl -X POST https://api.example.com/v1/orders -H 'Authorization: Bearer secret_token_xyz' -d '{\\"status\\":\\"active\\"}'";
        if (ta[key] && ta[key].onChange) {
          ta[key].onChange({ target: { value: val } });
        } else {
          ta.value = val;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    })()
  `);
  await sleep(400);
  captureWindow('desktop_08_import_curl_typing.png');

  // Close import modal
  await evaluate(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(400);

  // Test 8: Light theme main screen
  console.log('\n--- Test 8: Light Theme Main Screen ---');
  await evaluate(`
    (() => {
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Theme'));
      if (themeBtn) themeBtn.click();
    })()
  `);
  await sleep(600);
  captureWindow('desktop_09_light_theme_main.png');

  // Test 9: Light theme settings dialog
  console.log('\n--- Test 9: Light Theme Settings Dialog ---');
  await evaluate(`
    (() => {
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Settings') || b.textContent && b.textContent.includes('Settings'));
      // Find the header settings button
      const headerSettings = document.querySelector('header button[aria-label*="Settings"]') || Array.from(document.querySelectorAll('header button')).find(b => b.innerHTML.includes('Settings') || b.title.includes('Settings'));
      if (headerSettings) headerSettings.click();
    })()
  `);
  await sleep(500);
  captureWindow('desktop_10_settings_dialog_light.png');

  // Close settings dialog
  await evaluate(`
    (() => {
      const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Done' || b.textContent === 'Close');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(400);

  // Test 10: Light theme export dialog
  console.log('\n--- Test 10: Light Theme Export Dialog ---');
  await evaluate(`
    (() => {
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Export'));
      if (exportBtn) exportBtn.click();
    })()
  `);
  await sleep(500);
  captureWindow('desktop_11_export_dialog_light.png');

  // Close export dialog
  await evaluate(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(400);

  // Test 11: History panel
  console.log('\n--- Test 11: History Panel ---');
  await evaluate(`
    (() => {
      const histTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('History'));
      if (histTab) histTab.click();
    })()
  `);
  await sleep(500);
  captureWindow('desktop_12_history_panel.png');

  console.log('\n=== REAL DESKTOP APP VERIFICATION COMPLETED ===');
  ws.close();
}

main().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
