# OpenPost Error Codes Reference

All error and warning messages in OpenPost use standardized, searchable error codes.

---

## Network & Connectivity (`OP-NET-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-NET-001` | **DNS Resolution Failed** | Domain name could not be resolved to an IP address. | Check domain spelling, network connection, or local DNS server. |
| `OP-NET-002` | **Connection Refused** | Remote host actively rejected the TCP connection. | Verify that the target server is running and listening on the designated port. |
| `OP-NET-003` | **Request Timed Out** | Server failed to respond within the configured timeout window. | Increase timeout in request Settings tab or check server health. |
| `OP-NET-004` | **Request Cancelled** | In-flight request was terminated by the user. | Click Send or press `Ctrl+Enter` to re-execute. |
| `OP-NET-005` | **Too Many Redirects** | Request exceeded redirect limit or encountered an infinite redirect loop. | Inspect the destination URL or disable "Follow Redirects" in Settings. |
| `OP-NET-999` | **Network Communication Error** | Unclassified network layer or proxy error. | Check network connectivity, proxy settings, and retry. |

---

## SSL & Security (`OP-SSL-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-SSL-001` | **SSL Certificate Validation Failed** | Server TLS certificate was self-signed, expired, or failed hostname validation. | For local/dev servers, disable SSL verification in the Settings tab using the one-click action. |

---

## URL & Input Validation (`OP-URL-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-URL-001` | **Missing URL Protocol** | URL lacks an explicit scheme (`http://` or `https://`). | Auto-suggests or prepends `https://`. |
| `OP-URL-002` | **Empty URL** | Send action was triggered with an empty URL. | Enter a valid target endpoint. Send button is disabled until entered. |
| `OP-URL-003` | **Unsupported Protocol Scheme** | URL uses an unsupported protocol (e.g., `ftp://`, `file://`). | Only `http://` and `https://` schemes are supported. |

---

## Request Body (`OP-BODY-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-BODY-001` | **Invalid JSON Body** | Syntax error in JSON payload (missing quote, trailing comma, unclosed bracket). | Inspect the indicated line and column in the editor or click Prettify. |

---

## Response Processing (`OP-RES-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-RES-001` | **Large Response Payload** | Response exceeds 2MB performance threshold. | Preview is truncated to the first 100KB to prevent UI lag. Use "Copy Full" or "Save to File". |

---

## Variables & Environments (`OP-VAR-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-VAR-001` | **Undefined Variables Detected** | Request contains `{{variable}}` reference not defined in active environment or globals. | Check variable definitions in the Environment manager. |

---

## System & Application (`OP-SYS-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-SYS-001` | **Application Render Error** | Unhandled React component exception caught by ErrorBoundary. | Click "Reload Application" to recover. Diagnostic report is sanitized. |

---

## Import & Converter (`OP-IMP-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-IMP-001` | **Empty Import Data** | Provided import string or file contains no data. | Paste valid cURL command or select a non-empty Postman / OpenPost JSON file. |
| `OP-IMP-002` | **Malformed Import JSON** | Syntax error in import JSON file. | Check JSON syntax or re-export from source application. |
| `OP-IMP-003` | **Invalid Collection Format** | File is valid JSON but does not match Postman or OpenPost schemas. | Ensure file is a Postman v2.0/v2.1 collection or OpenPost export. |
| `OP-IMP-004` | **Unsupported Schema Version** | Schema version is newer or incompatible with current OpenPost release. | Update OpenPost or export using a supported format. |
| `OP-IMP-005` | **Oversized Import File** | Collection file exceeds the 10MB safety threshold. | Split large collections into smaller modular files before importing. |

---

## Storage & Workspace Safety (`OP-SAFE-xxx` & `OP-FS-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-SAFE-001` | **Unsaved Tab Discard Warning** | Attempted to close a modified tab with unsaved edits. | Click "Save" to keep changes, "Don't Save" to discard, or "Cancel" to return. |
| `OP-SAFE-002` | **Storage Write Failure / Corrupted Draft Recovery** | Disk write failed or draft was corrupt and recovered from `.bak` backup. In-memory tabs preserved. | Check disk space/permissions. All active tabs remain safe in memory. |
| `OP-SAFE-003` | **Undo Notification** | A tab or history item was removed with an interactive undo grace period. | Click "Undo" toast action to immediately restore the closed item. |
| `OP-SAFE-004` | **File Changed on Disk** | Drafts file was externally updated by another process. | Click "Reload from Disk" toast prompt to refresh workspace safely. |
| `OP-FS-001` | **Read-Only Directory / Access Denied** | Storage folder or draft file is read-only or lacks write permission. | Clear read-only attribute or make destination writable. In-memory tabs preserved. |

---

## Credentials & Keychain Security (`OP-SEC-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-SEC-002` | **OS Secure Keychain Unavailable** | OS credential storage daemon is unavailable or access was denied. | Secrets are maintained strictly in-memory for the current session and never written to disk. |

---

## Request History (`OP-HIST-xxx`)

| Code | Title | Description | Recommended User Action |
| :--- | :--- | :--- | :--- |
| `OP-HIST-001` | **History Clear Failed** | History clear failed due to locked database, permission denial, or IPC refusal. Existing history entries remain safe and unchanged. | Retry clearing history or verify database file permissions on `history.db`. |
| `OP-HIST-002` | **History Deletion Failed** | Deleting individual history entry failed due to database or IPC error. In-memory history remains unchanged. | Retry deleting the entry or check database file permissions on `history.db`. |


