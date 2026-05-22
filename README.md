# Klk — Local Events on Nostr

> Find and create events in your city. Private by design.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Built with Expo](https://img.shields.io/badge/built%20with-Expo%2055-000020.svg)](https://expo.dev)
[![Nostr](https://img.shields.io/badge/protocol-Nostr-purple.svg)](https://nostr.com)

Klk (_qué lo qué_ — "what's up") is an open-source mobile app for discovering and creating local events, built on the [Nostr protocol](https://nostr.com). No accounts. No tracking. Your identity is a keypair that lives on your device.

---

## Vision

Most event platforms are closed gardens: your data, your social graph, your RSVPs — all locked inside one company. Klk is different:

- **Protocol, not platform.** Events are Nostr notes — any Nostr client can read them.
- **Localized but globally reachable.** Every city gets its own feed. Anyone anywhere can run a relay for their community.
- **Private when it matters.** Public events are open. Private groups are end-to-end encrypted.
- **Infrastructure optional.** Small groups need nothing beyond the app. Enterprises can run their own relay and brand their own fork.

This is not a for-profit social network. The goal is to make local community infrastructure as easy to adopt as a messaging app, and as hard to monopolize as email.

---

## Features

| Flow           | What it does                                 | Nostr primitive      |
| -------------- | -------------------------------------------- | -------------------- |
| Join a city    | Auto-generated keypair, pick your city       | NIP-01 keypair       |
| Browse events  | City-filtered public event feed              | NIP-52 kind 31923    |
| RSVP           | One-tap RSVP, live guest count               | NIP-52 kind 31925    |
| Create event   | Publish events with title, time, location    | NIP-52 kind 31923    |
| Private groups | Invite friends via encrypted DM              | NIP-44 + NIP-59      |
| Group events   | Encrypted events only group members can read | kind 30078 + AES-GCM |

---

## Getting the App

- **iOS**: TestFlight — _coming soon_
- **Android**: Google Play — _coming soon_
- **Privacy-first / alternative markets**: F-Droid and [Obtainium](https://github.com/ImranR98/Obtainium) builds are planned for users who prefer not to use Apple or Google distribution channels.

---

## Developer Quick Start

### Prerequisites

```bash
brew install nak          # local Nostr relay for testing
npm install -g agent-device@latest   # iOS simulator control for E2E tests
npm install -g @getgauge/cli && gauge install ts  # E2E test runner
```

You also need [Bun](https://bun.sh), Xcode (for iOS), and an Apple Developer account for device builds.

### Run locally

```bash
# 1. Clone and install
git clone https://github.com/yourusername/klk
cd klk
bun install

# 2. Start the local relay (in a separate terminal)
nak serve

# 3. Build and launch on iOS simulator
bun ios
```

The app connects to `ws://localhost:10547` by default. For a production relay, change `RELAY_URL` in `lib/nostr/ndk.ts`.

### Run E2E tests

```bash
bun run test:e2e
```

Tests use [Gauge](https://gauge.org) + agent-device to control the running simulator and validate all 6 flows. Screenshots are saved to `tests/screenshots/`.

---

## Architecture

```
Klk (Expo 55 / React Native 0.83.6)
  ├── Expo Router      file-based navigation (tabs + modal screens)
  ├── NativeWind       Tailwind CSS for React Native
  ├── NDK Mobile       Nostr protocol client with SQLite cache
  ├── expo-secure-store  private key + group symmetric keys
  └── @noble/ciphers   AES-GCM encryption (Hermes-compatible)

Relay
  ├── Default: wss://relay.klk.app  (hosted, open for public events)
  └── Self-hosted: any NIP-01 compliant relay (nak, nostr-rs-relay, strfry)
```

See [docs/architecture.md](docs/architecture.md) for the full technical deep-dive.

---

## Relay Options

By default Klk connects to `wss://relay.klk.app`. You can point it at any Nostr relay:

- **Public relays**: `wss://relay.damus.io`, `wss://nos.lol`, etc.
- **Self-hosted**: run your own relay for full control. See [docs/self-hosting.md](docs/self-hosting.md).

Runtime relay switching (UI in the Profile screen) is planned for a future release. For now, edit `lib/nostr/ndk.ts`.

---

## Business Adoption

Klk is designed to be adopted at different levels:

- **No infra needed**: create a private group in the app and invite your team. Events are AES-GCM encrypted; outsiders only see ciphertext.
- **Custom relay**: run `nostr-rs-relay` or `strfry` on your domain. Point the app at your relay. Your data stays on your infrastructure.
- **Branded fork**: fork this repo, change the theme and bundle ID, submit to your own App Store account. Apache 2.0 allows this — we just ask that you keep a link to the original project.

See [docs/self-hosting.md](docs/self-hosting.md) for setup guides.

---

## Contributing

Contributions are welcome. Before your first PR, you must accept the [Contributor License Agreement](CLA.md) by adding your name to [CONTRIBUTORS.md](CONTRIBUTORS.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, PR guidelines, and code style.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

Combined with the CLA, this allows the project to offer a commercial license in the future while keeping the open-source version free. You can build proprietary apps on top of Klk today; if value extraction becomes a concern, a commercial license tier may be introduced without breaking existing Apache 2.0 users.
