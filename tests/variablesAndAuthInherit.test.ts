import { describe, it, expect } from 'vitest';
import {
  mergeVariablesByPrecedence,
  detectVariableCycles,
  resolveInheritedAuth,
  resolveRequestVariables,
} from '../src/utils/variableResolver';
import { HttpRequest, AuthConfig } from '../src/types/http';

describe('Variable Resolution Precedence, Cycle Detection, and Auth Inherit (OP-R2-019)', () => {
  it('enforces variable precedence: request > folder > environment > collection > global', () => {
    const sources = {
      globalVariables: {
        host: 'global.com',
        token: 'global-token',
        region: 'us-east-1',
        shared: 'from-global',
      },
      collectionVariables: {
        host: 'collection.com',
        token: 'col-token',
        shared: 'from-collection',
      },
      environmentVariables: {
        host: 'env.com',
        token: 'env-token',
        shared: 'from-env',
      },
      folderVariables: {
        host: 'folder.com',
        shared: 'from-folder',
      },
      requestVariables: {
        host: 'request.com',
      },
    };

    const merged = mergeVariablesByPrecedence(sources);

    // request overrides all
    expect(merged.host).toBe('request.com');
    // folder overrides env, collection, global
    expect(merged.shared).toBe('from-folder');
    // environment overrides collection and global
    expect(merged.token).toBe('env-token');
    // global preserved where not overridden
    expect(merged.region).toBe('us-east-1');
  });

  it('detects circular variable dependencies and produces cycle chain', () => {
    const cyclicVars = {
      a: 'prefix_{{b}}',
      b: 'mid_{{c}}',
      c: 'end_{{a}}',
    };

    const cycleResult = detectVariableCycles(cyclicVars);
    expect(cycleResult.hasCycle).toBe(true);
    expect(cycleResult.cycleChain).toBeDefined();
    // Chain should trace a cycle back to its start
    expect(cycleResult.cycleChain).toEqual(expect.arrayContaining(['a', 'b', 'c']));

    // Self-reference cycle
    const selfRef = {
      loop: '{{loop}}',
    };
    const selfResult = detectVariableCycles(selfRef);
    expect(selfResult.hasCycle).toBe(true);
    expect(selfResult.cycleChain).toEqual(['loop', 'loop']);
  });

  it('allows non-cyclic diamond dependencies without false positives', () => {
    const diamondVars = {
      base: 'api.example.com',
      serviceA: 'https://{{base}}/a',
      serviceB: 'https://{{base}}/b',
    };

    const result = detectVariableCycles(diamondVars);
    expect(result.hasCycle).toBe(false);
  });

  it('inherits auth from parent collection/folder when auth.type is inherit', () => {
    const parentAuth: AuthConfig = {
      type: 'bearer',
      bearer: { token: 'secret-parent-token' },
    };

    const requestAuthInherit: AuthConfig = {
      type: 'inherit',
    };

    const resolved = resolveInheritedAuth(requestAuthInherit, parentAuth);
    expect(resolved.type).toBe('bearer');
    expect(resolved.bearer?.token).toBe('secret-parent-token');

    // If parent also has no auth, fallback to none
    const emptyResolved = resolveInheritedAuth(requestAuthInherit, undefined);
    expect(emptyResolved.type).toBe('none');

    // Explicit request auth overrides parent
    const explicitAuth: AuthConfig = {
      type: 'basic',
      basic: { username: 'custom', password: 'pwd' },
    };
    const overridden = resolveInheritedAuth(explicitAuth, parentAuth);
    expect(overridden.type).toBe('basic');
    expect(overridden.basic?.username).toBe('custom');
  });

  it('resolves variables across the entire request including inherited auth with template tokens', () => {
    const parentAuth: AuthConfig = {
      type: 'bearer',
      bearer: { token: 'Bearer-{{authToken}}' },
    };

    const baseRequest: HttpRequest = {
      id: 'req-1',
      name: 'Get User Profile',
      method: 'GET',
      url: 'https://{{domain}}/v1/users/{{userId}}',
      params: [{ id: 'p1', key: 'fields', value: '{{fields}}', enabled: true }],
      headers: [{ id: 'h1', key: 'X-Tenant', value: '{{tenant}}', enabled: true }],
      body: {
        type: 'json',
        rawJson: '{\n  "clientId": "{{tenant}}"\n}',
      },
      auth: {
        type: 'inherit',
      },
    };

    const variables = {
      domain: 'api.openpost.dev',
      userId: '42',
      fields: 'name,email',
      tenant: 'acme-corp',
      authToken: 'token-xyz-123',
    };

    const result = resolveRequestVariables(baseRequest, variables, parentAuth);

    expect(result.hasCycle).toBe(false);
    expect(result.undefinedVars).toEqual([]);
    expect(result.resolvedRequest.url).toBe('https://api.openpost.dev/v1/users/42');
    expect(result.resolvedRequest.params[0].value).toBe('name,email');
    expect(result.resolvedRequest.headers[0].value).toBe('acme-corp');
    expect(result.resolvedRequest.body.rawJson).toContain('"acme-corp"');
    expect(result.resolvedRequest.auth.type).toBe('bearer');
    expect(result.resolvedRequest.auth.bearer?.token).toBe('Bearer-token-xyz-123');

    // Original request remains untouched
    expect(baseRequest.auth.type).toBe('inherit');
  });

  it('aborts with hasCycle when circular reference exists during request resolution', () => {
    const baseRequest: HttpRequest = {
      id: 'req-2',
      name: 'Loop Request',
      method: 'GET',
      url: 'https://example.com/{{a}}',
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: { type: 'none' },
    };

    const cyclicVars = {
      a: '{{b}}',
      b: '{{a}}',
    };

    const result = resolveRequestVariables(baseRequest, cyclicVars);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleChain).toBeDefined();
  });
});
