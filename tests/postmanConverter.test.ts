import { describe, it, expect } from 'vitest';
import { convertPostmanCollection } from '../src/utils/postmanConverter';
import fs from 'fs';
import path from 'path';

describe('Postman Collection v2.1 Import Converter (OP-R2-014)', () => {
  it('handles empty input gracefully with clear error code', () => {
    const result = convertPostmanCollection('');
    expect(result.error).toContain('OP-IMP-001');
  });

  it('handles malformed JSON input gracefully with clear error code', () => {
    const corruptedFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures/postman/corrupted.json'),
      'utf-8'
    );
    const result = convertPostmanCollection(corruptedFixture);
    expect(result.error).toContain('OP-IMP-002');
  });

  it('rejects invalid collection format with OP-IMP-003', () => {
    const result = convertPostmanCollection(JSON.stringify({ someRandomProperty: true }));
    expect(result.error).toContain('OP-IMP-003');
  });

  it('rejects unknown schema versions with OP-IMP-004', () => {
    const result = convertPostmanCollection(
      JSON.stringify({ openpostFormat: '99.0.0', requests: [] })
    );
    expect(result.error).toContain('OP-IMP-004');
    expect(result.error).toContain('99.0.0');
  });

  it('parses valid multi-folder collection with requests, params, and auth', () => {
    const validFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures/postman/valid_v2.1.json'),
      'utf-8'
    );
    const result = convertPostmanCollection(validFixture);

    expect(result.error).toBeUndefined();
    expect(result.collectionName).toBe('Customer Orders API');
    expect(result.requests.length).toBe(2);

    const loginReq = result.requests.find((r) => r.name === 'Obtain Bearer Token');
    expect(loginReq).toBeDefined();
    expect(loginReq?.method).toBe('POST');
    expect(loginReq?.url).toBe('https://api.example.com/v1/auth/login');
    expect(loginReq?.body.type).toBe('json');

    const ordersReq = result.requests.find((r) => r.name === 'List Orders');
    expect(ordersReq).toBeDefined();
    expect(ordersReq?.method).toBe('GET');
    expect(ordersReq?.auth.type).toBe('bearer');
    expect(ordersReq?.params.length).toBeGreaterThan(0);
  });

  it('reports skipped pre-request and test scripts in summary', () => {
    const scriptsFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures/postman/unsupported_scripts.json'),
      'utf-8'
    );
    const result = convertPostmanCollection(scriptsFixture);

    expect(result.error).toBeUndefined();
    expect(result.summary.skippedFeatures.some((f) => f.includes('Pre-request scripts'))).toBe(true);
    expect(result.summary.skippedFeatures.some((f) => f.includes('Test scripts'))).toBe(true);
  });

  it('guards against circular folders exceeding max depth of 10 levels', () => {
    const circularFixture = fs.readFileSync(
      path.join(__dirname, 'fixtures/postman/circular_folders.json'),
      'utf-8'
    );
    const result = convertPostmanCollection(circularFixture);

    expect(result.summary.skippedFeatures.some((f) => f.includes('maximum depth'))).toBe(true);
  });

  it('rejects oversized collections exceeding the 10MB limit with OP-IMP-005', () => {
    // Generate a payload slightly over 10 MB (10 * 1024 * 1024 + 1 bytes)
    const largeDummy = 'x'.repeat(10 * 1024 * 1024 + 2);
    const result = convertPostmanCollection(largeDummy);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('OP-IMP-005');
    expect(result.error).toContain('10 MB');
  });
});
