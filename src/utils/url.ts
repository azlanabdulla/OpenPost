import { KeyValueParam } from '../types/http';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Extracts query parameters from a URL into KeyValueParam rows.
 */
export function extractParamsFromUrl(url: string): KeyValueParam[] {
  if (!url) return [];
  try {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return [];

    const searchStr = url.slice(qIndex + 1);
    if (!searchStr.trim()) return [];

    const searchParams = new URLSearchParams(searchStr);
    const params: KeyValueParam[] = [];

    searchParams.forEach((value, key) => {
      params.push({
        id: generateId(),
        key,
        value,
        enabled: true,
        description: '',
      });
    });

    return params;
  } catch {
    return [];
  }
}

/**
 * Updates a URL's query string using an array of KeyValueParams.
 * Enabled params are added to the query string; disabled params are omitted from the URL.
 */
export function syncUrlWithParams(baseUrl: string, params: KeyValueParam[]): string {
  if (!baseUrl) return '';

  const qIndex = baseUrl.indexOf('?');
  const baseWithoutQuery = qIndex !== -1 ? baseUrl.slice(0, qIndex) : baseUrl;

  const enabledParams = params.filter((p) => p.enabled && p.key.trim().length > 0);
  if (enabledParams.length === 0) {
    return baseWithoutQuery;
  }

  const searchParams = new URLSearchParams();
  enabledParams.forEach((p) => {
    searchParams.append(p.key.trim(), p.value);
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseWithoutQuery}?${queryString}` : baseWithoutQuery;
}

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  autoPrefixed: boolean;
  hasVariables: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Normalizes and validates request URLs, auto-suggesting https:// when protocol is missing.
 */
export function normalizeAndValidateUrl(rawUrl: string): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedUrl: '',
      autoPrefixed: false,
      hasVariables: false,
      errorCode: 'OP-URL-002',
      errorMessage: 'URL cannot be empty',
    };
  }

  const hasVariables = /\{\{.+?\}\}/.test(trimmed);

  // If starts with variable like {{baseUrl}}/path, allow variable expansion
  if (trimmed.startsWith('{{')) {
    return {
      isValid: true,
      normalizedUrl: trimmed,
      autoPrefixed: false,
      hasVariables: true,
    };
  }

  // Check for unsupported schemes
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return {
        isValid: false,
        normalizedUrl: trimmed,
        autoPrefixed: false,
        hasVariables,
        errorCode: 'OP-URL-003',
        errorMessage: `Unsupported protocol "${scheme}://". Only http:// and https:// are supported.`,
      };
    }
    return {
      isValid: true,
      normalizedUrl: trimmed,
      autoPrefixed: false,
      hasVariables,
    };
  }

  // Missing protocol: auto-prefix https://
  return {
    isValid: true,
    normalizedUrl: `https://${trimmed}`,
    autoPrefixed: true,
    hasVariables,
  };
}
