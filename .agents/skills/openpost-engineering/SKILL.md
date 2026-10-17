---
name: openpost-engineering
description: Implements and reviews OpenPost features,
including Tauri 2, Rust HTTP networking, React,
TypeScript, local persistence, API security and tests.
Use for all OpenPost implementation and review tasks.
---

# OpenPost Engineering Rules

- Follow the approved architecture and project conventions.
- Keep the application local-first, offline-capable
  except for requests explicitly sent by the user.
- Never add telemetry, accounts or cloud sync.
- Keep Tauri permissions minimal and validate inputs.
- Never log authorization headers, cookies or secrets.
- Keep Rust commands small, typed and well-tested.
- Use strict TypeScript and modular React components.
- Add tests for every feature and bug fix.
- Run lint, type checks, frontend tests and Rust tests
  before declaring a milestone complete.
- Never claim tests passed without running them.
- Never mark unimplemented features as complete.
- Ask before adding dependencies outside the approved
  permissive licenses or expanding the MVP scope.
- Implement only the current approved milestone.