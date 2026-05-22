# Contributing to Klk

Thanks for your interest in contributing. This guide covers everything you need to go from zero to a merged PR.

## Before You Start: CLA

All contributors must accept the [Contributor License Agreement](CLA.md) before their first PR can be merged. Accepting is simple: add your name to [CONTRIBUTORS.md](CONTRIBUTORS.md) as part of your PR.

## Prerequisites

```bash
# Nostr relay for local testing
brew install nak

# iOS simulator control (E2E tests)
npm install -g agent-device@latest

# E2E test runner
npm install -g @getgauge/cli
gauge install ts

# Package manager
# Install bun: https://bun.sh
```

You also need Xcode (for iOS builds) and Node.js ≥ 20.

## Development Setup

```bash
git clone https://github.com/yourusername/klk
cd klk
bun install

# Terminal 1: local relay
nak serve

# Terminal 2: app
bun ios
```

The app connects to `ws://localhost:10547` by default (the local `nak serve` relay).

## Running the Tests

```bash
# Run all E2E specs
bun run test:e2e

# Run a single spec
cd tests && gauge run specs/smoke.spec
```

Tests control the running iOS simulator via `agent-device`. Screenshots are saved to `tests/screenshots/`. The full HTML report is at `tests/reports/html-report/`.

All 6 flows must pass before a PR can be merged:

1. App launch → keypair generated → npub shown in profile
2. Feed → city-filtered public event visible
3. Event detail → RSVP → guest count increments
4. New event form → publish → appears in feed
5. Groups → new group → invite → recipient sees group
6. Group detail → new private event → encrypted on relay → decrypted for member

## Pull Request Guidelines

- **One flow per PR.** Smaller PRs are easier to review and less likely to conflict.
- **TypeScript strict.** The project uses `"strict": true` — no `any` unless unavoidable.
- **NativeWind for styles.** Use Tailwind class names; no inline `style={{}}` props.
- **No inline comments** unless the reason is non-obvious (a subtle invariant, a Hermes workaround, a NIP edge case).
- **Test coverage.** If you add a new flow or modify an existing one, update the corresponding Gauge spec in `tests/specs/`.

## Code Style

- Formatting: the project does not enforce Prettier or ESLint in CI yet, but follow the existing style (2-space indent, no semicolons in JSX where optional).
- Imports: group in order — React/RN → Expo → external → internal (`@/lib`, `@/components`).
- Nostr primitives: add new NIPs in `lib/nostr/`; expose them as hooks in `lib/hooks/`.

## Working with the Relay

The default relay URL lives in `lib/nostr/ndk.ts`. For custom relay work (self-hosting, federation), see [docs/self-hosting.md](docs/self-hosting.md).

## Issue Labels

| Label              | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `good first issue` | Isolated change, no Nostr protocol knowledge required  |
| `nostr-protocol`   | Requires understanding of a specific NIP               |
| `crypto`           | Touches encryption / key management — needs extra care |
| `ios`              | iOS-specific native issue                              |
| `android`          | Android-specific native issue                          |
| `relay`            | Related to relay configuration or self-hosting         |

## Questions

Open a GitHub Discussion or reach out at josocjoq+dev@pm.me.
