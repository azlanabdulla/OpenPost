# Contributing to OpenPost

Thank you for your interest in contributing to OpenPost — the free, open-source Postman alternative!

## Core Principles
1. **Local-First & Zero Telemetry**: We never add accounts, cloud synchronization, or behavioral tracking telemetry.
2. **Safe Secrets**: Never log or print authorization headers, cookies, or secrets in plaintext.
3. **Strict Typing & Test Coverage**: Every feature and bugfix must include automated unit tests.
4. **Tauri 2 Architecture**: Keep Tauri commands small, typed, and minimal in permissions.

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start frontend dev server
npm run dev

# 3. Run typecheck & tests
npm run typecheck
npm test
```

## Pull Request Guidelines
- Branch from `main`.
- Ensure all tests pass (`npm test`) and typechecks succeed (`npm run typecheck`).
- Follow the existing commit message structure and conventions.
