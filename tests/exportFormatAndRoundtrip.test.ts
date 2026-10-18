import { describe, it, expect } from 'vitest';
import {
  buildOpenPostExport,
  buildPostmanExport,
  getExportFilename,
} from '../src/utils/exporter';
import { convertPostmanCollection } from '../src/utils/postmanConverter';
import { createDefaultRequest } from '../src/stores/requestStore';

describe('Export Format Choices & Importer Round-Trip Engine (Step 1 Item 5)', () => {
  const sampleRequest = createDefaultRequest({
    name: 'Create User Account',
    url: 'https://api.service.com/v1/users?role=admin&api_key=secret-api-key',
    method: 'POST',
    headers: [
      { id: 'h1', key: 'Authorization', value: 'Bearer top-secret-token', enabled: true },
      { id: 'h2', key: 'Content-Type', value: 'application/json', enabled: true },
    ],
    params: [
      { id: 'p1', key: 'role', value: 'admin', enabled: true },
      { id: 'p2', key: 'api_key', value: 'secret-api-key', enabled: true },
    ],
    auth: {
      type: 'bearer',
      bearer: { token: 'super-confidential-token' },
    },
    body: {
      type: 'json',
      rawJson: JSON.stringify({ name: 'Alice', password: 'my-plaintext-password' }),
      rawText: '',
      formUrlencoded: [],
      multipart: [],
    },
  });

  const tabItem = {
    id: sampleRequest.id,
    name: 'Create User Account',
    request: sampleRequest,
  };

  it('excludes secrets by default in OpenPost Native export', () => {
    const exported = buildOpenPostExport([tabItem], true);
    const jsonStr = JSON.stringify(exported);

    expect(exported.openpostFormat).toBe('1.0.0');
    expect(exported.secretsExcluded).toBe(true);

    // Assert sensitive credentials are redacted or removed
    expect(jsonStr).not.toContain('top-secret-token');
    expect(jsonStr).not.toContain('secret-api-key');
    expect(jsonStr).not.toContain('super-confidential-token');
    expect(jsonStr).not.toContain('my-plaintext-password');

    // Assert non-sensitive data remains intact
    expect(jsonStr).toContain('https://api.service.com/v1/users');
    expect(jsonStr).toContain('Content-Type');
    expect(jsonStr).toContain('Create User Account');
  });

  it('excludes secrets by default in Postman v2.1 export', () => {
    const exported = buildPostmanExport([tabItem], true, 'Production API');
    const jsonStr = JSON.stringify(exported);

    expect(exported.info.schema).toContain('collection.json');
    expect(exported.info.name).toBe('Production API');

    // Assert sensitive credentials are redacted or removed
    expect(jsonStr).not.toContain('top-secret-token');
    expect(jsonStr).not.toContain('secret-api-key');
    expect(jsonStr).not.toContain('super-confidential-token');
    expect(jsonStr).not.toContain('my-plaintext-password');

    // Assert endpoint structure is present
    expect(exported.item.length).toBe(1);
    expect(exported.item[0].name).toBe('Create User Account');
    expect(exported.item[0].request.method).toBe('POST');
  });

  it('round-trips OpenPost Native export through convertPostmanCollection importer', () => {
    const exported = buildOpenPostExport([tabItem], false);
    const jsonStr = JSON.stringify(exported);

    const importResult = convertPostmanCollection(jsonStr);
    expect(importResult.error).toBeUndefined();
    expect(importResult.requests.length).toBe(1);
    expect(importResult.requests[0].name).toBe('Create User Account');
    expect(importResult.requests[0].method).toBe('POST');
    expect(importResult.requests[0].url).toContain('https://api.service.com/v1/users');
  });

  it('round-trips Postman v2.1 export through convertPostmanCollection importer', () => {
    const exported = buildPostmanExport([tabItem], false, 'Auth Collection');
    const jsonStr = JSON.stringify(exported);

    const importResult = convertPostmanCollection(jsonStr);
    expect(importResult.error).toBeUndefined();
    expect(importResult.collectionName).toBe('Auth Collection');
    expect(importResult.requests.length).toBe(1);
    expect(importResult.requests[0].name).toBe('Create User Account');
    expect(importResult.requests[0].method).toBe('POST');
    expect(importResult.requests[0].body.type).toBe('json');
  });

  it('generates exact file extension matching selected format', () => {
    const openpostFilename = getExportFilename('openpost', 'allTabs', 'my-api');
    expect(openpostFilename).toBe('my-api-collection.openpost.json');

    const postmanFilename = getExportFilename('postman', 'activeTab', 'create-user');
    expect(postmanFilename).toBe('create-user-request.postman_collection.json');
  });
});
