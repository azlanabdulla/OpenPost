import { HttpRequest, HttpMethod, KeyValueParam } from '../types/http';
import { generateId, extractParamsFromUrl } from './url';
import { createDefaultRequest } from '../stores/requestStore';

export interface CurlParseResult {
  request: HttpRequest;
  unsupportedFlags: string[];
}

/**
 * Tokenizes a command line string respecting single and double quotes.
 */
function tokenizeCurl(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if ((char === ' ' || char === '\t' || char === '\n' || char === '\r') && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export const CURL_UNSUPPORTED_FLAG_DESCRIPTIONS: Record<string, string> = {
  '--socks5': 'SOCKS5 proxy protocol is not currently supported.',
  '--socks5-hostname': 'SOCKS5 proxy hostname resolution is not currently supported.',
  '--proxy': 'HTTP/HTTPS proxy routing is not currently supported in this client build.',
  '-x': 'HTTP/HTTPS proxy routing is not currently supported in this client build.',
  '--limit-rate': 'Network bandwidth rate limiting is omitted.',
  '--cert-status': 'OCSP certificate status verification is skipped.',
  '--compressed': 'Payload compression/decompression is handled transparently by the engine.',
  '--cookie-jar': 'External cookie jar export files are not used (cookies are managed in the Cookies tab).',
  '-c': 'External cookie jar files are not used.',
  '-b': 'External cookie storage files are not used (cookies can be passed via Cookie header).',
  '--cookie': 'External cookie files are omitted (cookies can be passed via Cookie header).',
  '--retry': 'Automatic request retries are omitted; requests execute on demand.',
  '-m': 'Per-request timeout overrides are omitted (default client timeout is applied).',
  '--max-time': 'Per-request timeout overrides are omitted (default client timeout is applied).',
};

const KNOWN_UNSUPPORTED_FLAGS = new Set(Object.keys(CURL_UNSUPPORTED_FLAG_DESCRIPTIONS));

/**
 * Parses a cURL command into an OpenPost HttpRequest.
 */
export function parseCurlCommand(command: string): CurlParseResult {
  const tokens = tokenizeCurl(command.trim());
  const unsupportedFlags: string[] = [];
  const req = createDefaultRequest();
  req.name = 'Imported cURL';

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: KeyValueParam[] = [];
  let bodyData = '';
  let verifySsl = true;

  let i = 0;
  // Skip leading "curl" token if present
  if (tokens.length > 0 && tokens[0].toLowerCase() === 'curl') {
    i = 1;
  }

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[i + 1].toUpperCase() as HttpMethod;
        i += 2;
        continue;
      }
    } else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[i + 1];
        const colonIdx = headerStr.indexOf(':');
        if (colonIdx > 0) {
          const key = headerStr.slice(0, colonIdx).trim();
          const value = headerStr.slice(colonIdx + 1).trim();
          headers.push({
            id: generateId(),
            key,
            value,
            enabled: true,
          });
        }
        i += 2;
        continue;
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      if (i + 1 < tokens.length) {
        bodyData = tokens[i + 1];
        if (method === 'GET') {
          method = 'POST';
        }
        i += 2;
        continue;
      }
    } else if (token === '-k' || token === '--insecure') {
      verifySsl = false;
      i += 1;
      continue;
    } else if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const userPass = tokens[i + 1];
        const colonIdx = userPass.indexOf(':');
        const username = colonIdx >= 0 ? userPass.slice(0, colonIdx) : userPass;
        const password = colonIdx >= 0 ? userPass.slice(colonIdx + 1) : '';
        req.auth = {
          type: 'basic',
          basic: { username, password },
        };
        i += 2;
        continue;
      }
    } else if (KNOWN_UNSUPPORTED_FLAGS.has(token)) {
      unsupportedFlags.push(token);
      // If flag takes an argument, skip next token as well
      if (token === '--proxy' || token === '-x' || token === '--limit-rate' || token === '--socks5' || token === '--socks5-hostname') {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    } else if (!token.startsWith('-') && !url) {
      url = token;
      i += 1;
      continue;
    }

    i += 1;
  }

  req.method = method;
  if (url) {
    req.url = url;
    const initialParams = extractParamsFromUrl(url);
    if (initialParams.length > 0) {
      req.params = initialParams;
    }
  }

  if (headers.length > 0) {
    req.headers = headers;
  }

  if (bodyData) {
    let isJson = false;
    try {
      JSON.parse(bodyData);
      isJson = true;
    } catch {
      isJson = false;
    }

    req.body = {
      type: isJson ? 'json' : 'text',
      rawJson: isJson ? bodyData : '',
      rawText: isJson ? '' : bodyData,
      formUrlencoded: [],
      multipart: [],
    };
  }

  req.settings = {
    ...req.settings,
    verifySsl,
  };

  return { request: req, unsupportedFlags };
}
