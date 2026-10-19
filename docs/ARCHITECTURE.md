# OpenPost Architecture & Security Specification

This document details the architectural layout, internal subsystems, data flows, and security boundaries of OpenPost.

---

## 🏛️ System Overview

OpenPost is built as a hybrid desktop application combining a high-performance **Rust backend** with a reactive **React 19 / TypeScript frontend**, orchestrated via **Tauri v2**.

```mermaid
graph TD
    subgraph Frontend ["Frontend UI (React 19 / TypeScript / Vite)"]
        UI[Workspace, Tabs, Builder, Response Viewer]
        Zustand[Zustand Stores: Request, History, Theme, Toast]
        Sanitizer[Client-Side Sanitizer & Variable Resolver]
    end

    subgraph IPC ["Tauri v2 IPC Bridge"]
        Commands[Typed Tauri Commands]
    end

    subgraph Backend ["Rust Backend (tauri-core / tokio)"]
        HttpEngine[HTTP Engine (reqwest / rustls)]
        DbEngine[SQLite Storage (rusqlite / history.db)]
        DraftEngine[Atomic Draft Storage (openpost_drafts.json)]
        Keychain[OS Credential Manager / Keychain]
    end

    UI --> Zustand
    Zustand --> Sanitizer
    Zustand -->|Tauri invoke| Commands
    Commands --> HttpEngine
    Commands --> DbEngine
    Commands --> DraftEngine
    Commands --> Keychain
    HttpEngine -->|Network I/O| ExternalAPI[Target API Servers]
```

---

## 🔒 Security Boundaries & Privacy Guarantees

### 1. OS Keychain & Windows Credential Manager
- Sensitive authorization tokens, passwords, and private API keys marked with `isSecret: true` are stored directly in the operating system's native keychain:
  - **Windows**: `advapi32.dll` via Win32 `CredWriteW`, `CredReadW`, `CredDeleteW` under target prefix `openpost:<key>`.
  - **macOS**: Apple Keychain Services via Security framework.
  - **Linux**: Secret Service API / DBus FreeDesktop Keyring.
- Tab draft files (`openpost_drafts.json`) stored on disk never contain plain secret values; they record only `{ name, isSecret: true }`.

### 2. Zero-Telemetry Policy
- OpenPost does not bundle analytics libraries (Google Analytics, Sentry, Mixpanel, PostHog, etc.).
- The application initiates outbound network sockets **only** when the user explicitly clicks "Send" or presses `Ctrl+Enter`.
- External documentation, sponsor, and repository links open exclusively in the user's default browser via OS shell invocation (`openExternalUrl`), not inside the application webview.

### 3. Sandboxed Response Previews
- HTML responses are rendered inside an isolated `<iframe>` configured with:
  ```html
  <iframe sandbox="" srcdoc="..."></iframe>
  ```
- Combined with a strict Content Security Policy (`default-src 'none'`), script execution, storage access, and secondary network calls from rendered HTML payloads are blocked.

### 4. Content Security Policy (CSP)
The webview enforces the following strict CSP defined in `src-tauri/tauri.conf.json`:
```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://localhost:5173 ws://localhost:5173; object-src 'none'; frame-ancestors 'none'; base-uri 'none';
```

---

## 🗄️ Storage Subsystems

| Storage Type | Purpose | Encryption / Protection |
| :--- | :--- | :--- |
| **Windows Credential Manager** | Secret variables and auth tokens | Encrypted by Windows DPAPI |
| **SQLite (`history.db`)** | Outbound request and response audit logs | Secrets masked as `[REDACTED]` prior to SQLite insertion |
| **Atomic JSON Drafts** | Active session tabs and collections | Sensitive fields stripped; atomic rename on disk write |
| **`localStorage`** | Theme preference and UI layout state | Non-sensitive preferences only |

---

## ⚡ Rust HTTP Engine Architecture

The native HTTP engine (`src-tauri/src/commands/http.rs`) is built on Tokio and Reqwest:
- **No CORS Restrictions**: Routes sockets directly through OS TCP/TLS stack.
- **Configurable Redirects**: Default 10 redirect limit; detects redirect loops (`OP-NET-004`).
- **Decompression**: Automatic streaming decompression for `gzip`, `brotli`, and `deflate`.
- **Custom Certificate Validation**: One-click toggling of `verify_certs: false` for self-signed development certificates (`OP-SSL-001`).
- **Request Cancellation**: Tokio cancellation tokens guarantee instant socket termination when user cancels in-flight requests.
