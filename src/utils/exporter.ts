import { HttpRequest } from '../types/http';
import { generateId } from './url';
import { sanitizeRequestForStorage } from './sanitizer';

export type ExportFormat = 'openpost' | 'postman';

export interface TabExportItem {
  id: string;
  name: string;
  request: HttpRequest;
}

export interface ExportOptions {
  format: ExportFormat;
  excludeSecrets: boolean;
  collectionName?: string;
}

export function buildOpenPostExport(tabs: TabExportItem[], excludeSecrets: boolean) {
  const exportedTabs = tabs.map((t) => ({
    id: t.id,
    name: t.name,
    request: excludeSecrets ? sanitizeRequestForStorage(t.request) : t.request,
  }));

  return {
    openpostFormat: '1.0.0',
    exportedAt: new Date().toISOString(),
    secretsExcluded: excludeSecrets,
    requests: exportedTabs,
  };
}

export function buildPostmanExport(
  tabs: TabExportItem[],
  excludeSecrets: boolean,
  collectionName = 'OpenPost Collection'
) {
  const items = tabs.map((t) => {
    const req = excludeSecrets ? sanitizeRequestForStorage(t.request) : t.request;

    // Build URL representation
    const queryParams = req.params
      .filter((p) => p.enabled && p.key)
      .map((p) => ({
        key: p.key,
        value: p.value,
        description: p.description || '',
      }));

    const headers = req.headers
      .filter((h) => h.enabled && h.key)
      .map((h) => ({
        key: h.key,
        value: h.value,
        description: h.description || '',
      }));

    let bodyObj: any = undefined;
    if (req.body.type === 'json') {
      bodyObj = {
        mode: 'raw',
        raw: req.body.rawJson || '',
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    } else if (req.body.type === 'text') {
      bodyObj = {
        mode: 'raw',
        raw: req.body.rawText || '',
      };
    } else if (req.body.type === 'form-urlencoded') {
      bodyObj = {
        mode: 'urlencoded',
        urlencoded: req.body.formUrlencoded.map((f) => ({
          key: f.key,
          value: f.value,
          description: f.description || '',
        })),
      };
    }

    let authObj: any = undefined;
    if (req.auth.type === 'bearer') {
      authObj = {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: req.auth.bearer?.token || '',
            type: 'string',
          },
        ],
      };
    } else if (req.auth.type === 'basic') {
      authObj = {
        type: 'basic',
        basic: [
          {
            key: 'username',
            value: req.auth.basic?.username || '',
            type: 'string',
          },
          {
            key: 'password',
            value: req.auth.basic?.password || '',
            type: 'string',
          },
        ],
      };
    } else if (req.auth.type === 'apikey') {
      authObj = {
        type: 'apikey',
        apikey: [
          {
            key: 'key',
            value: req.auth.apiKey?.key || '',
            type: 'string',
          },
          {
            key: 'value',
            value: req.auth.apiKey?.value || '',
            type: 'string',
          },
          {
            key: 'where',
            value: req.auth.apiKey?.addTo || 'header',
            type: 'string',
          },
        ],
      };
    }

    return {
      name: t.name,
      request: {
        method: req.method,
        header: headers,
        body: bodyObj,
        url: {
          raw: req.url,
          query: queryParams.length > 0 ? queryParams : undefined,
        },
        auth: authObj,
      },
    };
  });

  return {
    info: {
      _postman_id: generateId(),
      name: collectionName,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'Exported from OpenPost API Client',
    },
    item: items,
  };
}

export function getExportFilename(
  format: ExportFormat,
  scope: 'activeTab' | 'allTabs',
  baseName = 'collection'
): string {
  const safeName = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const scopeSuffix = scope === 'activeTab' ? 'request' : 'collection';

  if (format === 'postman') {
    return `${safeName || 'openpost'}-${scopeSuffix}.postman_collection.json`;
  }
  return `${safeName || 'openpost'}-${scopeSuffix}.openpost.json`;
}
