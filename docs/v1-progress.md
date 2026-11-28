# v1 progress ledger

The handoff mechanism across hourly passes. Rules for the pass session:

- Pick the NEXT unchecked item that fits in one pass. Small merged
  increments beat big unmerged ones.
- Research items produce docs in `docs/research/`; implementation items
  produce working code. Both get checked off here in the PR that ships
  them.
- Add newly discovered work at the bottom of the right phase.
- Spec of record for decisions: `docs/spec/2026-11-27-v1-productization.md`.

## Phase 1 — visual polish + forms foundation

- [ ] Tamagui theme polish: typography scale, spacing rhythm, dark-ready
      palette tokens
- [ ] EventForm migrated to formisch + valibot (the canonical form —
      everything else copies it)
- [ ] Remaining forms migrated (circle create, profile, suggestion,
      AI settings)
- [ ] URL-state for UI state: active tab, toggles, filters, expanded
      sections — agents must be able to drive the app by URL alone
- [ ] Fix known visual residuals: Tamagui font-size warnings (RN dev
      banner covering tab bar = the `+ New` dead-tap cause on iOS sim)

## Phase 2 — shareable-core

- [ ] P2P/local-first spike → `docs/research/p2p-spike.md`
- [ ] Local-first cache hardening per spike outcome (outbox, offline
      reads, reconnect sync)
- [ ] tanstack-query over relay reads
- [ ] No-auth join flow polish: guest joins event via link, zero friction
- [ ] Multi-relay config: regional default server, user-addable servers
- [ ] Relay sharding research → `docs/research/relay-sharding.md`

## Phase 3 — public circles + discovery

- [ ] Recommendation research → `docs/research/recommendation.md`
- [ ] Public circles: anyone-can-post events
- [ ] Visibility/recommendation surface
- [ ] Friends management

## Phase 4 — agent companion

- [ ] ACP vs in-app harness evaluation → `docs/research/agent-companion.md`
- [ ] In-app harness (builds on shipped AI integration)
- [ ] Member-facing agent activity view (deferred from v0 spec §5)

## Phase 5 — OTP email auth (only if crypto identity insufficient)

- [ ] OTP architecture spike
- [ ] Loopback dev endpoint for agent automation

## Wave-E residuals from v0 (fold into phases as convenient)

- [ ] Native locate button inert (no navigator.geolocation)
- [ ] Map pin-picking on native (search-and-pin only today)
- [ ] React Compiler verification on native babel path
- [ ] Real-device passkey check (never testable on sims)
- [ ] Revoked agents keep open subscriptions — relay must re-validate
      scope liveness at broadcast time (escalated from PR #25 review)
- [ ] EventForm controlled-inputs refactor — AI draft remount wipes
      unrelated edits (escalated from PR #25 review; subsumed by formisch
      migration)

## Log

- 2026-11-28 — pass 1 (this session): EventForm on formisch+valibot,
  per-field errors, cross-field ends>starts check, golden E2E green.

- 2026-11-27 — v1 spec + ledger committed. Automation set to ping the
  working session hourly at :20.
