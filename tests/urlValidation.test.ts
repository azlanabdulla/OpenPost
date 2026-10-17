import { describe, it, expect } from 'vitest';
import { normalizeAndValidateUrl } from '../src/utils/url';

describe('normalizeAndValidateUrl', () => {
  it('rejects empty and whitespace-only URLs', () => {
    const res1 = normalizeAndValidateUrl('');
    expect(res1.isValid).toBe(false);
    expect(res1.errorCode).toBe('OP-URL-002');

    const res2 = normalizeAndValidateUrl('   ');
    expect(res2.isValid).toBe(false);
    expect(res2.errorCode).toBe('OP-URL-002');
  });

  it('auto-suggests and prepends https:// to URLs missing a protocol', () => {
    const res = normalizeAndValidateUrl('jsonplaceholder.typicode.com/todos/1');
    expect(res.isValid).toBe(true);
    expect(res.autoPrefixed).toBe(true);
    expect(res.normalizedUrl).toBe('https://jsonplaceholder.typicode.com/todos/1');
  });

  it('preserves valid http:// and https:// URLs as-is', () => {
    const resHttp = normalizeAndValidateUrl('http://localhost:3000/api/users');
    expect(resHttp.isValid).toBe(true);
    expect(resHttp.autoPrefixed).toBe(false);
    expect(resHttp.normalizedUrl).toBe('http://localhost:3000/api/users');

    const resHttps = normalizeAndValidateUrl('https://api.github.com/zen');
    expect(resHttps.isValid).toBe(true);
    expect(resHttps.autoPrefixed).toBe(false);
    expect(resHttps.normalizedUrl).toBe('https://api.github.com/zen');
  });

  it('rejects unsupported schemes like ftp:// and file://', () => {
    const res = normalizeAndValidateUrl('ftp://files.example.com/archive.zip');
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe('OP-URL-003');
    expect(res.errorMessage).toContain('Unsupported protocol');
  });

  it('allows URLs starting with variable expressions like {{baseUrl}}/endpoint', () => {
    const res = normalizeAndValidateUrl('{{baseUrl}}/v1/orders');
    expect(res.isValid).toBe(true);
    expect(res.hasVariables).toBe(true);
    expect(res.normalizedUrl).toBe('{{baseUrl}}/v1/orders');
  });
});
