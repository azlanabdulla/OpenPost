import { describe, it, expect } from 'vitest';
import {
  sanitizeHeaderMap,
  sanitizeUrl,
  createSanitizedDiagnostics,
  isSensitiveKey,
} from '../src/utils/sanitizer';

describe('Security & Diagnostics Sanitizer', () => {
  it('identifies sensitive keywords correctly', () => {
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('authorization')).toBe(true);
    expect(isSensitiveKey('X-Api-Key')).toBe(true);
    expect(isSensitiveKey('Cookie')).toBe(true);
    expect(isSensitiveKey('Set-Cookie')).toBe(true);
    expect(isSensitiveKey('my-secret-token')).toBe(true);
    expect(isSensitiveKey('Content-Type')).toBe(false);
    expect(isSensitiveKey('Accept')).toBe(false);
  });

  it('redacts sensitive headers from header maps', () => {
    const rawHeaders = {
      Authorization: 'Bearer super_secret_jwt_token',
      'X-API-KEY': 'sk-1234567890abcdef',
      Cookie: 'session_id=secret123; user=admin',
      'Content-Type': 'application/json',
      Accept: '*/*',
    };

    const sanitized = sanitizeHeaderMap(rawHeaders);

    expect(sanitized['Authorization']).toBe('[REDACTED_SECRET]');
    expect(sanitized['X-API-KEY']).toBe('[REDACTED_SECRET]');
    expect(sanitized['Cookie']).toBe('[REDACTED_SECRET]');
    expect(sanitized['Content-Type']).toBe('application/json');
    expect(sanitized['Accept']).toBe('*/*');
  });

  it('redacts user passwords in URLs', () => {
    const rawUrl = 'https://admin:supersecret@api.example.com/data';
    const sanitized = sanitizeUrl(rawUrl);
    expect(sanitized).toBe('https://admin:***@api.example.com/data');
    expect(sanitized).not.toContain('supersecret');
  });

  it('generates sanitized diagnostic report without leaking sensitive data', () => {
    const testError = new Error('Database connection failed');
    const diagnostics = createSanitizedDiagnostics(testError, 'in App > MainPanel > RequestBuilder');

    expect(diagnostics).toContain('OpenPost Crash Diagnostic Report');
    expect(diagnostics).toContain('Database connection failed');
    expect(diagnostics).toContain('0.1.0');
    expect(diagnostics).toContain('in App > MainPanel > RequestBuilder');
  });
});
