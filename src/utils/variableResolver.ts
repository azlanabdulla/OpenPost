/**
 * Variable resolver with precedence resolution and cycle detection.
 * Precedence hierarchy:
 * Request Params > Folder Variables > Collection Variables > Environment Variables > Global Variables
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

  for (let depth = 0; depth < maxDepth; depth++) {
    const tokens = extractVariables(currentText);
    if (tokens.length === 0) break;

    let substitutedInPass = false;

    for (const token of tokens) {
      if (visitedStack.includes(token)) {
        hasCycle = true;
        cycleChain = [...visitedStack, token];
        break;
      }

      if (token in variables) {
        const val = variables[token];
        currentText = currentText.replaceAll(`{{${token}}}`, val);
        substitutedInPass = true;
        visitedStack.push(token);
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
    body?: { rawJson?: string; rawText?: string };
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
 * request > folder > environment > collection > global
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

