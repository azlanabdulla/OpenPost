export interface JsonValidationResult {
  isValid: boolean;
  errorMessage?: string;
  line?: number;
  column?: number;
}

/**
 * Validates JSON text and extracts line and column position of any syntax error.
 */
export function validateJsonString(input: string): JsonValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: true };
  }

  try {
    JSON.parse(trimmed);
    return { isValid: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Extract line and column numbers from V8 / standard engine error messages:
    // e.g. "Unexpected token '}' at line 3 column 5 of the JSON data"
    // or "... at position 42"
    let line: number | undefined;
    let column: number | undefined;

    const lineColMatch = errorMsg.match(/line (\d+).*?column (\d+)/i);
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } else {
      const posMatch = errorMsg.match(/position (\d+)/i);
      if (posMatch) {
        const position = parseInt(posMatch[1], 10);
        // Calculate line and col from byte offset
        const lines = trimmed.slice(0, position).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
    }

    return {
      isValid: false,
      errorMessage: errorMsg.replace(/^JSON\.parse:\s*/, ''),
      line,
      column,
    };
  }
}
