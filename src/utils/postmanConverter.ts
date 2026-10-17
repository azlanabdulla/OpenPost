import { HttpRequest, HttpMethod } from '../types/http';
import { generateId, extractParamsFromUrl } from './url';
import { createDefaultRequest } from '../stores/requestStore';

export interface PostmanImportSummary {
  collectionName: string;
  requestsCount: number;
  foldersCount: number;
  skippedFeatures: string[];
}

export interface PostmanConvertResult {
  collectionName: string;
  requests: HttpRequest[];
  summary: PostmanImportSummary;
  error?: string;
}

const MAX_FOLDER_DEPTH = 10;

/**
 * Parses and converts a Postman v2.0/v2.1 Collection JSON string into OpenPost requests.
 */
export function convertPostmanCollection(jsonString: string): PostmanConvertResult {
  if (!jsonString || !jsonString.trim()) {
    return {
      collectionName: '',
      requests: [],
      summary: { collectionName: '', requestsCount: 0, foldersCount: 0, skippedFeatures: [] },
      error: 'OP-IMP-001: Import data is empty',
    };
  }

  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      collectionName: '',
      requests: [],
      summary: { collectionName: '', requestsCount: 0, foldersCount: 0, skippedFeatures: [] },
      error: `OP-IMP-002: Malformed JSON syntax: ${err?.message || 'Invalid JSON'}`,
    };
  }

  if (typeof data !== 'object' || data === null) {
    return {
      collectionName: '',
      requests: [],
      summary: { collectionName: '', requestsCount: 0, foldersCount: 0, skippedFeatures: [] },
      error: 'OP-IMP-003: Invalid collection format (expected an object)',
    };
  }

  // Handle single exported OpenPost format
  if (data.openpostFormat && Array.isArray(data.requests)) {
    const requests = data.requests.map((r: any) => ({
      ...createDefaultRequest(),
      ...r.request,
      id: generateId(),
      name: r.name || r.request?.name || 'Imported Request',
    }));
    return {
      collectionName: 'OpenPost Export',
      requests,
      summary: {
        collectionName: 'OpenPost Export',
        requestsCount: requests.length,
        foldersCount: 0,
        skippedFeatures: [],
      },
    };
  }

  const collectionName = data.info?.name || 'Imported Collection';
  const requests: HttpRequest[] = [];
  const skippedFeaturesSet = new Set<string>();
  let foldersCount = 0;

  function traverseItems(items: any[], depth: number, folderPath: string) {
    if (depth > MAX_FOLDER_DEPTH) {
      skippedFeaturesSet.add(`Folder nesting exceeded safe maximum depth of ${MAX_FOLDER_DEPTH} (possible circular reference)`);
      return;
    }

    if (!Array.isArray(items)) return;

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      // Detect pre-request or test scripts
      if (Array.isArray(item.event)) {
        for (const ev of item.event) {
          if (ev?.listen === 'prerequest') {
            skippedFeaturesSet.add('Pre-request scripts (OpenPost executes local-first without sandbox runtime)');
          } else if (ev?.listen === 'test') {
            skippedFeaturesSet.add('Test scripts / assertions');
          }
        }
      }

      // If it's a folder containing sub-items
      if (Array.isArray(item.item)) {
        foldersCount++;
        const nextPath = folderPath ? `${folderPath} / ${item.name || 'Folder'}` : (item.name || 'Folder');
        traverseItems(item.item, depth + 1, nextPath);
        continue;
      }

      // If it's a request item
      if (item.request) {
        const reqObj = item.request;
        const converted = convertPostmanRequest(item.name || 'Untitled Request', reqObj, skippedFeaturesSet);
        requests.push(converted);
      }
    }
  }

  traverseItems(data.item, 0, '');

  return {
    collectionName,
    requests,
    summary: {
      collectionName,
      requestsCount: requests.length,
      foldersCount,
      skippedFeatures: Array.from(skippedFeaturesSet),
    },
  };
}

function convertPostmanRequest(
  name: string,
  rawReq: any,
  skippedFeatures: Set<string>
): HttpRequest {
  const req = createDefaultRequest();
  req.id = generateId();
  req.name = name;

  // 1. Method
  if (typeof rawReq.method === 'string') {
    req.method = rawReq.method.toUpperCase() as HttpMethod;
  }

  // 2. URL
  if (typeof rawReq.url === 'string') {
    req.url = rawReq.url;
  } else if (rawReq.url && typeof rawReq.url === 'object') {
    if (rawReq.url.raw) {
      req.url = rawReq.url.raw;
    } else {
      const protocol = rawReq.url.protocol ? `${rawReq.url.protocol}://` : 'https://';
      const host = Array.isArray(rawReq.url.host) ? rawReq.url.host.join('.') : rawReq.url.host || '';
      const path = Array.isArray(rawReq.url.path) ? `/${rawReq.url.path.join('/')}` : '';
      req.url = `${protocol}${host}${path}`;
    }
  }

  if (req.url) {
    const parsedParams = extractParamsFromUrl(req.url);
    if (parsedParams.length > 0) {
      req.params = parsedParams;
    }
  }

  // 3. Headers
  if (Array.isArray(rawReq.header)) {
    req.headers = rawReq.header
      .filter((h: any) => h && typeof h.key === 'string')
      .map((h: any) => ({
        id: generateId(),
        key: h.key,
        value: h.value || '',
        enabled: h.disabled !== true,
        description: h.description || '',
      }));
  }

  // 4. Body
  if (rawReq.body && typeof rawReq.body === 'object') {
    const mode = rawReq.body.mode;
    if (mode === 'raw') {
      const rawText = rawReq.body.raw || '';
      let isJson = false;
      try {
        JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
      req.body = {
        type: isJson ? 'json' : 'text',
        rawJson: isJson ? rawText : '',
        rawText: isJson ? '' : rawText,
        formUrlencoded: [],
        multipart: [],
      };
    } else if (mode === 'urlencoded' && Array.isArray(rawReq.body.urlencoded)) {
      req.body = {
        type: 'form-urlencoded',
        formUrlencoded: rawReq.body.urlencoded.map((f: any) => ({
          id: generateId(),
          key: f.key || '',
          value: f.value || '',
          enabled: f.disabled !== true,
          description: f.description || '',
        })),
        multipart: [],
      };
    } else if (mode === 'formdata' && Array.isArray(rawReq.body.formdata)) {
      req.body = {
        type: 'multipart',
        multipart: rawReq.body.formdata.map((f: any) => ({
          id: generateId(),
          key: f.key || '',
          value: f.value || '',
          type: f.type === 'file' ? 'file' : 'text',
          enabled: f.disabled !== true,
          description: f.description || '',
        })),
        formUrlencoded: [],
      };
    } else if (mode === 'graphql') {
      skippedFeatures.add('GraphQL body mode (converted as raw JSON)');
      req.body = {
        type: 'json',
        rawJson: JSON.stringify({ query: rawReq.body.graphql?.query || '' }, null, 2),
      };
    }
  }

  // 5. Auth
  if (rawReq.auth && typeof rawReq.auth === 'object') {
    const authType = rawReq.auth.type;
    if (authType === 'bearer') {
      const bearerArray = rawReq.auth.bearer || [];
      const tokenObj = Array.isArray(bearerArray) ? bearerArray.find((b: any) => b.key === 'token') : null;
      req.auth = {
        type: 'bearer',
        bearer: { token: tokenObj?.value || '' },
      };
    } else if (authType === 'basic') {
      const basicArray = rawReq.auth.basic || [];
      const userObj = Array.isArray(basicArray) ? basicArray.find((b: any) => b.key === 'username') : null;
      const passObj = Array.isArray(basicArray) ? basicArray.find((b: any) => b.key === 'password') : null;
      req.auth = {
        type: 'basic',
        basic: {
          username: userObj?.value || '',
          password: passObj?.value || '',
        },
      };
    } else if (authType === 'apikey') {
      const keyArray = rawReq.auth.apikey || [];
      const keyObj = Array.isArray(keyArray) ? keyArray.find((k: any) => k.key === 'key') : null;
      const valObj = Array.isArray(keyArray) ? keyArray.find((k: any) => k.key === 'value') : null;
      const inObj = Array.isArray(keyArray) ? keyArray.find((k: any) => k.key === 'in') : null;
      req.auth = {
        type: 'apikey',
        apiKey: {
          key: keyObj?.value || '',
          value: valObj?.value || '',
          addTo: inObj?.value === 'query' ? 'query' : 'header',
        },
      };
    } else if (authType && authType !== 'noauth') {
      skippedFeatures.add(`Unsupported auth type: ${authType} (converted to 'none')`);
    }
  }

  return req;
}
