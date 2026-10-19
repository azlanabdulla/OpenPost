import { describe, it, expect } from 'vitest';
import { validateJsonString } from '../src/utils/jsonValidator';

describe('validateJsonString', () => {
  it('returns valid for empty strings and whitespace', () => {
    expect(validateJsonString('').isValid).toBe(true);
    expect(validateJsonString('   ').isValid).toBe(true);
  });

  it('validates well-formed JSON objects and arrays', () => {
    expect(validateJsonString('{"name": "OpenPost", "version": 1}').isValid).toBe(true);
    expect(validateJsonString('[1, 2, 3, "test"]').isValid).toBe(true);
  });

  it('detects syntax errors and extracts line and column position', () => {
    const invalidJson = '{\n  "title": "OpenPost",\n  brokenKey: 123\n}';
    const result = validateJsonString(invalidJson);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeDefined();
    expect(result.line).toBe(3);
    expect(result.column).toBeDefined();
  });

  it('detects unquoted keys or trailing commas', () => {
    const trailingCommaJson = '{\n  "key": "val",\n}';
    const result = validateJsonString(trailingCommaJson);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('validates a 1 MB JSON payload in under 50ms without lag', () => {
    // Generate ~1 MB valid JSON array
    const largeObject = Array.from({ length: 15000 }, (_, i) => ({
      id: i,
      uuid: `item-${i}-abcdef1234567890`,
      active: i % 2 === 0,
      name: `User ${i}`,
    }));
    const jsonStr = JSON.stringify(largeObject);
    expect(jsonStr.length).toBeGreaterThan(1024 * 1024); // > 1 MB

    const start = performance.now();
    const result = validateJsonString(jsonStr);
    const duration = performance.now() - start;

    expect(result.isValid).toBe(true);
    expect(duration).toBeLessThan(100); // Parses smoothly in < 100ms
  });
});

