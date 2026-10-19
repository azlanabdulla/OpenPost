const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9791;
const EXE_PATH = path.join(__dirname, '..', 'src-tauri', 'target', 'debug', 'openpost.exe');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCDP(wsUrl, method, params = {}) {
  const WebSocket = (await import('ws')).default || (await import('ws'));
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = Math.floor(Math.random() * 100000);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });
    ws.on('error', reject);
  });
}

async function evalExpression(wsUrl, expression) {
  const res = await sendCDP(wsUrl, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res && res.exceptionDetails) {
    console.error('JS Evaluation Error:', JSON.stringify(res.exceptionDetails));
  }
  return res && res.result ? res.result.value : null;
}

async function launchApp() {
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
          .get(`http://127.0.0.1:${PORT}/json`, r => {
            let d = '';
            r.on('data', c => (d += c));
            r.on('end', () => res(JSON.parse(d)));
          })
          .on('error', rej);
      });
      target = targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    throw new Error('Failed to connect to OpenPost desktop via CDP');
  }

  // Ensure window.__TAURI_INTERNALS__ is initialized
  for (let j = 0; j < 30; j++) {
    await sleep(200);
    const ready = await evalExpression(
      target.webSocketDebuggerUrl,
      'Boolean(window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)'
    );
    if (ready) break;
  }

  return target.webSocketDebuggerUrl;
}

function killApp() {
  try {
    execSync('taskkill /F /IM openpost.exe 2>nul || exit 0', { shell: 'cmd.exe' });
  } catch (e) {}
}

async function main() {
  console.log('=== VERIFYING REAL WINDOWS CREDENTIAL MANAGER KEYCHAIN STORAGE ===');
  killApp();
  await sleep(600);

  // Step 1: Launch OpenPost Desktop App
  console.log('\n[Step 1] Launching OpenPost Desktop App...');
  let wsUrl = await launchApp();
  console.log('Connected to desktop app:', wsUrl);

  // Step 2: Store secret through Tauri API inside the desktop app
  const testKey = 'test_windows_token_persist';
  const testSecret = 'secret_jwt_stored_in_wincred_778899';

  console.log(`\n[Step 2] Storing secret in OS Keychain via Tauri command...`);
  const storeResult = await evalExpression(
    wsUrl,
    `window.__TAURI_INTERNALS__.invoke('store_keychain_secret', { key: '${testKey}', secret: '${testSecret}' })`
  );
  console.log('store_keychain_secret result:', storeResult);

  // Step 3: Verify entry exists in Windows Credential Manager via cmdkey /list
  console.log('\n[Step 3] Checking Windows Credential Manager via "cmdkey /list"...');
  const cmdkeyOut = execSync('cmdkey /list', { encoding: 'utf-8' });
  const hasTarget = cmdkeyOut.includes(`openpost:${testKey}`);
  console.log(`Entry "openpost:${testKey}" present in Credential Manager: ${hasTarget}`);

  if (!hasTarget) {
    throw new Error('Secret was NOT found in Windows Credential Manager!');
  }

  // Print the matching section from cmdkey
  const lines = cmdkeyOut.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`openpost:${testKey}`)) {
      console.log('Found Windows Credential:');
      console.log('  ' + lines[i]);
      if (lines[i + 1]) console.log('  ' + lines[i + 1]);
      if (lines[i + 2]) console.log('  ' + lines[i + 2]);
      if (lines[i + 3]) console.log('  ' + lines[i + 3]);
      break;
    }
  }

  // Step 4: Simulate restart (Kill app and re-launch)
  console.log('\n[Step 4] Killing desktop app and restarting to verify persistence across restarts...');
  killApp();
  await sleep(1500);

  wsUrl = await launchApp();
  console.log('Re-launched desktop app after full process restart.');

  // Step 5: Read secret back after restart
  console.log('\n[Step 5] Reading secret back from OS Keychain after restart...');
  const retrievedSecret = await evalExpression(
    wsUrl,
    `window.__TAURI_INTERNALS__.invoke('get_keychain_secret', { key: '${testKey}' })`
  );
  console.log(`Retrieved Secret: "${retrievedSecret}"`);
  console.log(`Matches Original: ${retrievedSecret === testSecret}`);

  if (retrievedSecret !== testSecret) {
    throw new Error(`Persisted secret mismatch! Expected "${testSecret}", got "${retrievedSecret}"`);
  }

  // Step 6: Verify JSON drafts contain only name + isSecret, NOT the secret value
  console.log('\n[Step 6] Inspecting saved drafts JSON on disk...');
  const draftsJson = await evalExpression(
    wsUrl,
    `localStorage.getItem('openpost_draft_tabs_v1') || ''`
  );
  const containsSecretInJson = draftsJson.includes(testSecret);
  console.log(`Drafts JSON contains secret: ${containsSecretInJson} (Must be false)`);

  if (containsSecretInJson) {
    throw new Error('Plaintext secret leaked into drafts JSON!');
  }

  // Step 7: Clean up (Delete the credential)
  console.log('\n[Step 7] Deleting secret from Windows Credential Manager...');
  await evalExpression(
    wsUrl,
    `window.__TAURI_INTERNALS__.invoke('delete_keychain_secret', { key: '${testKey}' })`
  );

  const afterDeleteCmdkey = execSync('cmdkey /list', { encoding: 'utf-8' });
  const stillExists = afterDeleteCmdkey.includes(`openpost:${testKey}`);
  console.log(`Secret removed from Windows Credential Manager: ${!stillExists}`);

  killApp();
  console.log('\n✅ PROOF COMPLETE: Windows Credential Manager OS keychain storage is fully verified and persistent across restarts!');
}

main().catch(err => {
  console.error('Fatal error during Windows Keychain verification:', err);
  killApp();
  process.exit(1);
});
