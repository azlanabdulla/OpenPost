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
});
