export interface AppMessage {
  code: string;
  title: string;
  message: string;
  likelyCause: string;
  actionText: string;
}

export const APP_MESSAGES = {
  // Network & HTTP Errors
  NET_DNS_FAILURE: {
    code: 'OP-NET-001',
    title: 'DNS Resolution Failed',
    message: 'Could not resolve the domain name to an IP address.',
    likelyCause: 'The domain does not exist, has a typo, or your DNS server is unreachable.',
    actionText: 'Check the domain name spelling or verify your network connection.',
  },
  NET_CONNECTION_REFUSED: {
    code: 'OP-NET-002',
    title: 'Connection Refused',
    message: 'The target server refused the connection.',
    likelyCause: 'No service is listening on the specified port, or a firewall is blocking the connection.',
    actionText: 'Ensure the local or remote server is running and the port is correct.',
  },
  NET_TIMEOUT: {
    code: 'OP-NET-003',
    title: 'Request Timed Out',
    message: 'The server did not respond within the configured timeout window.',
    likelyCause: 'The server is overloaded, experiencing latency, or waiting for additional data.',
    actionText: 'Increase the timeout setting in the Settings tab or try again later.',
  },
  NET_CANCELLED: {
    code: 'OP-NET-004',
    title: 'Request Cancelled',
    message: 'The in-flight request was cancelled by the user.',
    likelyCause: 'You clicked Cancel or pressed the cancel shortcut before the response completed.',
    actionText: 'Click Send or press Ctrl+Enter to re-send the request.',
  },
  NET_REDIRECT_LOOP: {
    code: 'OP-NET-005',
    title: 'Too Many Redirects',
    message: 'The request exceeded the maximum number of redirects or encountered a redirect loop.',
    likelyCause: 'The server redirected in an infinite loop or exceeded the maximum allowed hops.',
    actionText: 'Inspect the URL or disable "Follow Redirects" in Settings.',
  },
  NET_GENERIC: {
    code: 'OP-NET-999',
    title: 'Network Communication Error',
    message: 'An unexpected network error occurred while communicating with the remote server.',
    likelyCause: 'Network connection dropped, proxy error, or invalid TCP packet exchange.',
    actionText: 'Verify your network connection and retry.',
  },

  // SSL & Security Errors
  SSL_CERTIFICATE_ERROR: {
    code: 'OP-SSL-001',
    title: 'SSL Certificate Validation Failed',
    message: 'The SSL/TLS certificate provided by the server could not be verified.',
    likelyCause: 'Self-signed certificate, expired certificate, untrusted CA, or hostname mismatch.',
    actionText: 'Disable SSL verification for this request in Settings if connecting to a local/dev service.',
  },

  // URL & Input Validation Errors
  URL_MISSING_PROTOCOL: {
    code: 'OP-URL-001',
    title: 'Missing URL Protocol',
    message: 'The URL does not specify a protocol scheme (http:// or https://).',
    likelyCause: 'You entered a bare host name without http:// or https://.',
    actionText: 'OpenPost has auto-suggested https:// for this URL.',
  },
  URL_EMPTY: {
    code: 'OP-URL-002',
    title: 'Empty URL',
    message: 'Cannot execute a request without a URL destination.',
    likelyCause: 'The URL input bar is blank.',
    actionText: 'Enter a valid API URL endpoint to send a request.',
  },
  URL_UNSUPPORTED_SCHEME: {
    code: 'OP-URL-003',
    title: 'Unsupported Protocol Scheme',
    message: 'Only http:// and https:// protocol schemes are supported.',
    likelyCause: 'The URL uses a non-HTTP scheme like ftp:// or file://.',
    actionText: 'Update the URL to use http:// or https://.',
  },

  // Body & Payload Validation
  BODY_INVALID_JSON: {
    code: 'OP-BODY-001',
    title: 'Invalid JSON Body',
    message: 'The request body contains syntax errors that prevent valid JSON serialization.',
    likelyCause: 'Missing quotation mark, trailing comma, or unbalanced bracket in the JSON editor.',
    actionText: 'Inspect the line and column indicated in the editor, or click Prettify to reformat.',
  },

  // Response Processing
  RES_LARGE_PAYLOAD: {
    code: 'OP-RES-001',
    title: 'Large Response Payload',
    message: 'The response body exceeds the recommended interactive editor threshold.',
    likelyCause: 'The server returned a large dataset or binary file (>2MB).',
    actionText: 'Preview has been truncated to maintain editor performance. You can copy the full response or save it to a file.',
  },

  // Variables
  VAR_UNRESOLVED: {
    code: 'OP-VAR-001',
    title: 'Undefined Variables Detected',
    message: 'One or more {{variable}} references in your request do not have a defined value.',
    likelyCause: 'Typo in variable name or the active environment does not define this key.',
    actionText: 'Check variable definitions in the Environment manager.',
  },

  // System & Application
  SYS_CRASH: {
    code: 'OP-SYS-001',
    title: 'Application Render Error',
    message: 'An unexpected interface exception occurred.',
    likelyCause: 'A component encountered an unhandled state or corrupted data structure.',
    actionText: 'Click Reload Application to restore state. Diagnostic details have been sanitized.',
  },

  // Import & Converter
  IMP_EMPTY_DATA: {
    code: 'OP-IMP-001',
    title: 'Empty Import Data',
    message: 'The provided import input contains no data.',
    likelyCause: 'Empty clipboard or blank file selected.',
    actionText: 'Paste a valid cURL command or select a non-empty Postman or OpenPost JSON file.',
  },
  IMP_MALFORMED_JSON: {
    code: 'OP-IMP-002',
    title: 'Malformed Import JSON',
    message: 'The import file contains invalid JSON syntax.',
    likelyCause: 'Syntax error, unclosed bracket, or truncated file content.',
    actionText: 'Verify the file content is valid JSON and retry.',
  },
  IMP_INVALID_FORMAT: {
    code: 'OP-IMP-003',
    title: 'Invalid Collection Format',
    message: 'The file is valid JSON but does not match expected collection schemas.',
    likelyCause: 'File is not a Postman v2.0/v2.1 collection or OpenPost export.',
    actionText: 'Ensure the file contains valid Postman or OpenPost collection structures.',
  },
  IMP_UNSUPPORTED_VERSION: {
    code: 'OP-IMP-004',
    title: 'Unsupported Schema Version',
    message: 'The collection schema version is not supported by this version of OpenPost.',
    likelyCause: 'The collection was exported from a newer or incompatible schema.',
    actionText: 'Update OpenPost or export using a supported format.',
  },
  IMP_FILE_SIZE_EXCEEDED: {
    code: 'OP-IMP-005',
    title: 'Oversized Import File',
    message: 'The collection file exceeds the 10MB safety threshold.',
    likelyCause: 'The imported file contains very large inline payloads.',
    actionText: 'Split the collection into smaller files before importing.',
  },

  // Storage & Workspace Safety
  SAFE_UNSAVED_TAB: {
    code: 'OP-SAFE-001',
    title: 'Unsaved Tab Discard Warning',
    message: 'This tab contains unsaved modifications that will be lost.',
    likelyCause: 'Closing a dirty tab without saving.',
    actionText: 'Save to a collection or discard changes.',
  },
  SAFE_CORRUPT_DRAFT_RECOVERED: {
    code: 'OP-SAFE-002',
    title: 'Corrupted Draft Recovered',
    message: 'The workspace draft was corrupted and automatically recovered from backup.',
    likelyCause: 'Abrupt OS shutdown or unexpected file termination.',
    actionText: 'Your tabs have been restored from the most recent safe state.',
  },
  SAFE_UNDO_ACTION: {
    code: 'OP-SAFE-003',
    title: 'Undo Available',
    message: 'The item was deleted and can be restored.',
    likelyCause: 'Item removed from workspace.',
    actionText: 'Click Undo to restore the item.',
  },
  SAFE_EXTERNAL_MODIFICATION: {
    code: 'OP-SAFE-004',
    title: 'File Changed on Disk',
    message: 'Workspace drafts were modified externally by another process.',
    likelyCause: 'Another OpenPost instance or file editor modified the drafts file.',
    actionText: 'Click Reload from Disk to refresh state safely.',
  },
  FS_READONLY: {
    code: 'OP-FS-001',
    title: 'Read-Only Storage Detected',
    message: 'Destination folder or drafts file has read-only permissions.',
    likelyCause: 'Folder is locked, mounted read-only, or lacks write permissions.',
    actionText: 'Make folder writable or save to an alternate location. Tabs remain safe in memory.',
  },

  // Security & Keychain
  SEC_KEYCHAIN_UNAVAILABLE: {
    code: 'OP-SEC-002',
    title: 'OS Secure Keychain Unavailable',
    message: 'The OS credential manager is unavailable or denied access.',
    likelyCause: 'Headless environment, sandbox restrictions, or missing keyring daemon.',
    actionText: 'Credentials will remain in-memory for this session only and will not be saved to disk.',
  },
} as const;

/**
 * Common HTTP status code guidance for developer UX.
 */
export const HTTP_STATUS_HINTS: Record<number, { title: string; hint: string }> = {
  400: {
    title: 'Bad Request',
    hint: 'The server could not understand the request due to invalid syntax, headers, or body.',
  },
  401: {
    title: 'Unauthorized',
    hint: 'Authentication is required. Check your Bearer token, Basic Auth, or API Key in the Auth tab.',
  },
  403: {
    title: 'Forbidden',
    hint: 'The server understood the request, but your credentials do not have permission to access this resource.',
  },
  404: {
    title: 'Not Found',
    hint: 'The server could not find the requested URL endpoint. Check path segments and query parameters.',
  },
  405: {
    title: 'Method Not Allowed',
    hint: 'The resource does not support this HTTP method. Check if GET, POST, or PUT is expected.',
  },
  408: {
    title: 'Request Timeout',
    hint: 'The server timed out waiting for the complete request to be sent.',
  },
  429: {
    title: 'Too Many Requests',
    hint: 'Rate limit exceeded. Check the response Headers tab for Retry-After or X-RateLimit headers.',
  },
  500: {
    title: 'Internal Server Error',
    hint: 'The remote server encountered an unhandled exception or crash while processing your request.',
  },
  502: {
    title: 'Bad Gateway',
    hint: 'The server, while acting as a gateway or proxy, received an invalid response from the upstream server.',
  },
  503: {
    title: 'Service Unavailable',
    hint: 'The server is currently unable to handle the request due to temporary overloading or maintenance.',
  },
  504: {
    title: 'Gateway Timeout',
    hint: 'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.',
  },
};
