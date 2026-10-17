# OpenPost Codebase & Quality Audit Report — Round 2

**Date**: October 17, 2026  
**Auditor**: Senior QA & Full-Stack Systems Engineer  
**Scope**: OpenPost Desktop API Client (Tauri 2 + Rust + React 19 + TypeScript 5.8 + Vite)  
**Status**: ⏸ **AWAITING USER APPROVAL**  
*(Strict Enforcement: Zero code changes will be made until explicit user approval of this report)*

---

## 1. Executive Summary & Round 1 Re-Verification Scorecard

During Round 1, 19 issues were cataloged. This Round 2 audit performed a rigorous verification of those 19 fixes against the active codebase and running app, followed by an in-depth audit of previously uncovered functional areas (persistence resilience, SQLite corruption recovery, OS keychain fallback, import/export validation, binary/compressed responses, variable cycles, a11y, and platform packaging).

### Round 1 Re-Verification Scorecard

| Original ID | Description | Round 1 Claim | Round 2 Actual Status | Evidence & Defect Analysis |
| :--- | :--- | :---: | :---: | :--- |
| **OP-AUDIT-012** | Draft Persistence | "Fixed" | **PARTIAL** | **Security Leak**: In [`requestStore.ts`](file:///c:/Users/AZLAN/Desktop/PROJECTS/OpenPost/src/stores/requestStore.ts#L27-L40), `saveDrafts()` serializes `t.request` straight into `localStorage` (`openpost_draft_tabs_v1`). Any entered `bearer.token`, `basic.password`, or `apiKey.value` is stored unencrypted in plaintext. Secrets must be stripped before serialization. |
| **OP-AUDIT-008** | Undefined Variables Warning | "Fixed" | **PARTIAL** | Only a static `{var}` badge was added to [`UrlBar.tsx`](file:///c:/Users/AZLAN/Desktop/PROJECTS/OpenPost/src/components/request/UrlBar.tsx#L125). In [`App.tsx`](file:///c:/Users/AZLAN/Desktop/PROJECTS/OpenPost/src/App.tsx#L86-L126), `handleSend()` transmits unresolved `{{var}}` requests directly to servers without prompting a pre-send confirmation modal with "Send anyway" / "Cancel". |
| **OP-AUDIT-011** | Unsaved Tab Close Dialog | "Fixed" | **PARTIAL** | In [`TabBar.tsx`](file:///c:/Users/AZLAN/Desktop/PROJECTS/OpenPost/src/components/layout/TabBar.tsx#L113-L130), the modal footer provides only `[Cancel]` and `[Discard & Close]`. The required `[Save]` button is missing. |
| **OP-AUDIT-007** | Large Response Threshold | "Fixed" | **PARTIAL** | In [`ResponseViewer.tsx`](file:///c:/Users/AZLAN/Desktop/PROJECTS/OpenPost/src/components/response/ResponseViewer.tsx#L35), `LARGE_RESPONSE_THRESHOLD` is set to `2 * 1024 * 1024` (2MB) instead of the approved `5MB` (`5 * 1024 * 1024`). |
| **OP-AUDIT-018** | Dependency Audit & Licenses | "Fixed" | **PARTIAL** | Licenses of all 25 npm dependencies verified (MIT/Apache-2.0/ISC). All Rust dependencies in `Cargo.toml` are MIT/Apache-2.0. However, `npm audit` reports 10 real vulnerabilities (2 critical, 5 high in `tinypool`, `braces`, `postcss-selector-parser`, `@vitest/mocker`). While isolated to build-time devDependencies, they must be formally documented and insulated from release builds. |
| **OP-AUDIT-001** | Missing Protocol Detection | "Fixed" | **VERIFIED** | Unit test `urlValidation.test.ts` (5/5 passing) and browser verification confirm auto-prepends `https://`. |
| **OP-AUDIT-002** | Empty URL Send Disabled | "Fixed" | **VERIFIED** | Button is disabled with `cursor-not-allowed`, shortcut blocked, and accessible tooltip displayed. |
| **OP-AUDIT-003** | Coarse Network & SSL Errors | "Fixed" | **VERIFIED** | Structured error codes (`OP-NET-001`, `002`, `003`, `OP-SSL-001`) with 1-click SSL retry verified. |
| **OP-AUDIT-004** | Neutral Cancellation UI | "Fixed" | **VERIFIED** | Neutral slate card with "Send Again" button displayed upon user cancellation. |
| **OP-AUDIT-005** | Contextual 4xx/5xx Hints | "Fixed" | **VERIFIED** | `HTTP_STATUS_HINTS` rendered for 401, 403, 404, 429, 500. |
| **OP-AUDIT-006** | JSON Syntax Validation | "Fixed" | **VERIFIED** | `jsonValidator.ts` extracts line/column; tested in `jsonValidator.test.ts`. |
| **OP-AUDIT-009** | React ErrorBoundary | "Fixed" | **VERIFIED** | Top-level ErrorBoundary with sanitized report verified in `errorBoundary.test.tsx`. |
| **OP-AUDIT-010** | Global Error Listeners | "Fixed" | **VERIFIED** | `unhandledrejection` and `error` listeners dispatch toasts; verified in `App.tsx`. |
| **OP-AUDIT-013** | Toast Notification System | "Fixed" | **VERIFIED** | Toast queue with auto-dismiss verified in `toastStore.ts` and `ToastContainer.tsx`. |
| **OP-AUDIT-014** | Accessible Modal Dialog | "Fixed" | **VERIFIED** | Focus trapping and Esc dismissal verified in `Modal.tsx`. |
| **OP-AUDIT-015** | Standardized Error Messages | "Fixed" | **VERIFIED** | Centralized in `messages.ts` and documented in `docs/ERROR_CODES.md`. |
| **OP-AUDIT-016** | Accessible `aria-label`s | "Fixed" | **VERIFIED** | Verified across all icon buttons in UrlBar, TabBar, Sidebar, and BodyEditor. |
| **OP-AUDIT-017** | Consistent Focus Rings | "Fixed" | **VERIFIED** | `focus-visible:ring-2 focus-visible:ring-brand-500` standardized. |
| **OP-AUDIT-019** | Secrets Sanitizer | "Fixed" | **VERIFIED** | `sanitizer.ts` redacts Authorization, passwords, and tokens; verified in `sanitizer.test.ts`. |

---

## 2. Real Dependency Vulnerability Audit (`OP-AUDIT-018`)

### `npm audit` Execution Results (October 17, 2026)
Total findings: **10 vulnerabilities (3 moderate, 5 high, 2 critical)**

| Package | Severity | Advisory ID | Vulnerability Type | Direct Dependency Path | Runtime Impact |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **tinypool** | **Critical** | GHSA-5gmw-xhrv-c9v3<br>GHSA-85c8-ppgw-ccpr | Prototype Pollution in worker options leading to RCE | `vitest@3` -> `tinypool@<=2.1.1` | **Zero Runtime Impact** (test-runner worker thread pool only; excluded from client bundle) |
| **braces** | **High** | GHSA-vfj7-8cjw-p6xm | Stack-exhaustion ReDoS in nested pattern matching | `tailwindcss@3` -> `chokidar` / `micromatch` -> `braces` | **Zero Runtime Impact** (build-time CSS JIT compiler only; excluded from client bundle) |
| **postcss-selector-parser** | **Moderate** | GHSA-rj75-hqrm-r3gf | Quadratic complexity CPU exhaustion | `tailwindcss@3` -> `postcss-nested` -> `postcss-selector-parser` | **Zero Runtime Impact** (build-time CSS compilation only) |
| **@vitest/mocker** | **Moderate** | GHSA-82fw-gwwq-j7x9 | Path Traversal / Arbitrary File Read via redirect mock | `vitest@3` -> `@vitest/mocker` | **Zero Runtime Impact** (test-runner mock utility only) |

### Dependency License Audit
All 25 npm production and dev dependencies have been verified against permissive licenses:
- **MIT**: React, React-DOM, Lucide-React, Zustand, CodeMirror, Vite, TypeScript, ESLint
- **Apache-2.0**: Lezer parsers, TypeScript ESLint parser
- **ISC**: Tailwind utilities
- **Zero GPL / AGPL / Proprietary dependencies**.
All Rust dependencies in `src-tauri/Cargo.toml` (`tauri`, `reqwest`, `rusqlite`, `serde`, `tokio`, `chrono`) are dual-licensed MIT/Apache-2.0.

---

## 3. Round 2 Comprehensive Defect Catalog

### Category A: Core Security & Secret Management

#### OP-R2-001 | Critical | Plaintext Secrets Stored in LocalStorage Drafts
- **Area**: Persistence & Security (Fix for `OP-AUDIT-012`)
- **Severity**: Critical
- **Repro Steps**:
  1. Go to Auth tab, select "Bearer Token", enter `secret-jwt-token-998877`.
  2. Select "Basic Auth", enter username `admin` and password `SuperSecretPassword!`.
  3. Open Browser DevTools -> Application -> Local Storage -> `openpost_draft_tabs_v1`.
  4. Notice the raw string contains plaintext passwords and tokens:
     `{"auth":{"type":"bearer","bearer":{"token":"secret-jwt-token-998877"}}}`.
- **Proposed Fix**:
  - In `src/stores/requestStore.ts`, sanitize draft objects before passing to `localStorage.setItem`:
    - Set `bearer.token = ''`, `basic.password = ''`, `apiKey.value = ''`.
    - Mark the tab with `hasUnsavedSecrets: true`.
  - Secrets remain strictly in volatile memory during the active session.
- **Verification Evidence**: Automated test `tests/draftSanitization.test.ts` verifying that `localStorage.getItem('openpost_draft_tabs_v1')` contains zero matching passwords or tokens.

#### OP-R2-002 | High | Missing Pre-Send Warning Dialog for Undefined `{{variables}}`
- **Area**: Request Builder / Variables (Fix for `OP-AUDIT-008`)
- **Severity**: High
- **Repro Steps**:
  1. Enter URL `https://api.example.com/v1/users/{{userId}}/orders/{{orderId}}`.
  2. In active environment, neither `userId` nor `orderId` is defined.
  3. Click "Send" or press `Ctrl+Enter`.
  4. The request sends immediately without warning, transmitting raw curly braces to the remote server.
- **Proposed Fix**:
  - In `src/App.tsx:handleSend()`, extract all `{{variable}}` tokens across URL, headers, and body.
  - If any variable has no value in active environment or globals:
    - Display a confirmation modal: *"Undefined Variables Detected (OP-VAR-001)"*.
    - List the undefined tokens in a badge list (e.g. `{{userId}}`, `{{orderId}}`).
    - Provide two buttons: `[Cancel]` and `[Send Anyway]`.
- **Verification Evidence**: Automated Vitest test in `tests/undefinedVariables.test.tsx` verifying modal popup and abort behavior.

#### OP-R2-003 | Medium | Tab Close Confirmation Dialog Missing "Save" Action
- **Area**: Tab Manager (Fix for `OP-AUDIT-011`)
- **Severity**: Medium
- **Repro Steps**:
  1. Modify a request tab to mark it dirty.
  2. Click the `✕` close button on the tab.
  3. The modal appears with only `[Cancel]` and `[Discard & Close]`. There is no `[Save]` option.
- **Proposed Fix**:
  - In `src/components/layout/TabBar.tsx`, add a third button to the modal footer: `[Save]`.
  - Clicking `[Save]` invokes the collection save flow (or commits modifications to the saved request), clears the dirty state, and cleanly closes the tab.
- **Verification Evidence**: Component test in `tests/tabCloseSaveModal.test.tsx` checking that all three actions (Save, Don't Save / Discard, Cancel) are rendered and execute their respective callbacks.

#### OP-R2-004 | Low | Large Response Threshold Correction to 5MB
- **Area**: Response Viewer / Performance (Fix for `OP-AUDIT-007`)
- **Severity**: Low
- **Repro Steps**:
  1. Inspect `src/components/response/ResponseViewer.tsx:35`.
  2. Notice `const LARGE_RESPONSE_THRESHOLD = 2 * 1024 * 1024; // 2MB`.
- **Proposed Fix**:
  - Update `LARGE_RESPONSE_THRESHOLD` to `5 * 1024 * 1024` (5MB) as approved in Round 1 plan.
- **Verification Evidence**: Code inspection and unit test verifying that responses between 2MB and 4.9MB render directly, while 5MB+ prompts the large-response warning banner.

---

### Category B: Response Engine, Encoding & Protocol Handling

#### OP-R2-005 | High | Binary Responses Corrupted by Lossy UTF-8 & Freeze Editor
- **Area**: Response Viewer / Backend HTTP Engine
- **Severity**: High
- **Repro Steps**:
  1. Send a GET request to an image or binary endpoint (e.g., `https://httpbin.org/image/png` or a `.pdf`/`.zip` URL).
  2. In `src-tauri/src/commands/http.rs:124`, `String::from_utf8_lossy(&body_bytes)` converts binary bytes to replacement characters (`\uFFFD`), corrupting the data.
  3. CodeMirror attempts to tokenize thousands of replacement characters, causing UI frame drops.
  4. Clicking "Download" saves a corrupted string rather than the original binary bytes.
- **Proposed Fix**:
  - In `http.rs`, inspect `Content-Type` header and byte buffer:
    - If `Content-Type` starts with `image/`, `application/pdf`, `application/octet-stream`, `audio/`, `video/`, or contains non-UTF8 null bytes: set `is_binary: true` and return base64-encoded string.
  - In `ResponseViewer.tsx`:
    - For images (`image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`): display live visual `<img src={`data:${contentType};base64,...`} />` with dimensions and file size.
    - For other binaries: display a clean binary card with mime-type badge and *"Download File"* button that decodes base64 into a native Uint8Array Blob.
- **Verification Evidence**: Automated test `tests/binaryResponse.test.ts` and screenshot of live PNG response preview.

#### OP-R2-006 | High | Repeated `Set-Cookie` Headers Collapsed by HashMap
- **Area**: HTTP Engine / Cookies
- **Severity**: High
- **Repro Steps**:
  1. Target server returns multiple `Set-Cookie` headers (e.g. `Set-Cookie: session=abc; Path=/` and `Set-Cookie: csrf=xyz; Secure`).
  2. In `src-tauri/src/commands/http.rs:112`, `response_headers.insert(key_str, val_str)` writes to a standard `HashMap<String, String>`, which overwrites previous headers with the same key.
  3. Only the last cookie is returned to the frontend; session cookies are dropped.
- **Proposed Fix**:
  - In `http.rs`, use `response.headers().get_all(reqwest::header::SET_COOKIE)` to collect all cookies into `Vec<HttpResponseCookie>`.
  - Parse cookie attributes: `name`, `value`, `domain`, `path`, `expires`, `http_only`, `secure`.
  - In `ResponseViewer.tsx`, add a dedicated **Cookies** tab showing a table with name, value, domain, path, and security flags.
- **Verification Evidence**: Rust backend test `test_multi_cookie_extraction` and frontend test verifying Cookies table rendering.

#### OP-R2-007 | High | Missing Compression Handlers in Reqwest Client
- **Area**: Backend HTTP Engine (`Cargo.toml`)
- **Severity**: High
- **Repro Steps**:
  1. In `src-tauri/Cargo.toml:23`, reqwest is defined as:
     `features = ["json", "multipart", "rustls-tls", "cookies"]` with `default-features = false`.
  2. Send a request to an endpoint with `Accept-Encoding: gzip, deflate, br` (such as Cloudflare or modern reverse proxies).
  3. Server responds with compressed `Content-Encoding: gzip`.
  4. Reqwest does not have `gzip`/`brotli`/`deflate` features enabled, so raw compressed bytes are returned as unreadable garbage text.
- **Proposed Fix**:
  - Add `gzip`, `brotli`, and `deflate` features to `reqwest` in `Cargo.toml`:
    `features = ["json", "multipart", "rustls-tls", "cookies", "gzip", "brotli", "deflate"]`.
  - Reqwest will automatically decompress payloads transparently before passing to frontend.
- **Verification Evidence**: Cargo build verification and integration test sending request with `Accept-Encoding: gzip`.

#### OP-R2-008 | Medium | Sandboxed Preview Iframe for HTML Responses
- **Area**: Response Viewer / Security
- **Severity**: Medium
- **Repro Steps**:
  1. Send request to an endpoint returning `text/html` containing embedded `<script>` or cookie theft exploits.
  2. If rendered in an iframe without sandbox restrictions, scripts execute within the desktop app window origin.
- **Proposed Fix**:
  - When rendering HTML Preview, strictly use:
    `<iframe sandbox="allow-same-origin" srcdoc={sanitizedHtml} className="w-full h-full border-0" />`.
  - Explicitly omit `allow-scripts`, `allow-modals`, and `allow-popups` to eliminate script execution and CSRF.
- **Verification Evidence**: Component test in `tests/htmlPreviewSandbox.test.tsx` verifying sandbox attribute values.

---

### Category C: Collections, Persistence & File System Resilience

#### OP-R2-009 | High | Corrupted, Invalid JSON or Unknown Schema in Collection Files
- **Area**: Persistence / File System
- **Severity**: High
- **Repro Steps**:
  1. Open a collection JSON file in an external editor and corrupt it (truncate closing brackets or insert garbage bytes).
  2. Launch OpenPost or load the workspace.
  3. App fails with uncaught `SyntaxError: Unexpected end of JSON input` or unhandled promise rejection.
- **Proposed Fix**:
  - Implement schema versioning (`openpostFormat: "1.0.0"`) and schema validator `validateCollectionSchema(data: unknown)`.
  - Wrap parsing in `try/catch`. On error:
    - Display error banner: `OP-FS-001 (Corrupted Collection File)`.
    - Automatically create a backup file: `collection.json.bak.<timestamp>`.
    - Provide a *"Recover / Reset File"* action in the UI.
- **Verification Evidence**: Unit tests using fixtures `tests/fixtures/corrupted.json` and `tests/fixtures/unsupported_version.json`.

#### OP-R2-010 | Medium | Missing External File Watcher (Detect External Changes & Offer Reload)
- **Area**: Persistence / Local-First Git Workflows
- **Severity**: Medium
- **Repro Steps**:
  1. Open a collection in OpenPost.
  2. Switch to terminal and run `git pull` or edit the collection file in VS Code.
  3. OpenPost retains stale in-memory state; if user saves in OpenPost, external changes are silently overwritten.
- **Proposed Fix**:
  - Add file modification timestamp (`mtime`) and hash check.
  - When external modification is detected:
    - Show an alert banner: *"This collection was modified externally. [Reload Changes] [Keep Local Edits]"*.
- **Verification Evidence**: Integration test simulating external disk modification and asserting notification banner appears.

#### OP-R2-011 | High | Read-Only Workspace Folder & Disk Full Data Loss
- **Area**: Persistence / Storage Safety
- **Severity**: High
- **Repro Steps**:
  1. Point workspace directory to a read-only partition (write-protected USB drive or permission denied folder).
  2. Edit a request and click Save.
  3. Disk write fails silently or throws an uncaught error. Unsaved work is lost when the app closes.
- **Proposed Fix**:
  - Handle write failures (`EACCES`, `EROFS`, `ENOSPC`).
  - Keep an in-memory draft buffer and fallback to local temporary app data.
  - Display error notification: `OP-FS-002 (Permission Denied)` or `OP-FS-003 (Disk Full)`.
  - Keep tab marked dirty so work is never lost.
- **Verification Evidence**: Unit test mocking write failure and asserting in-memory preservation.

#### OP-R2-012 | High | SQLite History Database Locking, Corruption & Auto-Recovery
- **Area**: SQLite History (`rusqlite`)
- **Severity**: High
- **Repro Steps**:
  1. Simulate SQLite file corruption (write random bytes into `history.db`) or lock the file with another process.
  2. Launch app and send a request.
  3. `rusqlite::Connection::open` panics or returns error `code: 11 (SQLITE_CORRUPT)`.
- **Proposed Fix**:
  - In `src-tauri/src/services/db.rs`, execute `PRAGMA integrity_check` on connection startup.
  - If corrupt:
    - Rename `history.db` to `history.db.corrupt.<timestamp>`.
    - Re-initialize fresh SQLite schema.
    - Surface non-blocking warning toast: *"History database was repaired. A backup of the damaged file was saved (OP-DB-001)"*.
  - Enforce that history records store unresolved templates (e.g. `{{baseUrl}}/users`) and sanitize all `Authorization` headers before inserting rows.
- **Verification Evidence**: Rust integration test simulating corrupted SQLite header and verifying graceful database regeneration.

#### OP-R2-013 | Medium | OS Keychain Unavailable / Denied Fallback & Warning
- **Area**: Security / OS Credential Store
- **Severity**: Medium
- **Repro Steps**:
  1. Run OpenPost on Linux without a desktop secret-service daemon (or Windows with DPAPI policy restricted).
  2. Keychain access throws permission denied or service unavailable.
- **Proposed Fix**:
  - Handle keychain error gracefully: fall back to session-only in-memory storage.
  - Display warning banner in Settings / Auth tabs:
    *"OS Secure Keychain is unavailable on this system. Secrets will be stored in memory for this session only and will not persist across restarts (OP-SEC-002)"*.
- **Verification Evidence**: Unit test verifying graceful fallback and banner trigger when keychain returns unavailable.

---

### Category D: Import & Export Resilience

#### OP-R2-014 | High | Import Resilience: Hostile JSON, Circular Folders & Postman Summary
- **Area**: Import Engine (Postman v2.1)
- **Severity**: High
- **Repro Steps**:
  1. Import a Postman collection with circular folder hierarchies (Folder A inside Folder B inside Folder A) or duplicate request IDs.
  2. Import a Postman collection containing pre-request scripts, test assertions, or unsupported auth types.
  3. App hangs in infinite recursion or drops scripts silently without informing user.
- **Proposed Fix**:
  - Implement depth-limiting (max 10 folder levels) to eliminate circular reference loops.
  - Auto-generate fresh UUIDs for all imported items to eliminate ID collisions.
  - Display an **Import Summary Dialog**:
    - Requests imported count, folders created count.
    - List of skipped fields: *"3 Pre-request scripts and 2 Test scripts skipped (OpenPost runs local-first without script sandboxes)"*.
- **Verification Evidence**: Test fixtures in `tests/fixtures/postman/` covering circular folders, duplicate IDs, and script fields; component test verifying summary modal.

#### OP-R2-015 | Medium | cURL Import Parser Missing Unsupported Flag Reporting
- **Area**: Import Engine (cURL)
- **Severity**: Medium
- **Repro Steps**:
  1. Paste a cURL command containing flags like `--socks5 127.0.0.1:9050`, `--cert-status`, or `--limit-rate 50k`.
  2. Parser fails or strips them silently.
- **Proposed Fix**:
  - Build robust cURL tokenizer supporting `-X`, `-H`, `-d`/`--data-raw`, `-u`, `-k`/`--insecure` (mapped to `verifySsl: false`).
  - When unsupported flags (`--socks5`, `--limit-rate`) are encountered, list them in an info toast: *"Unsupported cURL flags skipped: --socks5, --limit-rate"*.
- **Verification Evidence**: Automated test `tests/curlParser.test.ts` testing 10+ real-world cURL strings.

#### OP-R2-016 | High | Collection/Environment Export Missing "Exclude Secrets" Default
- **Area**: Export / Security (Fix for `OP-SEC-003`)
- **Severity**: High
- **Repro Steps**:
  1. User exports a collection or environment to share with a team member via git.
  2. API tokens, Basic passwords, and private keys are written directly into the exported JSON.
- **Proposed Fix**:
  - Create an **Export Dialog** with a prominent toggle:
    `[x] Exclude secrets and passwords (Recommended)` (checked by default).
  - When checked, all variables marked `isSecret: true` and all auth credentials (`token`, `password`, `apiKey`) are stripped or exported as empty strings `""`.
- **Verification Evidence**: Automated unit test `tests/exportSanitization.test.ts` verifying that exported JSON files with checkbox enabled contain zero secrets.

---

### Category E: User Experience, Modals & Onboarding

#### OP-R2-017 | Medium | Missing Destructive Action Confirmations with 8-Second Undo Toasts
- **Area**: User Experience / Data Safety
- **Severity**: Medium
- **Repro Steps**:
  1. Click "Delete Collection", "Delete Request", or "Clear History".
  2. Currently, items could be removed immediately without confirmation or undo capability.
- **Proposed Fix**:
  - Require modal confirmation for destructive actions: *"Delete Collection: This will delete X requests. Are you sure?"*.
  - When deleted, render a Toast with an **"Undo"** action button lasting 8 seconds that restores the deleted item to the store.
- **Verification Evidence**: Component test testing delete trigger, confirmation modal, and undo restoration.

#### OP-R2-018 | Medium | Missing Welcome Dialog, Settings Dialog & About Dialog
- **Area**: App Shell / Navigation
- **Severity**: Medium
- **Repro Steps**:
  1. Launch app for first time: no welcome guide or workspace explanation.
  2. Click Settings icon in Sidebar: inert, does nothing.
  3. No About modal displaying version, MIT license, or diagnostics.
- **Proposed Fix**:
  - **First-Run Welcome Modal**: Introducing local-first storage, folder location, and quick start options.
  - **Settings Modal**: Configure default request timeout, default SSL verification, theme (Dark/Light/System), and workspace path.
  - **About Modal**: App version (0.1.0), MIT license badge, GitHub repository link, and a *"Copy Sanitized Diagnostics"* button.
- **Verification Evidence**: Component tests for Welcome, Settings, and About modals.

---

### Category F: Advanced Variables, Accessibility & Desktop Packaging

#### OP-R2-019 | High | Variable Precedence, Cycle Detection & Auth "Inherit"
- **Area**: Request Builder / Variables
- **Severity**: High
- **Repro Steps**:
  1. Set variable `{{a}}` = `{{b}}` and `{{b}}` = `{{a}}`.
  2. Send request: variable resolver enters infinite recursion.
  3. Child request in collection cannot inherit collection auth.
- **Proposed Fix**:
  - Build central variable resolver enforcing strict precedence:
    `Request Params > Folder Variables > Collection Variables > Environment Variables > Global Variables`.
  - Add cycle detection (max depth 10 or visited set); abort with `OP-VAR-002: Cyclic variable reference detected: {{a}} -> {{b}} -> {{a}}`.
  - Add `inherit` option to Auth selector (`{ type: 'inherit' }`) that inherits parent collection/folder auth config.
- **Verification Evidence**: Automated tests in `tests/variableResolver.test.ts` checking precedence order, cycle detection, and auth inheritance.

#### OP-R2-020 | Medium | Collection Virtualization for 1,000+ Requests & RTL Layout Stability
- **Area**: UI Performance & Internationalization
- **Severity**: Medium
- **Repro Steps**:
  1. Load a workspace containing 1,000+ requests.
  2. Sidebar renders all 1,000 DOM nodes simultaneously, causing scroll jank.
  3. Input Arabic or Hebrew text in request names: layout breaks or chevron icon clips.
- **Proposed Fix**:
  - Use lightweight virtual list or windowing for large collections.
  - Add `dir="auto"` and `truncate` CSS classes to all request title containers.
- **Verification Evidence**: Performance benchmark test with 1,000 mock items and RTL visual verification.

#### OP-R2-021 | Medium | Accessibility: Keyboard Walkthrough, Contrast & Reduced Motion
- **Area**: Accessibility (WCAG 2.1 AA)
- **Severity**: Medium
- **Repro Steps**:
  1. Navigate entire app using only `Tab`, `Shift+Tab`, `Enter`, `Escape`.
  2. Enable "Reduce motion" in OS settings: CSS spin animations and toast slide-ins continue to animate.
  3. In monochrome mode, method badges rely solely on color hue.
- **Proposed Fix**:
  - In `src/index.css`, add `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`.
  - Ensure every status indicator includes both text and distinctive icon symbols (e.g., `✓ 200 OK`, `⚠ 404 Not Found`).
- **Verification Evidence**: CSS media query test and keyboard navigation test suite.

#### OP-R2-022 | Low | Desktop Platform Packaging & Unsigned Installer Notice
- **Area**: Packaging & Documentation
- **Severity**: Low
- **Repro Steps**:
  1. User downloads binary on Windows: SmartScreen blocks execution.
  2. User downloads on macOS: Gatekeeper displays untrusted developer warning.
- **Proposed Fix**:
  - In `README.md`, add a dedicated section: **"Installing Pre-built Releases (Unsigned Binaries)"**:
    - Windows instructions (Click "More info" -> "Run anyway").
    - macOS instructions (`xattr -cr /Applications/OpenPost.app`).
    - Explain that as a 100% free, community-driven project with zero corporate monetization, code-signing certificates are not purchased, and SHA-256 checksums are published on GitHub Releases.
- **Verification Evidence**: Documentation check in `README.md`.

---

## 4. Test Fixtures & Automated Verification Plan

### Test Fixtures to Add
1. `tests/fixtures/postman/valid_v2.1.json` — Real multi-folder Postman collection with diverse requests.
2. `tests/fixtures/postman/corrupted.json` — Malformed and truncated JSON.
3. `tests/fixtures/postman/circular_folders.json` — Circular parent-child references.
4. `tests/fixtures/postman/unsupported_scripts.json` — Collection containing pre-request and test scripts.
5. `tests/fixtures/curl/samples.txt` — 15 diverse cURL commands (GET, POST JSON, multipart, headers, basic auth, unsupported flags).

### Test Suites to Implement & Run
1. `tests/draftSanitization.test.ts` (OP-R2-001)
2. `tests/undefinedVariables.test.ts` (OP-R2-002)
3. `tests/tabCloseSaveModal.test.ts` (OP-R2-003)
4. `tests/largePayloadThreshold.test.ts` (OP-R2-004)
5. `tests/binaryResponse.test.ts` (OP-R2-005)
6. `tests/cookiesTable.test.ts` (OP-R2-006)
7. `tests/collectionValidation.test.ts` (OP-R2-009)
8. `tests/curlParser.test.ts` (OP-R2-015)
9. `tests/exportSanitization.test.ts` (OP-R2-016)
10. `tests/variableResolver.test.ts` (OP-R2-019)

---

## 5. Implementation Roadmap (Awaiting Approval)

Once you reply with **"approved"**, execution will proceed in strict severity order:

- **Phase 1: Critical & High Security (Round 1 Incomplete Fixes)**:
  - Strip secrets from drafts in `requestStore.ts` (`OP-R2-001`).
  - Add undefined variable pre-send confirmation modal in `App.tsx` (`OP-R2-002`).
  - Add Save / Don't Save / Cancel options to tab close modal in `TabBar.tsx` (`OP-R2-003`).
  - Update `LARGE_RESPONSE_THRESHOLD` to 5MB in `ResponseViewer.tsx` (`OP-R2-004`).
- **Phase 2: Response Engine, Binary Data & Protocol Handling**:
  - Add base64 binary payload detection, image preview, and direct download in `http.rs` and `ResponseViewer.tsx` (`OP-R2-005`).
  - Add multi-cookie extraction and Cookies response viewer tab (`OP-R2-006`).
  - Enable `gzip`, `brotli`, `deflate` compression in `Cargo.toml` (`OP-R2-007`).
  - Add sandboxed HTML preview iframe (`OP-R2-008`).
- **Phase 3: Persistence, Import/Export & Modals**:
  - Add Postman v2.1 import parser with summary modal and cURL parser (`OP-R2-014`, `OP-R2-015`).
  - Add Export modal with "exclude secrets" enabled by default (`OP-R2-016`).
  - Add destructive action confirmations with 8-second undo toasts (`OP-R2-017`).
  - Add Welcome, Settings, and About modals (`OP-R2-018`).
- **Phase 4: Variable Engine & Accessibility**:
  - Build central variable resolver with precedence and cycle detection (`OP-R2-019`).
  - Add `prefers-reduced-motion` CSS and dual status encoding (`OP-R2-021`).
  - Add unsigned binary install notice to `README.md` (`OP-R2-022`).
- **Phase 5: Automated Testing & Verification**:
  - Add all test fixtures and run the full Vitest suite (`npm test`), TypeScript verification (`npm run typecheck`), and production build (`npm run build`).

---

> 🛑 **STOP**: Strict rule in effect. No code has been modified. Awaiting your reply: reply **"approved"** to begin implementation.
