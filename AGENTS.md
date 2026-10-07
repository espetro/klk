# Klk — Agent Guide

Ground-up v0 rebuild. Spike history lives on the `legacy` branch — read it
for learnings, never port files wholesale.

**Spec of record:** `docs/spec/2026-10-07-v0-design.md` — read it before
changing anything. If code and spec disagree, the spec wins until the spec
is amended.

## Monorepo

- pnpm workspaces for TS (`apps/pwa`, `packages/*`), Go module in `apps/relay`.
- All commands via `pnpm` on the TS side; `go` toolchain on the Go side.
- `apps/pwa` runs on **One** (`onejs/one`) + Tamagui: SPA render mode, Node
  (not Bun) for `one dev`/`one build` — Bun crashes on its V8 callsite use.

## Rules

- `pnpm -r validate` (tsc + oxlint + oxfmt) and `go vet && gofmt -l . &&
  go test ./...` must pass before every commit — CI runs the same.
- Conventional commits, atomic deployable increments, no dead code.
- TS style: `interface` over `type` unless a union/alias is required; prefer
  wrapping maintained libraries behind thin adapters over in-house
  reimplementation; dependency ranges `^x.y`, never pinned-exact.
- Nostr access only through `packages/proto` — no raw `nostr-tools` calls in
  app code, no NDK.
- No bulk-read/export endpoints anywhere in the agent surface — scoped
  capability tools only (see spec §5).
- Keep resource use small: the deploy target is a <1GB VPS; no Postgres,
  no Redis, no heavyweight services in the compose stack.

## Hard traps (carried from the spike notepad)

- "Connected" is not "working" — verify behavior end-to-end, not just that
  a dev server or relay socket is up.
- Two implementations of the same UI/domain component will diverge — there
  is exactly one `EventForm` equivalent in v0, in `packages/ui`.
