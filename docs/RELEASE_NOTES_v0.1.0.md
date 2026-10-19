# OpenPost v0.1.0 (Pre-release)

> **The free, open-source Postman alternative. No account. No limits. Fully local.**

OpenPost v0.1.0 is our inaugural public pre-release. It delivers a fast, transparent, and private API testing desktop experience built with a native Rust backend and a reactive TypeScript interface.

---

## Highlights

- **Local-First & Zero Telemetry**: OpenPost never sends telemetry, tracking, or network requests behind your back. Every outbound request is initiated exclusively by you.
- **Native Rust HTTP Engine**: Zero CORS limitations, full support for streaming, custom timeouts, redirect limit controls, gzip decompression, multi-cookie inspection, and binary body handling.
- **Bi-Directional Query Sync**: Seamless two-way synchronization between the URL query bar and the parameters key-value table.
- **Postman v2.0/v2.1 & cURL Interoperability**: Full import support for Postman collections and environments, plus robust cURL command parsing with detailed reporting for unsupported flags.
- **Variable & Auth Inheritance**: Five-tier variable resolution (`request > folder > environment > collection > global`) with cycle detection and automatic authentication inheritance.
- **Privacy & Secret Protection**: Sensitive credentials (bearer tokens, passwords, API keys) are sanitized on storage and excluded by default on collection exports.
- **Accessible & Contrast Compliant**: Full WCAG 2.1 AA contrast compliance across both Light and Dark modes with smooth keyboard navigation and screen reader support.

---

## Installation & Platform Packages

Pre-compiled binary packages and cryptographically verified SHA-256 checksums are attached to the release assets:

| Platform | Package Format | Target Architecture |
| :--- | :--- | :--- |
| **Windows** | `.msi` / `.exe` installer | `x86_64-pc-windows-msvc` (64-bit Intel/AMD) |
| **macOS (Apple Silicon)** | `.dmg` | `aarch64-apple-darwin` (M1/M2/M3/M4) |
| **macOS (Intel)** | `.dmg` | `x86_64-apple-darwin` (64-bit Intel Mac) |
| **Linux** | `.AppImage` / `.deb` | `x86_64-unknown-linux-gnu` |

---

## Unsigned Installer Guidance

OpenPost is completely free and community-supported. Because code-signing certificates from commercial certificate authorities require recurring annual fees, official pre-release binaries are currently unsigned. Your operating system may display a security prompt upon first launch.

### Windows (Microsoft Defender SmartScreen)
1. Download and run the `OpenPost_0.1.0_x64-setup.exe` or `.msi`.
2. When Windows SmartScreen displays *"Windows protected your PC"*, click **More info**.
3. Click **Run anyway** to complete installation.

### macOS (Gatekeeper)
1. Open the `.dmg` and drag OpenPost to your `Applications` folder.
2. If macOS displays *"OpenPost cannot be opened because the developer cannot be verified"*:
   - Right-click (or Control-click) OpenPost in Finder and select **Open**.
   - In the prompt, click **Open**.
   - Alternatively, remove the quarantine attribute via Terminal:
     ```bash
     xattr -cr /Applications/OpenPost.app
     ```

### Linux (AppImage & DEB)
- **AppImage**: Make the binary executable before running:
  ```bash
  chmod +x OpenPost_0.1.0_amd64.AppImage
  ./OpenPost_0.1.0_amd64.AppImage
  ```
- **Debian / Ubuntu**:
  ```bash
  sudo dpkg -i openpost_0.1.0_amd64.deb
  ```

---

## Verifying Release Checksums

Every installer has an accompanying `.sha256` checksum file in the release assets. To verify your download:

### Windows (PowerShell)
```powershell
Get-FileHash -Path "OpenPost_0.1.0_x64-setup.exe" -Algorithm SHA256
Get-Content "OpenPost_0.1.0_x64-setup.exe.sha256"
```

### macOS / Linux
```bash
shasum -a 256 -c OpenPost.dmg.sha256
# or on Linux:
sha256sum -c OpenPost_0.1.0_amd64.AppImage.sha256
```

---

## Known Limitations

- **WebSocket / GraphQL**: Currently specialized for REST/HTTP requests. Dedicated WebSocket interactive inspectors and GraphQL schema explorers are planned in the roadmap.
- **Sandboxed JavaScript Scripts**: Pre-request and test assertions from Postman collections are skipped because OpenPost runs securely without an embedded arbitrary JS sandbox runtime.
- **OS Keychain Fallback**: On systems where OS keychain services are denied or unavailable (e.g. headless or restricted policy environments), credentials fall back gracefully to secure in-memory storage for the active session.

---

## Supporting the Project

OpenPost is free and open source under the MIT License. If OpenPost saves you time, consider supporting ongoing maintenance and official code-signing certificates:
- [Sponsor on GitHub](https://github.com/sponsors/azlanabdulla)
- [Star the Repository](https://github.com/azlanabdulla/OpenPost)
