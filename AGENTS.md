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

### Parallel Dev Runner

Run both iOS and Android in parallel via tmux:

| Command               | What it does                             |
| --------------------- | ---------------------------------------- |
| `bun run dev`         | Start all: relay + Metro + iOS + Android |
| `bun run dev:ios`     | Start relay + Metro + iOS only           |
| `bun run dev:android` | Start relay + Metro + Android only       |
| `bun run dev:stop`    | Kill the tmux session and all processes  |
| `bun run dev:status`  | Check if dev session is running          |

**Session name**: `klk-dev` (fixed)

**Tmux controls**:

- Attach: `tmux attach -t klk-dev`
- Detach: `Ctrl+b`, then `d`
- Switch pane: `Ctrl+b`, then arrow keys
- Scroll: `Ctrl+b`, then `[`
- Read pane output: `tmux capture-pane -t klk-dev:0.metro -p -S -50`

**Dangling sessions**: If an agent session ends without running `bun run dev:stop`, the tmux session persists. The next run detects and recreates it. Manually kill with `tmux kill-session -t klk-dev`.

**Important**: Metro "connected" does NOT mean the app rendered. Verify with `agent-device` or by checking the simulator/emulator visually.

**Prerequisites**: `brew install tmux` (tmux must be installed)

## Hard Freeze (in effect until M1 ships — target 2026-06-04)

**No renames, no architectural refactors, no formatter config changes, no Expo SDK upgrades, no native dep upgrades.**
Bug fixes and M1 hardening only. If you're about to write a `refactor:` or `style:` commit — stop and check with the user first.

See `docs/roadmap.md` for the full M1 scope and non-goals.

## Known Traps — Tripwire List

Fuzzy search the notepad before touching any of these areas:

```
demongrep search "<what you're about to do>" .agents/notepad/
```

**Load-bearing traps (don't touch without reading the notepad first):**

1. **expo-modules-core / expo-image patches** → read `.agents/notepad/2026-05-25-expo-modules-core-reified-fix.md` and `2026-05-25-expo-image-android-build-fix.md` before touching patches or any Kotlin `reifiedOperationMarker` / `typeDescriptorOf` call sites.
2. **`ndk.connect()`** → always pass `timeoutMs`. See `.agents/notepad/2026-05-25-klk-nostr-mobile-implementation.md`.
3. **`@expo/ui` BottomSheet** → use RN `Modal` for new sheets. The `@expo/ui BottomSheet` was flipped and reverted twice this cycle. See `.agents/notepad/2026-05-28-no-expo-ui-bottomsheet.md`.
4. **Android-only native components (FAB, FieldGroup, etc.)** → `null` stub for Metro cross-platform resolution only; never use a Pressable fake. See `.agents/notepad/2026-05-28-no-cross-platform-fake-native.md`.
5. **Any repo-wide rename** → hard freeze. Requires user sign-off + 3 confirmed usages minimum. See `.agents/notepad/2026-05-28-no-rename-without-evidence.md`.

**Naming:** Private groups are *Circles*, not Groups. Do NOT rename.

**MapLibre:** Existing code stays. Do NOT use MapLibre for new map work — use `react-native-maps` or `expo-maps`.

**`@expo/ui` Host boundary:** `@expo/ui` components must be wrapped in `<Host>` from the matching platform package. Use platform-split files (`.android.tsx`, `.ios.tsx`) for any component using `@expo/ui`. See `apps/events/AGENTS.md` and `.agents/notepad/2026-05-27-expo-ui-host-boundary.md`.

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
