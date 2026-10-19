# Contributing to OpenPost

Thank you for your interest in contributing to OpenPost — the free, open-source Postman alternative!

OpenPost is built by and for developers who value local-first privacy, speed, and transparency.

---

## 🧭 Core Principles

1. **Local-First & Zero Telemetry**: We never add accounts, cloud synchronization, or behavioral tracking telemetry.
2. **Safe Secrets**: Never log, print, or transmit authorization headers, cookies, or secrets in plaintext.
3. **Strict Typing & Test Coverage**: Every feature and bugfix must include automated tests.
4. **Tauri 2 Architecture**: Keep Tauri commands small, typed, and scoped to minimal OS permissions.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v20 or higher (`node -v`)
- **Rust**: Latest stable toolchain (`rustc --version`, `cargo --version`)
- **OS Build Tools**:
  - **Windows**: Visual Studio 2022 C++ Build Tools and Windows SDK.
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
  - **Linux (Ubuntu/Debian)**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libgtk-3-dev
    ```

### Initializing Workspace
```bash
# 1. Clone repository
git clone https://github.com/azlanabdulla/OpenPost.git
cd OpenPost

# 2. Install dependencies
npm ci

# 3. Run frontend dev server
npm run dev

# 4. Run desktop application in development mode
npm run tauri dev
```

---

## 🧪 Testing Guidelines

Before opening a pull request, all test suites must pass:

```bash
# 1. TypeScript Static Typecheck (0 errors)
npm run typecheck

# 2. Vitest Unit & Integration Suites (160+ tests)
npm test

# 3. Real Desktop E2E Tests (Against built binary)
npm run test:e2e

# 4. Rust Backend Tests
cd src-tauri
cargo test
cargo clippy -- -D warnings
```

---

## 🕵️ How We Verify Zero-Traffic

To prove that OpenPost makes **zero** unsolicited network calls, we enforce automated socket auditing:
```bash
# Run OS-level socket audit on running openpost.exe
node scripts/verify_os_traffic.cjs
```
The audit monitors all active TCP/UDP connections of `openpost.exe` during startup, idle state, and modal navigation. Any socket opened without explicit user action fails the test.

---

## 🌿 Branch Naming & PR Conventions

- **Branch Naming**:
  - `feat/<short-description>`: New features
  - `fix/<bug-description>`: Bug fixes
  - `docs/<topic>`: Documentation updates
  - `refactor/<subsystem>`: Code refactoring without behavior change
  - `perf/<benchmark>`: Performance optimizations
- **Pull Requests**:
  - Reference relevant issues (e.g. `Fixes #12`).
  - Include automated test coverage.
  - If making visual changes, attach screenshots in both Light and Dark themes.
