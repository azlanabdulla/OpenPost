import { describe, it, expect } from 'vitest';
import { extractParamsFromUrl, syncUrlWithParams } from '../src/utils/url';
import { KeyValueParam } from '../src/types/http';

describe('URL & Query Params bi-directional sync', () => {
  it('extracts query params correctly from a URL', () => {
    const url = 'https://api.example.com/v1/users?limit=20&page=2&filter=active';
    const params = extractParamsFromUrl(url);

    expect(params).toHaveLength(3);
    expect(params[0].key).toBe('limit');
    expect(params[0].value).toBe('20');
    expect(params[0].enabled).toBe(true);

    expect(params[1].key).toBe('page');
    expect(params[1].value).toBe('2');

    expect(params[2].key).toBe('filter');
    expect(params[2].value).toBe('active');
  });

  it('returns empty array when URL has no query params', () => {
    const url = 'https://api.example.com/v1/users';
    const params = extractParamsFromUrl(url);
    expect(params).toEqual([]);
  });

  it('updates URL when query params change', () => {
    const baseUrl = 'https://api.example.com/v1/users';
    const params: KeyValueParam[] = [
      { id: '1', key: 'sort', value: 'asc', enabled: true },
      { id: '2', key: 'limit', value: '50', enabled: true },
    ];

    const result = syncUrlWithParams(baseUrl, params);
    expect(result).toBe('https://api.example.com/v1/users?sort=asc&limit=50');
  });

  it('omits disabled query params from the URL', () => {
    const baseUrl = 'https://api.example.com/v1/users';
    const params: KeyValueParam[] = [
      { id: '1', key: 'sort', value: 'asc', enabled: true },
      { id: '2', key: 'hidden', value: 'true', enabled: false },
      { id: '3', key: 'limit', value: '50', enabled: true },
    ];

    const result = syncUrlWithParams(baseUrl, params);
    expect(result).toBe('https://api.example.com/v1/users?sort=asc&limit=50');
    expect(result).not.toContain('hidden');
  });

  it('returns base URL when all params are disabled or empty', () => {
    const baseUrl = 'https://api.example.com/v1/users';
    const params: KeyValueParam[] = [
      { id: '1', key: '', value: '', enabled: true },
      { id: '2', key: 'test', value: 'val', enabled: false },
    ];

    const result = syncUrlWithParams(baseUrl, params);
    expect(result).toBe('https://api.example.com/v1/users');
  });

  it('properly encodes special characters in params', () => {
    const baseUrl = 'https://api.example.com/search';
    const params: KeyValueParam[] = [
      { id: '1', key: 'q', value: 'hello world & more', enabled: true },
    ];

    const result = syncUrlWithParams(baseUrl, params);
    expect(result).toBe('https://api.example.com/search?q=hello+world+%26+more');
  });
});
