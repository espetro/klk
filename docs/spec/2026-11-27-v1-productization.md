# v1 productization — shareable klk

Status: active. Owner of record: the hourly automation pass session.
Decided 2026-11-27 with Quim. These decisions are settled — implement them,
don't re-litigate. When research concludes something that changes them,
amend this doc in the same PR.

## Goal

A version of klk the user can share with colleagues: works across mobile
and web, local-first, multi-relay, with the circle → invite → event → RSVP
loop intact from v0.

## Settled decisions

- **Design system: keep Tamagui** (one codebase, web+native). Polish it —
  typography, spacing, palette. Prefer native components (expo/ui,
  expo/exact) where they genuinely win over the cross-platform ones.
- **Evolve klk in place** — incremental migration, keep history. No fresh
  repo, no big-bang rewrite.
- **Priority order**: visual polish + forms foundation FIRST ("it should
  look right before anyone sees it"), then shareable-core, then discovery,
  companions, auth fallback.
- **State management**: nanostores (in place) + URL state wherever
  possible — including toggles, filters, and UI state — so agents can
  drive the app by manipulating URLs alone.
- **Server state**: tanstack-query over relay reads.
- **Forms**: formisch. **Validation**: valibot — replaces the hand-rolled
  field-by-field guards incrementally (note: the AI spec asked for
  zod-less guards because no validation lib existed; valibot is now the
  sanctioned lib, amend specs as you migrate).
- **Toolchain**: latest typescript, oxlint, oxfmt, vitest/node test,
  pnpm with global cache. `pnpm validate` + `go vet && gofmt -l . && go
  test ./...` green before every commit.
- **Auth**: NOT required for basic use (joining an event). Accounts for
  managing events/circles/connections. Crypto identity (already shipped)
  is the primary; OTP email + passkey is the fallback for colleagues —
  if built, it needs a loopback dev endpoint so agents can automate it.
- **Multi-relay**: users connect to one or more nostr servers — think
  mastodon instances or WoW realms. Default: their region's server.
  Servers shard regionally for load, with further splits by
  location-bound or other metadata keys.
- **Local-first is a hard requirement**: server down/unreachable → the
  app works on cached data or even P2P. Requires a spike before
  implementation.
- **Public circles**: anyone can create an event; visibility earned via a
  recommendation algorithm.
- **Agent companion**: users configure their own — evaluate both
  ACP-style (external process) and in-app harness. In-app first since the
  AI integration already exists; the evaluation is a research item.

## Phase plan

1. **Visual polish + forms foundation** — Tamagui theme polish,
   dark-ready palette; migrate forms to formisch+valibot starting with
   EventForm; URL-state for toggles/filters/UI state.
2. **Shareable-core** — no-auth join flow polish (guest joins event via
   link); local-first cache hardening + P2P spike writeup; tanstack-query
   for relay reads; multi-relay config with regional defaults.
3. **Public circles + discovery** — anyone-can-post events,
   recommendation/visibility surface, friends management.
4. **Agent companion** — in-app harness first, ACP-style evaluation.
5. **OTP email auth** — with loopback dev endpoint, only if crypto
   identity proves insufficient for colleagues.

## Hard rules (carried, still binding)

- Nostr access only through `packages/proto`; no NDK; no bulk-read/export
  endpoints anywhere.
- Relay stays Go + khatru + BoltDB single binary; no Postgres/Redis; the
  deploy target is a <1GB VPS.
- TS style: `interface` over `type`; dependency ranges `^x.y`;
  conventional commits.
- iOS CI jobs never run on PRs (private repo, macOS minutes billed 10×) —
  main/nightly/tags only.
- Merge gate: a passing E2E test run by the session itself, NOT user
  approval. Squash-merge with `command gh pr merge N --squash` once
  green. Branch fresh off origin/main per increment.
- E2E harness: `klk-next-testing` skill — relay on :3334 with AI env
  (`AI_UPSTREAM_URL=https://openrouter.ai/api/v1/chat/completions`, key
  from `$AI_API_KEY_PAID`, model `openai/gpt-oss-20b`), playwright +
  virtual WebAuthn authenticator. Rebuild the PWA dist before browser
  E2E.

## Research items (spike before implementing)

- **P2P/local-first sync**: what carries events when the relay is
  unreachable — WebRTC mux/nostr-over-websocket-p2p, CRDT-ish merge of
  replaceable events, or cache-and-forward outbox? Deliverable:
  `docs/research/p2p-spike.md` with a recommendation.
- **ACP vs in-app agent harness**: protocol fit, what Claude-Code-style
  ACP would mean for a nostr app, capability mapping onto kind-34134
  scopes. Deliverable: `docs/research/agent-companion.md`.
- **Recommendation algorithm** for public-circle visibility: what is
  computable relay-side vs client-side without violating the moat rule.
  Deliverable: `docs/research/recommendation.md`.
- **Regional relay sharding**: metadata-keyed partitioning, cross-shard
  discovery, what "regional default" means for identity portability.
  Deliverable: `docs/research/relay-sharding.md`.
- **OTP email auth architecture**: loopback dev endpoint design,
  multi-service backend implications for the nostr relay.
  Only if phase 5 activates.

## Progress ledger

The ledger is `docs/v1-progress.md` — check items off in the PR that
ships them, add discoveries, keep it current. It is the handoff
mechanism across passes.
