import { HttpRequest, HttpResponse, KeyValueParam, HttpResponseCookie } from '../types/http';

export function parseCookieHeader(headerVal: string): HttpResponseCookie {
  const parts = headerVal.split(';');
  const first = (parts[0] || '').trim();
  const eqIdx = first.indexOf('=');
  const name = eqIdx !== -1 ? first.slice(0, eqIdx).trim() : first;
  const value = eqIdx !== -1 ? first.slice(eqIdx + 1).trim() : '';

  let domain: string | undefined;
  let path: string | undefined;
  let expires: string | undefined;
  let httpOnly = false;
  let secure = false;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].trim();
    const pLower = p.toLowerCase();
    if (pLower.startsWith('domain=')) {
      domain = p.slice(7).trim();
    } else if (pLower.startsWith('path=')) {
      path = p.slice(5).trim();
    } else if (pLower.startsWith('expires=')) {
      expires = p.slice(8).trim();
    } else if (pLower === 'httponly') {
      httpOnly = true;
    } else if (pLower === 'secure') {
      secure = true;
    }
  }

  return {
    name,
    value,
    domain,
    path,
    expires,
    httpOnly,
    secure,
  };
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

/**
 * Builds headers dictionary incorporating Auth headers if configured.
 */
export function buildEffectiveHeaders(request: HttpRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  // 1. Explicit headers enabled in the table
  request.headers
    .filter((h) => h.enabled && h.key.trim().length > 0)
    .forEach((h) => {
      headers[h.key.trim()] = h.value;
    });

  // 2. Auth headers
  if (request.auth.type === 'bearer' && request.auth.bearer?.token) {
    headers['Authorization'] = `Bearer ${request.auth.bearer.token}`;
  } else if (request.auth.type === 'basic' && request.auth.basic) {
    const { username, password } = request.auth.basic;
    const encoded = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(`${username}:${password}`)))
      : '';
    headers['Authorization'] = `Basic ${encoded}`;
  } else if (request.auth.type === 'apikey' && request.auth.apiKey?.addTo === 'header') {
    if (request.auth.apiKey.key) {
      headers[request.auth.apiKey.key] = request.auth.apiKey.value;
    }
  }

  // 3. Body Content-Type defaults if not explicitly set
  const hasContentType = Object.keys(headers).some(
    (k) => k.toLowerCase() === 'content-type'
  );

  if (!hasContentType) {
    if (request.body.type === 'json') {
      headers['Content-Type'] = 'application/json';
    } else if (request.body.type === 'form-urlencoded') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (request.body.type === 'text') {
      headers['Content-Type'] = 'text/plain';
    }
  }

  return headers;
}

/**
 * Builds effective URL including API key if configured as query parameter.
 */
export function buildEffectiveUrl(request: HttpRequest): string {
  let url = request.url.trim();
  if (request.auth.type === 'apikey' && request.auth.apiKey?.addTo === 'query') {
    const { key, value } = request.auth.apiKey;
    if (key.trim()) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
  }
  return url;
}

/**
 * Computes payload body string or undefined.
 */
export function buildEffectiveBody(request: HttpRequest): string | undefined {
  if (['GET', 'HEAD'].includes(request.method)) {
    return undefined;
  }

  switch (request.body.type) {
    case 'json':
      return request.body.rawJson || '';
    case 'text':
      return request.body.rawText || '';
    case 'form-urlencoded': {
      const enabled = (request.body.formUrlencoded || []).filter((f: KeyValueParam) => f.enabled && f.key.trim());
      const sp = new URLSearchParams();
      enabled.forEach((f: KeyValueParam) => sp.append(f.key.trim(), f.value));
      return sp.toString();
    }
    case 'multipart':
      // For browser fetch fallback, JSON representation or handled specially
      return JSON.stringify(request.body.multipart || []);
    case 'none':
    default:
      return undefined;
  }
}

export interface HttpExecutionError {
  code: string;
  title: string;
  message: string;
  technicalDetails?: string;
  isSslError?: boolean;
  isCancelled?: boolean;
  durationMs: number;
}

export function isHttpExecutionError(err: unknown): err is HttpExecutionError {
  return typeof err === 'object' && err !== null && 'code' in err && 'title' in err;
}

/**
 * Execute HTTP request either via Tauri Rust backend (zero CORS) or browser fetch.
 */
export async function executeHttpRequest(
  request: HttpRequest,
  abortSignal?: AbortSignal
): Promise<HttpResponse> {
  const url = buildEffectiveUrl(request);
  const headers = buildEffectiveHeaders(request);
  const body = buildEffectiveBody(request);
  const startTime = performance.now();

  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke<HttpResponse>('execute_request', {
        payload: {
          requestId: request.id,
          method: request.method,
          url,
          headers,
          body,
          bodyType: request.body.type,
          timeoutMs: request.settings?.timeoutMs || 30000,
          verifySsl: request.settings?.verifySsl ?? true,
          followRedirects: request.settings?.followRedirects ?? true,
        },
      });
      return response;
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const rawMsg = err instanceof Error ? err.message : String(err);

      // Check if Tauri returned structured JSON error
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.code) {
          let title = 'Network Error';
          if (parsed.code === 'OP-SSL-001') title = 'SSL Certificate Error';
          else if (parsed.code === 'OP-NET-001') title = 'DNS Resolution Failed';
          else if (parsed.code === 'OP-NET-002') title = 'Connection Refused';
          else if (parsed.code === 'OP-NET-003') title = 'Request Timed Out';
          else if (parsed.code === 'OP-NET-004') title = 'Request Cancelled';
          else if (parsed.code === 'OP-NET-005') title = 'Too Many Redirects';

          const structuredError: HttpExecutionError = {
            code: parsed.code,
            title,
            message: parsed.message || 'Network request failed',
            technicalDetails: parsed.technicalDetails || rawMsg,
            isSslError: !!parsed.isSslError,
            durationMs,
          };
          throw structuredError;
        }
      } catch (parseErr) {
        if (isHttpExecutionError(parseErr)) throw parseErr;
      }

      throw {
        code: 'OP-NET-999',
        title: 'Tauri HTTP Execution Error',
        message: rawMsg,
        technicalDetails: rawMsg,
        durationMs,
      } as HttpExecutionError;
    }
  }

  // Fallback to fetch (for browser development, vitest, and web previews)
  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: abortSignal,
    };

    if (body !== undefined && !['GET', 'HEAD'].includes(request.method)) {
      fetchOptions.body = body;
    }

    const res = await fetch(url, fetchOptions);
    const durationMs = Math.round(performance.now() - startTime);
    const contentType = res.headers.get('content-type') || undefined;
    const ctLower = (contentType || '').toLowerCase();
    const isImage = ctLower.startsWith('image/');
    const isBinary = isImage || ctLower.includes('octet-stream') || ctLower.includes('pdf') || ctLower.includes('zip');

    let bodyStr = '';
    let bodyBytes = 0;

    if (isBinary) {
      const buffer = await res.arrayBuffer();
      bodyBytes = buffer.byteLength;
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      bodyStr = typeof btoa !== 'undefined' ? btoa(binary) : '';
    } else {
      bodyStr = await res.text();
      bodyBytes = new TextEncoder().encode(bodyStr).length;
    }

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    return {
      requestId: request.id,
      statusCode: res.status,
      statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
      headers: responseHeaders,
      cookies: [],
      body: bodyStr,
      bodySizeBytes: bodyBytes,
      durationMs,
      isTruncated: false,
      contentType,
      isBinary,
    };

  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);

    if (err instanceof Error && err.name === 'AbortError') {
      const cancelledError: HttpExecutionError = {
        code: 'OP-NET-004',
        title: 'Request Cancelled',
        message: 'The request was cancelled by the user.',
        isCancelled: true,
        durationMs,
      };
      throw cancelledError;
    }

    const rawMessage = err instanceof Error ? err.message : String(err);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const netError: HttpExecutionError = {
      code: isOffline ? 'OP-NET-001' : 'OP-NET-999',
      title: isOffline ? 'No Network Connection' : 'Browser Network / Security Block',
      message: isOffline
        ? 'Your computer appears to be offline.'
        : 'The browser blocked or could not complete this request (CORS, network or certificate). Use the OpenPost desktop app for full functionality.',
      technicalDetails: rawMessage,
      isSslError: false,
      durationMs,
    };
    throw netError;
  }
}
