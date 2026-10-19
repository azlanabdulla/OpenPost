const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9781;
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots', 'phase1_verification');

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

async function main() {
  console.log('=== VERIFYING CRASH SCREEN IN REAL DESKTOP APP ===');

  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}

  await sleep(600);

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
    console.error('Could not connect to OpenPost desktop target');
    process.exit(1);
  }

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

  // Dismiss welcome
  await evaluate(`
    try { localStorage.setItem('openpost_welcome_dismissed_v1', 'true'); } catch(e){}
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Get Started'));
    if (btn) btn.click();
  `);
  await sleep(400);

  // Trigger an intentional render error inside React to test ErrorBoundary
  console.log('Triggering intentional ErrorBoundary catch via window.__triggerTestCrash()...');
  await evaluate(`
    if (typeof window.__triggerTestCrash === 'function') {
      window.__triggerTestCrash();
    }
  `);
  await sleep(600);

  // Verify the crash screen is rendered in the DOM
  const crashRendered = await evaluate(`
    (() => {
      const body = document.body.innerText;
      return body.includes('SYS-CRASH-001') || body.includes('Application Encountered an Error');
    })()
  `);
  console.log('ErrorBoundary crash screen rendered:', crashRendered);

  // Inspect the Report on GitHub link
  const linkDetails = await evaluate(`
    (() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent && a.textContent.includes('Report on GitHub'));
      if (!link) return { found: false };
      return {
        found: true,
        href: link.getAttribute('href'),
        text: link.textContent.trim()
      };
    })()
  `);
  console.log('Report on GitHub link found:', linkDetails.found);
  if (linkDetails.found) {
    console.log(`- href: ${linkDetails.href.slice(0, 80)}...`);
    const decodedHref = decodeURIComponent(linkDetails.href);
    console.log(`- Contains username AZLAN: ${decodedHref.includes('AZLAN')} (must be false)`);
    console.log(`- Contains secret token: ${decodedHref.includes('eyJhbGciOiJIUzI1NiJ9')} (must be false)`);
    console.log(`- Contains Bearer [REDACTED]: ${decodedHref.includes('Bearer [REDACTED]')} (must be true)`);

    if (decodedHref.includes('AZLAN') || decodedHref.includes('eyJhbGciOiJIUzI1NiJ9') || !decodedHref.includes('Bearer [REDACTED]')) {
      throw new Error('Pre-filled crash report contains leaked user paths or unredacted secrets!');
    }
  }

  // Click the "Report on GitHub" button to test the opener
  console.log('Clicking "Report on GitHub" button in real desktop app...');
  await evaluate(`
    (() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent && a.textContent.includes('Report on GitHub'));
      if (link) link.click();
    })()
  `);
  await sleep(600);

  captureWindow('desktop_p1_10_crash_screen.png');
  console.log('=== CRASH SCREEN VERIFICATION COMPLETE ===');
  ws.close();
}

main().catch((err) => {
  console.error('Crash screen verification failed:', err);
  process.exit(1);
});
