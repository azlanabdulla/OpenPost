# OpenPost

<p align="center">
  <img src="public/logo.svg" alt="OpenPost Logo" width="96" height="96" />
</p>

<h3 align="center">The free, open-source Postman alternative</h3>

<p align="center">
  <strong>No account. No limits. Fully local.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#comparison">Comparison</a> •
  <a href="#installation">Installation</a> •
  <a href="#building-from-source">Build from Source</a> •
  <a href="#known-limitations">Known Limitations</a> •
  <a href="LICENSE">License</a>
</p>

---

## Why OpenPost?

Most popular API clients today enforce mandatory accounts, collect telemetry, cloud-sync private tokens, and throttle workspaces with paid tiers.

**OpenPost** is built on a strictly local-first philosophy:
- **Zero Cloud / Zero Telemetry**: No sign-up, no login, no analytics pings, no cloud tracking.
- **Tauri 2 + Rust Core**: Extremely lightweight, fast startup, zero browser CORS restrictions.
- **Git-Friendly Storage**: All collections and environments are saved as human-readable JSON files on your local disk.
- **100% Free & Open Source**: MIT Licensed forever.

---

## Comparison

| Feature | OpenPost | Paid / Freemium API Clients |
| :--- | :---: | :---: |
| **Account Required** | ❌ **No account ever** | ✅ Mandatory login |
| **Request & Collection Limits** | ❌ **No limits** | ⚠️ Artificial tiers & limits |
| **Cloud Sync of Secrets** | ❌ **Strictly local** | ⚠️ Synced to third-party cloud |
| **Telemetry & Tracking** | ❌ **Zero telemetry** | ⚠️ Behavioral analytics |
| **CORS Limitations** | ❌ **Zero CORS (Rust backend)** | ❌ None |
| **License & Price** | **Free (MIT)** | Closed-source / Paid subscriptions |

---

## Features

- **Request Builder**:
  - Full support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
  - Live bi-directional sync between URL query string and Params table.
  - Multi-tab workspace with unsaved-changes dirty indicators and safety confirmation.
  - Keyboard shortcuts (`Ctrl/Cmd+Enter` to send, `Ctrl/Cmd+T` for new tab, `Ctrl/Cmd+W` to close tab).
  - Common header presets (`+Accept`, `+Content-Type`, `+User-Agent`).
  - Body support: None, raw JSON (with live syntax check & line/col pointer), raw text, x-www-form-urlencoded, multipart form-data.
  - Auth helpers: Bearer Token, Basic Auth, API Key (Header or Query), with secret masking.
  - Per-request SSL certificate toggle with one-click retry on self-signed certificates.
- **Response Viewer**:
  - Real-time status badge, response duration (ms), and payload size.
  - Syntax-highlighted JSON pretty-printing with CodeMirror 6 and code folding.
  - Response tabs: Pretty, Raw, Headers.
  - Large response safety guard (>5MB) with truncated preview, "Show Full", and "Save to File".
  - Binary response inspection: visual preview for image responses (PNG, JPEG, SVG, WebP) and direct binary download.
  - Dedicated Cookies inspector tab and sandboxed HTML preview iframe.
  - Contextual hints for common HTTP status codes (401, 403, 404, 429, 500, etc.).
- **Reliability & Security**:
  - Top-level React `ErrorBoundary` with sanitized crash diagnostics.
  - Standardized error codes documented in [docs/ERROR_CODES.md](docs/ERROR_CODES.md).
  - Secret sanitization: drafts and exports automatically redact Authorization tokens and passwords.
  - Pre-send warning for undefined `{{variables}}` to prevent unintentional transmission of unresolved templates.

---

## Installation

Download the latest release for your operating system from [GitHub Releases](https://github.com/openpost/openpost/releases):

- **Windows**: `.msi` or standalone `.exe`
- **macOS**: `.dmg` (Universal binary for Intel & Apple Silicon)
- **Linux**: `.AppImage` or `.deb`

### Unsigned Installer Notice
Because OpenPost is a 100% free community project with zero commercial telemetry or revenue, expensive corporate code-signing certificates are not purchased:
- **Windows**: You may see a Microsoft SmartScreen prompt (*"Windows protected your PC"*). Click **More info** -> **Run anyway**.
- **macOS**: You may see Gatekeeper note that the app is from an unidentified developer. Right-click the app -> select **Open** -> click **Open**, or run `xattr -cr /Applications/OpenPost.app` in Terminal.
- **Linux**: For AppImage releases, make executable: `chmod +x OpenPost-*.AppImage`.
- Official SHA-256 checksums are published with every GitHub Release so you can verify binary integrity.

---

## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ and `npm`
- [Rust & Cargo](https://rustup.rs/) (latest stable)
- Operating system build tools (Visual Studio C++ Build Tools on Windows, Xcode CLI on macOS, `libwebkit2gtk-4.1-dev` on Linux)

### Steps

```bash
# 1. Clone repository
git clone https://github.com/openpost/openpost.git
cd openpost

# 2. Install frontend dependencies
npm install

# 3. Run typecheck and tests
npm run typecheck
npm test

# 4. Start local development
npm run dev

# 5. Build desktop bundle via Tauri
npm run tauri build
```

---

## Known Limitations

1. **Browser Development Mode vs. Desktop Mode**:
   When running OpenPost purely in a web browser (e.g. `npm run dev` in Chrome), requests are executed via browser `fetch` and are subject to browser CORS policies. When launched as the Tauri desktop application, all requests run through Rust `reqwest` with **zero CORS restrictions**.
2. **Offline Local Storage**:
   Draft tabs and collections live exclusively on your machine. Ensure you back up your local workspace files or track them with Git.
3. **Large Response Virtualization**:
   Responses larger than 2MB are automatically truncated in the live interactive editor to preserve interface responsiveness. Use **"Copy Full"** or **"Save to File"** to export entire responses without truncation.

---

## Contributing & Security

- Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture and code standards.
- For vulnerability reports, please review [SECURITY.md](SECURITY.md).

---

## License

OpenPost is released under the **[MIT License](LICENSE)**.
