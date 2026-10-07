# Klk — Local Events on Nostr

> Find and create events with your people. Private by design.

Klk (_qué lo qué_ — "what's up") is an open-source app for private group
events, built on the [Nostr protocol](https://nostr.com). No accounts. No
tracking. Your identity is a keypair that lives on your device.

This is the **v0 ground-up rebuild**. The previous Expo/RN spike is preserved
on the `legacy` branch. Design decisions live in
[`docs/spec/2026-10-07-v0-design.md`](docs/spec/2026-10-07-v0-design.md).

## Shape

- `apps/pwa` — TypeScript PWA (web-first; install via Add-to-Home-Screen)
- `apps/relay` — Go binary: Nostr relay (khatru) + product backend, one process
- `packages/` — `proto` (thin layer over nostr-tools), `core` (pure domain), `ui`

## Run

```bash
docker compose up    # relay + app + seed; --profile tunnel for a public link
```

## License

Apache License 2.0 — see `LICENSE` on the `legacy` branch (carried forward).
