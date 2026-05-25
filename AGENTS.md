# Klk — Agent Guide

AI agent context for the Klk monorepo (Nostr events app).

## Project Overview

Klk is a Nostr-native events app built with Expo + React Native. Users discover and create public/private events, join city feeds, and manage private groups with end-to-end encryption.

## Key Documentation

| Document                            | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `docs/architecture.md`              | Full technical architecture — stack, flows, data model, migration |
| `CONTRIBUTING.md`                   | Dev guidelines — setup, testing, PR style                         |
| `docs/ux-flows.md`                  | 6 user flows with acceptance criteria                             |
| `docs/self-hosting.md`              | Relay self-hosting guide                                          |
| `packages/core/AGENTS.md`           | Domain layer — pure TypeScript, neverthrow, valibot               |
| `packages/infrastructure/AGENTS.md` | Adapter layer — NDK, storage, crypto                              |
| `packages/ui/AGENTS.md`             | Shared UI — Expo UI (native), UniWind utilities, theme            |
| `apps/events/AGENTS.md`             | Main app — Expo Router, E2E testing, features                     |

## Agent Workflow

1. **Run validation**: `bun run validate` (typecheck, lint, format, bundle)
2. **Check deps**: `bun run depcruise` (circular dependency check)
3. **Use bun**: This is a bun monorepo. All package commands via `bun run`
4. **Read per-package AGENTS.md** before modifying code in that package
5. **E2E testing**: See `apps/events/AGENTS.md` for Gauge + agent-device workflow

### **Build fixes & workarounds:**

See `.agents/notepad/` for a running log of dependency and build issues that have blocked simulator runs, with root-cause analysis and fixes. In case you find an issue during dependency and build management, please add a new file entry following the format `<date>-<topic>.md`.

### Before every single commit

Verify there's no regressions introduced by running `bun run validate`

### Commit style

- Atomic commits: Work in small, focused increments. Every commit should follow the criteria:
  - Pass CI: locally use `bun run validate` (matches what's ran in CI)
  - Be deployable: application is in a valid state
  - Introduce no dead code: no unreachable code, unused imports, or half-wired features
- Conventional commit name and description format

## Backward Compatibility

`CLAUDE.md → AGENTS.md` symlinks exist at root and in each package for Claude Code compatibility. Do NOT create new `CLAUDE.md` files.

## Stack Summary

- **Framework**: Expo / React Native (Hermes JS engine)
- **Routing**: Expo Router (file-based, tab + modal)
- **UI**: Tailwind v4 and Expo UI (native) components, otherwise fallback to JSX components
- **State**: nanostores (atomic, tree-shakeable)
- **Nostr client**: `@nostr-dev-kit/ndk-mobile`
- **Validation**: valibot (tree-shakeable, ~300B/schema)
- **Error handling**: neverthrow Result<T, E> (no exceptions)

## Package Overview

```
apps/events/                Thin shell: Expo Router + glue hooks
packages/core/              Pure domain: ZERO React Native deps
packages/infrastructure/    Adapters: NDK, storage, crypto
packages/ui/                Shared UI components and theme
```
