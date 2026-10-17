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
