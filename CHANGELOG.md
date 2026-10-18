# Changelog

All notable changes to OpenPost will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-10-18

### Added
- **Request Builder**:
  - Full support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
  - Live bidirectional synchronization between URL query string and Params table.
  - Multi-tab request management with dirty state tracking (`●`) and 3-action tab close confirmation dialog (`Save`, `Don't Save`, `Cancel`).
  - Body editor with sub-types: None, raw JSON (with live syntax check & line/col pointer), raw text, x-www-form-urlencoded, multipart form-data.
  - Auth helpers: Bearer Token, Basic Auth, API Key (Header or Query), and **Auth Inheritance** from parent collections/folders with secret masking.
  - Per-request timeout numeric text input (`inputmode="numeric"`) with inline boundary validation (100 to 600,000 ms) and automatic default fallback (30,000 ms).
  - Per-request SSL verification toggle (`danger_accept_invalid_certs`) with one-click retry in UI.
  - Common header presets (`+Accept`, `+Content-Type`, `+User-Agent`, `+Cache-Control`).
  - Keyboard shortcuts: `Ctrl/Cmd+Enter` to send, `Ctrl/Cmd+T` for new tab, `Ctrl/Cmd+W` to close tab, `Ctrl/Cmd+K` for command palette.
- **Variable Precedence & Template Engine (OP-R2-019)**:
  - Strict 5-tier precedence hierarchy: `request > folder > environment > collection > global`.
  - Circular variable reference cycle detection (`OP-VAR-002`) preventing infinite loops and reporting cycle chains.
  - Pre-send warning for undefined `{{variables}}` with "Send anyway" and "Cancel" actions.
  - Variable substitution in URL, params, headers, payload body, and auth credentials.
- **Response Viewer & Binary Inspection**:
  - Real-time status code badge, response duration (ms), and body size calculation.
  - Syntax-highlighted JSON pretty-printing with CodeMirror 6 and code folding.
  - Binary response inspection: visual preview for image responses (PNG, JPEG, SVG, WebP) and direct binary download.
  - Transparent GZIP, Brotli, and Deflate decompression.
  - Dedicated multi-Set-Cookie inspector tab.
  - Sandboxed HTML preview iframe (`sandbox=""` with strict CSP meta tag).
  - Large response safety guard (>5MB) with truncated preview and full download capability.
  - Contextual hints for common HTTP status codes (401, 403, 404, 429, 500, etc.).
- **Local Persistence & History (SQLite)**:
  - Local SQLite database (`history.db`) for persistent request and response logging with automatic secret scrubbing (`[REDACTED]`).
  - History panel with full-text search, method badges, status codes, and one-click request restoration to active or new tabs.
  - Single-entry deletion and "Clear All" with confirmation and undo toasts.
  - Automatic pruning retaining the latest 100 entries.
- **Collection Import & Export**:
  - Postman v2.1 Collection JSON import with folder nesting, request extraction, and unsupported script report.
  - cURL command line import with dedicated unsupported-flag summary dialog (`--limit-rate`, `--socks5`, etc.).
  - OpenPost Native (`.openpost.json`) and Postman v2.1 (`.postman_collection.json`) export formats with matching extensions and secret-exclusion by default.
  - File size safety limits (10MB) and recursion depth limit (10 levels).
- **Safety & Draft Recovery**:
  - Atomic draft saving using temporary file writes and safe rename operations (`.tmp` -> `.json` + `.bak`).
  - Corrupted draft file detection with automatic backup restoration.
  - External modification detection tracking file modification timestamps.
- **Design System & Accessibility**:
  - Dual curated palettes: Light Theme (Editorial Developer) and Dark Theme (Calm Obsidian).
  - 100% WCAG 2.1 AA contrast compliance across all text, borders, focus rings, placeholders, disabled states, and status colors.
  - Virtualized list rendering for workspaces and collections with 1,000+ requests.
  - RTL (Right-to-Left) bidirectional text support on all input fields and textareas.
  - Respects user's `prefers-reduced-motion` settings.
- **Security & Privacy**:
  - Desktop backend powered by Tauri 2 and Rust `reqwest` with zero browser CORS limitations.
  - Tightened Content Security Policy (`connect-src 'self' http://localhost:5173 ws://localhost:5173;`).
  - Zero external network calls without explicit user action (verified by traffic monitoring).
  - OS Keychain credential integration with graceful in-memory fallback warning.
