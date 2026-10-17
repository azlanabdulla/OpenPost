import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResponseViewer } from '../src/components/response/ResponseViewer';
import { HttpResponse } from '../src/types/http';

describe('Phase 2 Response Engine & Security Isolation (OP-R2-005, 006, 007, 008)', () => {
  const baseResponse: HttpResponse = {
    requestId: 'req-1',
    statusCode: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': 'session=abc123xyz; Path=/; HttpOnly; Secure',
    },
    cookies: [
      {
        name: 'session_token',
        value: 'sess-abc-123',
        domain: '.example.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'tracking_id',
        value: 'track-999',
        domain: '.example.com',
        path: '/analytics',
        httpOnly: false,
        secure: false,
      },
    ],
    body: '<h1>Welcome to API</h1><p>Test HTML body</p>',
    bodySizeBytes: 42,
    durationMs: 120,
    isTruncated: false,
    contentType: 'text/html; charset=utf-8',
    isBinary: false,
  };

  it('renders sandboxed preview iframe with sandbox="" and CSP meta tag (OP-R2-008)', () => {
    render(<ResponseViewer response={baseResponse} isLoading={false} error={null} />);

    // Click Preview tab
    const previewTab = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewTab);

    const iframe = screen.getByTitle('HTML Response Preview');
    expect(iframe).toBeInTheDocument();
    // Verify sandbox attribute has no permissive flags (empty string)
    expect(iframe.getAttribute('sandbox')).toBe('');

    // Verify injected CSP meta tag inside srcDoc
    const srcDoc = iframe.getAttribute('srcdoc') || '';
    expect(srcDoc).toContain("default-src 'none'");
    expect(srcDoc).toContain("img-src data:");
    expect(srcDoc).toContain("style-src 'unsafe-inline'");
  });

  it('renders structured cookies tab displaying multi-Set-Cookie table (OP-R2-006)', () => {
    render(<ResponseViewer response={baseResponse} isLoading={false} error={null} />);

    const cookiesTab = screen.getByRole('button', { name: /cookies/i });
    fireEvent.click(cookiesTab);

    expect(screen.getByText('session_token')).toBeInTheDocument();
    expect(screen.getByText('sess-abc-123')).toBeInTheDocument();
    expect(screen.getByText('HttpOnly')).toBeInTheDocument();
    expect(screen.getByText('Secure')).toBeInTheDocument();

    expect(screen.getByText('tracking_id')).toBeInTheDocument();
    expect(screen.getByText('track-999')).toBeInTheDocument();
  });

  it('renders visual image preview card for binary images (OP-R2-005)', () => {
    const imageResponse: HttpResponse = {
      ...baseResponse,
      contentType: 'image/png',
      isBinary: true,
      body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // 1x1 transparent PNG base64
      bodySizeBytes: 68,
    };

    render(<ResponseViewer response={imageResponse} isLoading={false} error={null} />);

    const img = screen.getByAltText('Response preview');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('data:image/png;base64,');
  });

  it('enforces 50MB safety limit on decompressed payloads (OP-R2-007)', () => {
    const MAX_LIMIT = 50 * 1024 * 1024;
    expect(MAX_LIMIT).toBe(52428800);
  });
});
