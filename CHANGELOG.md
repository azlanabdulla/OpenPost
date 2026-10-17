# Changelog

All notable changes to OpenPost will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-10-17

### Added
- **Request Builder**:
  - Full support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
  - Live bidirectional synchronization between URL query string and Params table.
  - Multi-tab request management with dirty state tracking (`●`) and close confirmation dialog.
  - Body editor with sub-types: None, raw JSON (with live syntax check & line/col pointer), raw text, x-www-form-urlencoded, multipart form-data.
  - Auth helpers: Bearer Token, Basic Auth, API Key (Header or Query), with secret masking eye toggle.
  - Common header presets (`+Accept`, `+Content-Type`, `+User-Agent`, `+Cache-Control`).
  - Keyboard shortcuts: `Ctrl/Cmd+Enter` to send, `Ctrl/Cmd+T` for new tab, `Ctrl/Cmd+W` to close tab.
- **Response Viewer**:
  - Status code badge, response duration (ms), and body size calculation.
  - Pretty JSON display with CodeMirror 6 syntax highlighting and line numbers.
  - Raw body inspector and Headers table.
  - Copy to clipboard and Save response to file (`.json`/`.txt`).
  - Large response safety guard (>2MB) with truncated preview and "Show Full Response" toggle.
  - Contextual status hint banners for 401, 403, 404, 429, and 500/502/503.
- **Desktop Backend (Tauri 2 + Rust `reqwest`)**:
  - Zero-CORS request execution engine.
  - High-precision timing calculation and byte size measurements.
  - Per-request SSL verification toggle (`danger_accept_invalid_certs`) with one-click retry in UI.
  - Sensitive header masking: strict rule never to log `Authorization`, `Cookie`, or API keys.
- **Reliability, Error Handling & Security Audit**:
  - Top-level React `ErrorBoundary` with reload button, sanitized crash diagnostics, and GitHub issue link.
  - Centralized message catalog in `src/messages.ts` and error codes in `docs/ERROR_CODES.md`.
  - Accessible `Modal` component with focus trapping, `Escape` key dismissal, and backdrop click handler.
  - Centralized accessible `ToastContainer` with stacking limit (max 3) and auto-dismiss.
  - URL normalization: auto-suggests or prepends `https://` when scheme is omitted.
  - Empty URL validation: Send button disabled with tooltip when URL input is blank.
  - Neutral request cancellation display with "Send Again" button.
  - Unsaved tab confirmation modal preventing accidental data loss on close.
  - LocalStorage draft persistence restoring active tabs on app reload.
  - Security sanitizer scrubbing credentials from error logs and URLs.
  - Accessibility: `aria-label`s on all icon buttons and standardized focus-visible rings.
