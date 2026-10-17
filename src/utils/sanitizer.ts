/**
 * Sanitizes sensitive information (tokens, passwords, cookies, API keys) from strings,
 * headers, diagnostics, or error logs before they are displayed or copied.
 */

const SENSITIVE_KEYWORDS = [
  'authorization',
  'bearer',
  'cookie',
  'token',
  'secret',
  'password',
  'key',
  'apikey',
  'x-api-key',
  'access_token',
  'refresh_token',
  'session',
];

export function isSensitiveKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function sanitizeHeaderMap(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (isSensitiveKey(k)) {
      sanitized[k] = '[REDACTED_SECRET]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function sanitizeUrlQueryParams(url: string): string {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    let modified = false;
    for (const [key] of Array.from(searchParams.entries())) {
      if (isSensitiveKey(key)) {
        searchParams.set(key, '[REDACTED]');
        modified = true;
      }
    }
    if (modified) {
      urlObj.search = searchParams.toString();
      return urlObj.toString();
    }
    return url;
  } catch {
    // If not a full URL or contains template variables like {{baseUrl}}, apply regex redaction
    return url.replace(/([?&])(token|api_key|key|password|secret|apikey|access_token|refresh_token)=([^&#]*)/gi, '$1$2=[REDACTED]');
  }
}

export function sanitizeUrl(url: string): string {
  try {
    // Replaces user:password@host with user:***@host
    const userPassSanitized = url.replace(/(https?:\/\/[^:]+):([^@]+)@/i, '$1:***@');
    return sanitizeUrlQueryParams(userPassSanitized);
  } catch {
    return url;
  }
}

export function createSanitizedDiagnostics(error: Error, componentStack?: string): string {
  const timestamp = new Date().toISOString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js/Test';
  const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform : 'Unknown';

  return `### OpenPost Crash Diagnostic Report
- **Timestamp**: ${timestamp}
- **App Version**: 0.1.0
- **Platform**: ${platform || 'Desktop/Node'}
- **User Agent**: ${userAgent}
- **Error Name**: ${error.name}
- **Error Message**: ${error.message}

#### Stack Trace
\`\`\`
${error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : 'No stack trace available'}
\`\`\`

#### Component Hierarchy
\`\`\`
${componentStack ? componentStack.trim() : 'No component stack available'}
\`\`\`
`;
}

export function sanitizeRequestForStorage<T extends {
  url?: string;
  auth?: any;
  headers?: any[];
  params?: any[];
  body?: any;
}>(request: T): T {
  const cloned = JSON.parse(JSON.stringify(request)) as T;

  // 1. Redact Auth credentials
  if (cloned.auth) {
    if (cloned.auth.bearer) {
      cloned.auth.bearer.token = '';
    }
    if (cloned.auth.basic) {
      cloned.auth.basic.password = '';
    }
    if (cloned.auth.apiKey) {
      cloned.auth.apiKey.value = '';
    }
  }

  // 2. Redact Sensitive Headers (Authorization, Cookie, X-API-Key, etc.)
  if (Array.isArray(cloned.headers)) {
    cloned.headers = cloned.headers.map((h: any) => {
      if (h && typeof h.key === 'string' && isSensitiveKey(h.key)) {
        return { ...h, value: '' };
      }
      return h;
    });
  }

  // 3. Redact Sensitive Query Parameters
  if (Array.isArray(cloned.params)) {
    cloned.params = cloned.params.map((p: any) => {
      if (p && typeof p.key === 'string' && isSensitiveKey(p.key)) {
        return { ...p, value: '' };
      }
      return p;
    });
  }

  // 4. Redact URL embedded secret parameters
  if (typeof cloned.url === 'string') {
    cloned.url = sanitizeUrlQueryParams(cloned.url);
  }

  // 5. Redact Form bodies and JSON payloads
  if (cloned.body) {
    // Form URL-Encoded
    if (Array.isArray(cloned.body.formUrlencoded)) {
      cloned.body.formUrlencoded = cloned.body.formUrlencoded.map((f: any) => {
        if (f && typeof f.key === 'string' && isSensitiveKey(f.key)) {
          return { ...f, value: '' };
        }
        return f;
      });
    }

    // Multipart form fields
    if (Array.isArray(cloned.body.multipart)) {
      cloned.body.multipart = cloned.body.multipart.map((m: any) => {
        if (m && typeof m.key === 'string' && isSensitiveKey(m.key)) {
          return { ...m, value: '' };
        }
        return m;
      });
    }

    // Raw JSON Body
    if (typeof cloned.body.rawJson === 'string' && cloned.body.rawJson.trim()) {
      try {
        const parsed = JSON.parse(cloned.body.rawJson);
        const redactJsonValues = (val: any): any => {
          if (Array.isArray(val)) {
            return val.map(redactJsonValues);
          }
          if (val && typeof val === 'object') {
            const result: Record<string, any> = {};
            for (const [k, v] of Object.entries(val)) {
              if (isSensitiveKey(k)) {
                result[k] = '';
              } else {
                result[k] = redactJsonValues(v);
              }
            }
            return result;
          }
          return val;
        };
        cloned.body.rawJson = JSON.stringify(redactJsonValues(parsed), null, 2);
      } catch {
        // Leave unparseable JSON unchanged
      }
    }
  }

  return cloned;
}

