import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import http from 'http';
import { executeHttpRequest } from '../src/utils/httpExecutor';
import { parseCurlCommand } from '../src/utils/curlParser';
import { useThemeStore } from '../src/stores/themeStore';
import { useRequestStore, createDefaultRequest } from '../src/stores/requestStore';

describe('Desktop E2E Core Workflows (Phase 2 Item 9)', () => {
  let server: http.Server;
  let serverPort: number;

  beforeEach(() => {
    localStorage.clear();
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // 1. Send a request to a local server
  it('E2E Flow 1: executes HTTP request against a local test server and verifies response payload and headers', async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Server-Name': 'OpenPost-E2E-Mock',
      });
      res.end(JSON.stringify({ status: 'ok', serverTime: 123456789 }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    const request = createDefaultRequest({
      name: 'Local Server Test',
      method: 'GET',
      url: `http://127.0.0.1:${serverPort}/api/test`,
      settings: { timeoutMs: 5000, verifySsl: true, followRedirects: true },
    });

    const response = await executeHttpRequest(request);

    expect(response.statusCode).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers['x-server-name'] || response.headers['X-Server-Name']).toBe('OpenPost-E2E-Mock');
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
    expect(response.body).toContain('"status":"ok"');
  });

  // 2. Save request to collection / tab state with two-way sync
  it('E2E Flow 2: creates, modifies, and persists request to collection tab state with auto-param sync', () => {
    const store = useRequestStore.getState();

    // Add tab for a collection request
    store.addTab({
      name: 'Get User Profile',
      method: 'GET',
      url: 'https://api.example.com/users/42?active=true&format=json',
    });

    const tabs = useRequestStore.getState().tabs;
    const currentTab = tabs.find((t) => t.name === 'Get User Profile');
    expect(currentTab).toBeDefined();
    expect(currentTab?.request.params.length).toBeGreaterThanOrEqual(2);
    expect(currentTab?.request.params.find((p) => p.key === 'active')?.value).toBe('true');
    expect(currentTab?.request.params.find((p) => p.key === 'format')?.value).toBe('json');

    // Update query params from table and verify two-way sync to URL
    const updatedParams = [
      { id: '1', key: 'active', value: 'false', enabled: true },
      { id: '2', key: 'format', value: 'json', enabled: true },
    ];
    store.setParams(updatedParams);
    const updatedTab = useRequestStore.getState().tabs.find((t) => t.name === 'Get User Profile');
    expect(updatedTab?.request.url).toContain('active=false');
  });

  // 3. Import a cURL command
  it('E2E Flow 3: imports cURL command, parses headers, params, body, and reports unsupported flags', () => {
    const curlCommand = `curl -X POST 'https://api.github.com/repos/azlanabdulla/OpenPost/issues' \\
      -H 'Accept: application/vnd.github.v3+json' \\
      -H 'Content-Type: application/json' \\
      --socks5 127.0.0.1:9050 \\
      -d '{"title":"Bug report","body":"Found a bug"}'`;

    const { request, unsupportedFlags } = parseCurlCommand(curlCommand);

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.github.com/repos/azlanabdulla/OpenPost/issues');
    expect(request.headers.some((h) => h.key === 'Accept' && h.value.includes('application/vnd.github'))).toBe(true);
    expect(request.headers.some((h) => h.key === 'Content-Type' && h.value === 'application/json')).toBe(true);
    expect(request.body.type).toBe('json');
    expect(request.body.rawJson).toContain('Bug report');

    // Unsupported flags detection
    expect(unsupportedFlags).toContain('--socks5');
  });

  // 4. Theme persistence
  it('E2E Flow 4: persists theme preference in storage and restores on initialization', () => {
    const themeStore = useThemeStore.getState();

    // Set to light mode
    themeStore.setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(localStorage.getItem('openpost_theme_mode')).toBe('light');

    // Set to dark mode
    themeStore.setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(localStorage.getItem('openpost_theme_mode')).toBe('dark');

    // Re-initialize theme from localStorage
    themeStore.initTheme();
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  // 5. Unsaved-tab dialog and tab close confirmation
  it('E2E Flow 5: manages unsaved tab states, prompts confirmation on dirty close, supports cancel and discard', () => {
    const store = useRequestStore.getState();

    // Add dirty tab
    store.addTab({ name: 'Tab With Unsaved Edits', url: 'https://api.example.com/draft' });
    const tabId = useRequestStore.getState().activeTabId;

    useRequestStore.setState((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: true } : t)),
    }));

    // Trigger tab close request (should enter pending close confirmation)
    store.requestCloseTab(tabId);
    expect(useRequestStore.getState().pendingCloseTabId).toBe(tabId);

    // Cancel tab close -> tab must stay open and pendingCloseTabId cleared
    store.cancelCloseTab();
    expect(useRequestStore.getState().pendingCloseTabId).toBeNull();
    expect(useRequestStore.getState().tabs.some((t) => t.id === tabId)).toBe(true);

    // Re-request and confirm close (equivalent to clicking "Don't Save" / discard)
    store.requestCloseTab(tabId);
    expect(useRequestStore.getState().pendingCloseTabId).toBe(tabId);
    store.confirmCloseTab();
    expect(useRequestStore.getState().pendingCloseTabId).toBeNull();
    expect(useRequestStore.getState().tabs.some((t) => t.id === tabId)).toBe(false);
  });
});
