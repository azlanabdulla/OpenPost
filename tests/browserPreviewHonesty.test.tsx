import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { executeHttpRequest, HttpExecutionError } from '../src/utils/httpExecutor';
import { createDefaultRequest } from '../src/stores/requestStore';
import { ResponseViewer } from '../src/components/response/ResponseViewer';

describe('Browser-preview honesty (Plain browser vs Tauri desktop)', () => {
  const originalFetch = globalThis.fetch;
  const originalTauri = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

  beforeEach(() => {
    // Ensure plain browser environment
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalTauri !== undefined) {
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = originalTauri;
    } else {
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    }
  });

  it('fails with neutral message and isSslError: false when running in browser mode', async () => {
    // Simulate standard browser fetch failure (CORS / network / cert error thrown by browser)
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const req = createDefaultRequest({
      url: 'https://self-signed.badssl.com/',
      method: 'GET',
    });

    let caughtError: HttpExecutionError | null = null;
    try {
      await executeHttpRequest(req);
    } catch (err: unknown) {
      caughtError = err as HttpExecutionError;
    }

    expect(caughtError).not.toBeNull();
    // Must NOT be labelled as SSL error in browser mode
    expect(caughtError?.isSslError).toBe(false);
    // Must display neutral message
    expect(caughtError?.message).toBe(
      'The browser blocked or could not complete this request (CORS, network or certificate). Use the OpenPost desktop app for full functionality.'
    );
  });

  it('hides "Disable SSL & Retry" button in browser mode even if error has isSslError: true', () => {
    const sslError: HttpExecutionError = {
      code: 'OP-SSL-001',
      title: 'SSL Certificate Error',
      message: 'The browser blocked or could not complete this request.',
      isSslError: true,
      durationMs: 45,
    };

    const handleRetry = vi.fn();

    render(
      <ResponseViewer
        response={null}
        isLoading={false}
        error={sslError}
        onDisableSslAndRetry={handleRetry}
      />
    );

    // Button must be hidden in browser mode
    expect(
      screen.queryByRole('button', { name: /disable ssl verification & retry/i })
    ).not.toBeInTheDocument();
  });

  it('shows "Disable SSL & Retry" button when running inside Tauri desktop environment', () => {
    // Mock Tauri desktop environment
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};

    const sslError: HttpExecutionError = {
      code: 'OP-SSL-001',
      title: 'SSL Certificate Error',
      message: 'SSL/TLS certificate verification failed.',
      isSslError: true,
      durationMs: 45,
    };

    const handleRetry = vi.fn();

    render(
      <ResponseViewer
        response={null}
        isLoading={false}
        error={sslError}
        onDisableSslAndRetry={handleRetry}
      />
    );

    // Button must be visible in Tauri desktop mode
    expect(
      screen.getByRole('button', { name: /disable ssl verification & retry/i })
    ).toBeInTheDocument();
  });
});
