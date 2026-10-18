import { HttpRequest, AuthConfig } from '../types/http';

/**
 * Variable resolver with precedence resolution, cycle detection, and auth inheritance.
 * Precedence hierarchy (OP-R2-019):
 * Request > Folder > Environment > Collection > Global
 */

const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

export interface VariableResolutionResult {
  resolved: string;
  undefinedVars: string[];
  hasCycle: boolean;
  cycleChain?: string[];
}

/**
 * Extracts all unique {{variableName}} tokens from an input string.
 */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

/**
 * Detects cyclic dependencies within a variable dictionary using DFS.
 * E.g., { a: "{{b}}", b: "{{a}}" } -> cycleChain: ["a", "b", "a"]
 */
export function detectVariableCycles(variables: Record<string, string>): {
  hasCycle: boolean;
  cycleChain?: string[];
} {
  const visited = new Set<string>();
  const recStack: string[] = [];

  function dfs(varName: string): string[] | null {
    visited.add(varName);
    recStack.push(varName);

    const val = variables[varName];
    if (val && typeof val === 'string') {
      const referencedVars = extractVariables(val);
      for (const ref of referencedVars) {
        if (!visited.has(ref)) {
          if (ref in variables) {
            const cycle = dfs(ref);
            if (cycle) return cycle;
          }
        } else if (recStack.includes(ref)) {
          return [...recStack, ref];
        }
      }
    }

    recStack.pop();
    return null;
  }

  for (const varName of Object.keys(variables)) {
    if (!visited.has(varName)) {
      const cycle = dfs(varName);
      if (cycle) {
        const cycleTarget = cycle[cycle.length - 1];
        const startIdx = cycle.indexOf(cycleTarget);
        return {
          hasCycle: true,
          cycleChain: cycle.slice(startIdx),
        };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Resolves variables with recursive resolution and cycle detection.
 * Max recursion depth of 10 to prevent infinite loops.
 */
export function resolveVariables(
  text: string,
  variables: Record<string, string>,
  maxDepth = 10,
  visitedStack: string[] = []
): VariableResolutionResult {
  if (!text) {
    return { resolved: text, undefinedVars: [], hasCycle: false };
  }

  const undefinedVars = new Set<string>();
  let currentText = text;
  let hasCycle = false;
  let cycleChain: string[] | undefined;
  const activePath = [...visitedStack];

  for (let depth = 0; depth < maxDepth; depth++) {
    const tokens = extractVariables(currentText);
    if (tokens.length === 0) break;

    let substitutedInPass = false;

    for (const token of tokens) {
      if (activePath.includes(token)) {
        hasCycle = true;
        cycleChain = [...activePath, token];
        break;
      }

      if (token in variables) {
        const val = variables[token];
        currentText = currentText.replaceAll(`{{${token}}}`, val ?? '');
        substitutedInPass = true;
        activePath.push(token);
      } else {
        undefinedVars.add(token);
      }
    }

    if (hasCycle || !substitutedInPass) {
      break;
    }
  }

  return {
    resolved: currentText,
    undefinedVars: Array.from(undefinedVars),
    hasCycle,
    cycleChain,
  };
}

/**
 * Scans an entire HttpRequest for undefined {{variable}} tokens across URL, headers, and body.
 */
export function scanRequestForUndefinedVariables(
  request: {
    url: string;
    params?: Array<{ key: string; value: string; enabled?: boolean }>;
    headers?: Array<{ key: string; value: string; enabled?: boolean }>;
    body?: {
      rawJson?: string;
      rawText?: string;
      formUrlencoded?: Array<{ key: string; value: string; enabled?: boolean }>;
    };
    auth?: AuthConfig;
  },
  knownVariables: Record<string, string> = {}
): string[] {
  const missing = new Set<string>();

  const check = (str: string | undefined) => {
    if (!str) return;
    const tokens = extractVariables(str);
    for (const t of tokens) {
      if (!(t in knownVariables) || knownVariables[t] === undefined) {
        missing.add(t);
      }
    }
  };

  // 1. URL
  check(request.url);

  // 2. Query Params
  if (Array.isArray(request.params)) {
    for (const p of request.params) {
      if (p.enabled !== false) {
        check(p.key);
        check(p.value);
      }
    }
  }

  // 3. Headers
  if (Array.isArray(request.headers)) {
    for (const h of request.headers) {
      if (h.enabled !== false) {
        check(h.key);
        check(h.value);
      }
    }
  }

  // 4. Body
  if (request.body?.rawJson) {
    check(request.body.rawJson);
  }
  if (request.body?.rawText) {
    check(request.body.rawText);
  }
  if (Array.isArray(request.body?.formUrlencoded)) {
    for (const f of request.body.formUrlencoded) {
      if (f.enabled !== false) {
        check(f.key);
        check(f.value);
      }
    }
  }

  // 5. Auth
  if (request.auth) {
    if (request.auth.type === 'bearer' && request.auth.bearer?.token) {
      check(request.auth.bearer.token);
    } else if (request.auth.type === 'basic' && request.auth.basic) {
      check(request.auth.basic.username);
      check(request.auth.basic.password);
    } else if (request.auth.type === 'apikey' && request.auth.apiKey) {
      check(request.auth.apiKey.key);
      check(request.auth.apiKey.value);
    }
  }

  return Array.from(missing);
}

export interface VariableSources {
  globalVariables?: Record<string, string>;
  collectionVariables?: Record<string, string>;
  environmentVariables?: Record<string, string>;
  folderVariables?: Record<string, string>;
  requestVariables?: Record<string, string>;
}

/**
 * Merges variables following the strict precedence hierarchy:
 * request > folder > environment > collection > global (OP-R2-019)
 */
export function mergeVariablesByPrecedence(sources: VariableSources): Record<string, string> {
  return {
    ...(sources.globalVariables || {}),
    ...(sources.collectionVariables || {}),
    ...(sources.environmentVariables || {}),
    ...(sources.folderVariables || {}),
    ...(sources.requestVariables || {}),
  };
}

/**
 * Resolves inherited authentication for a request from a parent collection or folder.
 */
export function resolveInheritedAuth(
  requestAuth?: AuthConfig,
  parentAuth?: AuthConfig
): AuthConfig {
  if (!requestAuth || requestAuth.type === 'inherit') {
    if (parentAuth && parentAuth.type !== 'inherit') {
      return JSON.parse(JSON.stringify(parentAuth));
    }
    return { type: 'none' };
  }
  return JSON.parse(JSON.stringify(requestAuth));
}

export interface RequestResolutionResult {
  resolvedRequest: HttpRequest;
  undefinedVars: string[];
  hasCycle: boolean;
  cycleChain?: string[];
}

/**
 * Resolves all variables in an HttpRequest (URL, headers, query params, body, and auth),
 * resolving inherited auth if necessary, and detecting cycles.
 */
export function resolveRequestVariables(
  request: HttpRequest,
  variables: Record<string, string>,
  parentAuth?: AuthConfig
): RequestResolutionResult {
  // Check for circular variable definitions in the dictionary
  const cycleCheck = detectVariableCycles(variables);
  if (cycleCheck.hasCycle) {
    return {
      resolvedRequest: request,
      undefinedVars: [],
      hasCycle: true,
      cycleChain: cycleCheck.cycleChain,
    };
  }

  const undefinedSet = new Set<string>();

  const resolveField = (val: string | undefined): string => {
    if (!val) return '';
    const res = resolveVariables(val, variables);
    if (res.hasCycle) {
      throw { hasCycle: true, cycleChain: res.cycleChain };
    }
    for (const u of res.undefinedVars) {
      undefinedSet.add(u);
    }
    return res.resolved;
  };

  try {
    // 1. Resolve Auth (Inherit if needed, then resolve variable expressions in credentials)
    const effectiveAuth = resolveInheritedAuth(request.auth, parentAuth);
    if (effectiveAuth.type === 'bearer' && effectiveAuth.bearer) {
      effectiveAuth.bearer.token = resolveField(effectiveAuth.bearer.token);
    } else if (effectiveAuth.type === 'basic' && effectiveAuth.basic) {
      effectiveAuth.basic.username = resolveField(effectiveAuth.basic.username);
      effectiveAuth.basic.password = resolveField(effectiveAuth.basic.password);
    } else if (effectiveAuth.type === 'apikey' && effectiveAuth.apiKey) {
      effectiveAuth.apiKey.key = resolveField(effectiveAuth.apiKey.key);
      effectiveAuth.apiKey.value = resolveField(effectiveAuth.apiKey.value);
    }

    // 2. Resolve URL
    const resolvedUrl = resolveField(request.url);

    // 3. Resolve Query Params
    const resolvedParams = (request.params || []).map((p) => {
      if (!p.enabled) return { ...p };
      return {
        ...p,
        key: resolveField(p.key),
        value: resolveField(p.value),
      };
    });

    // 4. Resolve Headers
    const resolvedHeaders = (request.headers || []).map((h) => {
      if (!h.enabled) return { ...h };
      return {
        ...h,
        key: resolveField(h.key),
        value: resolveField(h.value),
      };
    });

    // 5. Resolve Body
    const resolvedBody = { ...request.body };
    if (resolvedBody.rawJson) {
      resolvedBody.rawJson = resolveField(resolvedBody.rawJson);
    }
    if (resolvedBody.rawText) {
      resolvedBody.rawText = resolveField(resolvedBody.rawText);
    }
    if (Array.isArray(resolvedBody.formUrlencoded)) {
      resolvedBody.formUrlencoded = resolvedBody.formUrlencoded.map((f) => {
        if (!f.enabled) return { ...f };
        return {
          ...f,
          key: resolveField(f.key),
          value: resolveField(f.value),
        };
      });
    }

    const resolvedRequest: HttpRequest = {
      ...request,
      url: resolvedUrl,
      params: resolvedParams,
      headers: resolvedHeaders,
      body: resolvedBody,
      auth: effectiveAuth,
    };

    return {
      resolvedRequest,
      undefinedVars: Array.from(undefinedSet),
      hasCycle: false,
    };
  } catch (err: any) {
    if (err && err.hasCycle) {
      return {
        resolvedRequest: request,
        undefinedVars: Array.from(undefinedSet),
        hasCycle: true,
        cycleChain: err.cycleChain,
      };
    }
    throw err;
  }
}
