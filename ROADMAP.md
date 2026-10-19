# OpenPost Project Roadmap

> **The Free, Open-Source API Client. No Account. No Limits. Fully Local.**

This document outlines the architectural roadmap and upcoming feature iterations for OpenPost following the v0.1.0 release.

---

## 🗺️ Release Horizons

### Next: v0.2.0 — Developer Ergonomics & Engine Evolution

- [ ] **Tailwind CSS 3 -> 4 Migration**:
  - **Technical Rationale**: OpenPost currently runs on `tailwindcss@3.4.17` with PostCSS and custom HSL surface tokens (`surface-base`, `surface-card`, `surface-panel`, `brand-primary`). Tailwind v4 replaces JavaScript configuration files with CSS `@theme` directives and Vite native compiler integration. Staying on v3.4 for v0.1.0 ensured zero breaking UI changes and rock-solid cross-platform stability. The v4 migration is slated for v0.2.0 once community Vite plugin edge cases settle.
  - **Migration Plan**: Convert `tailwind.config.js` design tokens to `@theme` directives in `src/index.css`, update `@tailwindcss/vite`, and run comprehensive visual regression tests against the 20-screen theme matrix.
- [ ] **Multi-Format Code Generation**:
  - Export active request to executable snippets: `cURL`, `JavaScript (fetch / axios)`, `Python (requests / httpx)`, `Go (net/http)`, `Rust (reqwest)`, and `PHP (cURL)`.
- [ ] **Response Search & JSON Path Filtering**:
  - Interactive JSONPath query bar for deep inspection of large response payloads.
- [ ] **Tab Drag-and-Drop Reordering**:
  - Fluid tab rearrangement with persistent order in workspace drafts.

### Horizon: v0.3.0 — Real-Time Protocols & Mock Server

- [ ] **WebSocket & Server-Sent Events (SSE)**:
  - Interactive WebSocket connection console with live frame streaming, message filtering, and binary payload visualization.
  - Continuous SSE event stream listener with auto-reconnect.
- [ ] **Local Mock Server Engine**:
  - Built-in local HTTP mock server powered by the Rust backend.
  - Configurable route matching, custom response delay simulation, status code forcing, and scenario testing without cloud proxies.
- [ ] **GraphQL Introspection & Schema Explorer**:
  - Automatic schema discovery, autocomplete editor, and query variable editor.

### Horizon: v0.4.0 — Headless Automation & CI/CD Runner

- [ ] **OpenPost CLI (`openpost-cli`)**:
  - Headless test execution engine to run OpenPost collections in CI/CD pipelines.
  - JUnit and TAP formatted test reporting.
  - Zero external Node.js runtime required; distributed as a standalone native binary.
- [ ] **Plugin & Custom Hook System**:
  - Sandboxed WebAssembly or JavaScript hooks for custom auth signing (e.g. AWS SigV4, OAuth 1.0a, HMAC-SHA256).

---

## 🛡️ Non-Negotiable Guarantees

As OpenPost grows, these core tenets remain absolute:
1. **No Cloud Account**: OpenPost will never require registration, login, or cloud sync.
2. **Zero Telemetry**: No tracking, analytics pings, error beacons, or background pings.
3. **No Paywalls**: Every feature is 100% free and open-source under the MIT License.
4. **Local Data Sovereignty**: All collections, environments, and secrets belong exclusively to the user on their local machine.
