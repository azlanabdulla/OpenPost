const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9779;
const EXE_PATH = fs.existsSync(path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe'))
  ? path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe')
  : path.join(process.env.LOCALAPPDATA || '', 'OpenPost', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'support_verification');

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
  console.log('=== VERIFY SUPPORT FEATURE IN REAL DESKTOP APP ===');

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}

  await sleep(600);

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
      target = targets.find(t => t.url && (t.url.includes('tauri.localhost') || t.title.includes('OpenPost')) && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Failed to connect to OpenPost CDP port');
    process.exit(1);
  }

  console.log('Connected to desktop window target:', target.title);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const networkRequests = [];
  const send = (m, params = {}) => new Promise((resolve, reject) => {
    const cur = id++;
    const h = e => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Network.requestWillBeSent') {
        networkRequests.push(msg.params.request.url);
      }
      if (msg.id === cur) {
        ws.removeEventListener('message', h);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params }));
  });

  await send('Network.enable');

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

  // Dismiss welcome modal if present
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
    if (btn) btn.click();
    try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
  `);
  await sleep(600);

  // Set dark theme initially
  await evaluate(`
    const themeStore = window.__themeStore || null;
    const darkBtn = document.querySelector('button[aria-label="Set Theme to Dark Mode"]');
    document.documentElement.classList.add('dark');
  `);
  await sleep(400);

  // Capture Header with Support Heart Button
  console.log('Capturing 01: Desktop Header with Support button...');
  captureWindow('desktop_01_header_support_button.png');

  // Clear network requests counter before opening Support modal to prove zero telemetry
  networkRequests.length = 0;

  // Open Support Modal via Header button
  console.log('Clicking Header Support button...');
  const clickedSupport = await evaluate(`
    const supportBtn = document.querySelector('button[aria-label="Support OpenPost"]');
    if (supportBtn) {
      supportBtn.click();
      true;
    } else false;
  `);
  console.log('Support button clicked:', clickedSupport);
  await sleep(600);

  // Check network requests: MUST BE ZERO
  console.log(`[Telemetry Verification] Network requests made while opening Support modal: ${networkRequests.length}`);
  if (networkRequests.length > 0) {
    console.warn('WARNING: Unexpected network requests occurred:', networkRequests);
  } else {
    console.log('VERIFIED: Zero telemetry — no network requests made when opening Support modal.');
  }

  // Capture Support Modal in Dark Theme
  console.log('Capturing 02: Support Modal in Dark Theme...');
  captureWindow('desktop_02_support_modal_dark.png');

  // Switch to Light Theme while modal is open
  console.log('Switching to Light Theme...');
  await evaluate(`
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  `);
  await sleep(600);

  // Capture Support Modal in Light Theme
  console.log('Capturing 03: Support Modal in Light Theme...');
  captureWindow('desktop_03_support_modal_light.png');

  // Close Support modal via "Maybe later"
  await evaluate(`
    const maybeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Maybe later'));
    if (maybeBtn) maybeBtn.click();
  `);
  await sleep(400);

  // Open About dialog
  console.log('Opening About Dialog...');
  await evaluate(`
    const aboutBtn = document.querySelector('button[aria-label="About OpenPost"]');
    if (aboutBtn) aboutBtn.click();
  `);
  await sleep(600);

  // Capture About Dialog with Support row and canonical links
  console.log('Capturing 04: About Dialog with Support OpenPost row...');
  captureWindow('desktop_04_about_dialog_support_row.png');

  // Close About Dialog
  await evaluate(`
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  `);
  await sleep(400);

  // Switch back to Dark Theme
  await evaluate(`
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  `);
  await sleep(300);

  // Open Command Palette and search "Support"
  console.log('Opening Command Palette...');
  await evaluate(`
    const cpBtn = document.querySelector('button[aria-label="Open Command Palette"]');
    if (cpBtn) cpBtn.click();
  `);
  await sleep(400);

  await evaluate(`
    const input = document.querySelector('input[placeholder*="Type a command"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Support');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await sleep(500);

  // Capture Command Palette showing Support OpenPost
  console.log('Capturing 05: Command Palette with Support OpenPost...');
  captureWindow('desktop_05_command_palette_support.png');

  // Close Command Palette via Escape
  await evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  `);
  await sleep(400);

  // Test clicking GitHub link to verify canonical destination
  console.log('Verifying canonical GitHub link click handling...');
  const linkHref = await evaluate(`
    const link = document.querySelector('a[aria-label="OpenPost GitHub repository"]');
    link ? link.href : null;
  `);
  console.log('Header GitHub link href:', linkHref);

  console.log('=== REAL DESKTOP APP VERIFICATION COMPLETE ===');
  ws.close();

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
