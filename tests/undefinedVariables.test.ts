import { describe, it, expect } from 'vitest';
import {
  extractVariables,
  scanRequestForUndefinedVariables,
  resolveVariables,
} from '../src/utils/variableResolver';

describe('Undefined Variables Pre-Send Engine (OP-R2-002 / OP-AUDIT-008)', () => {
  it('extracts unique template variables from string', () => {
    const text = 'https://api.example.com/{{version}}/users/{{userId}}/orders/{{userId}}';
    const tokens = extractVariables(text);
    expect(tokens).toEqual(['version', 'userId']);
  });

  it('detects undefined variables across URL, params, headers, and body', () => {
    const request = {
      url: 'https://api.example.com/v1/{{entity}}/{{id}}',
      params: [{ key: 'filter', value: '{{filterVal}}', enabled: true }],
      headers: [{ key: 'X-Tenant-Id', value: '{{tenantId}}', enabled: true }],
      body: {
        rawJson: '{\n  "role": "{{userRole}}",\n  "company": "{{companyName}}"\n}',
      },
    };

    const knownVariables = {
      entity: 'customers',
      tenantId: 'tenant-123',
    };

    const missing = scanRequestForUndefinedVariables(request, knownVariables);

    expect(missing).toContain('id');
    expect(missing).toContain('filterVal');
    expect(missing).toContain('userRole');
    expect(missing).toContain('companyName');
    expect(missing).not.toContain('entity');
    expect(missing).not.toContain('tenantId');
  });

  it('ignores disabled params and disabled headers when scanning for variables', () => {
    const request = {
      url: 'https://api.example.com/v1/orders',
      params: [{ key: 'disabledKey', value: '{{unusedParam}}', enabled: false }],
      headers: [{ key: 'X-Disabled', value: '{{unusedHeader}}', enabled: false }],
    };

    const missing = scanRequestForUndefinedVariables(request, {});
    expect(missing).toEqual([]);
  });

  it('detects cyclic variable references and avoids infinite loops', () => {
    const variables = {
      a: '{{b}}',
      b: '{{c}}',
      c: '{{a}}', // cycle: a -> b -> c -> a
    };

    const result = resolveVariables('Value is: {{a}}', variables);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleChain).toBeDefined();
  });

  it('enforces variable precedence: request > folder > environment > collection > global', async () => {
    const { mergeVariablesByPrecedence } = await import('../src/utils/variableResolver');
    const merged = mergeVariablesByPrecedence({
      globalVariables: { host: 'global.com', token: 'global-token', apiVersion: 'v1' },
      collectionVariables: { host: 'collection.com', token: 'col-token' },
      environmentVariables: { host: 'env.com', token: 'env-token' },
      folderVariables: { host: 'folder.com' },
      requestVariables: { host: 'request.com' },
    });

    expect(merged.host).toBe('request.com'); // request wins over all
    expect(merged.token).toBe('env-token'); // environment wins over collection & global
    expect(merged.apiVersion).toBe('v1'); // global fallback preserved
  });
});
