# Self-Hosting a Relay

This guide covers running your own Nostr relay and connecting Klk to it. Self-hosting gives you full control over data retention, moderation, and access policies.

---

## Why Self-Host?

| Use case                 | What you get                                  |
| ------------------------ | --------------------------------------------- |
| Enterprise / compliance  | Events stay within your infrastructure        |
| Private community        | Restrict write access to your members only    |
| Branded experience       | Combine a custom relay with a forked Klk app  |
| Privacy-first deployment | No third-party relay sees your event metadata |

---

## Option A: `nak serve` (local dev / evaluation)

`nak` ships a minimal in-memory relay, perfect for testing:

```bash
brew install nak   # or: go install github.com/fiatjaf/nak@latest
nak serve          # starts ws://localhost:10547
```

State is lost on restart. Not suitable for production. Ideal for running E2E tests.

---

## Option B: `nostr-rs-relay` (production, SQLite)

A lightweight Rust relay with SQLite persistence.

```bash
# Install Rust if needed
curl https://sh.rustup.rs -sSf | sh

# Build
git clone https://github.com/scsibug/nostr-rs-relay
cd nostr-rs-relay
cargo build --release

# Configure
cp config.toml.sample config.toml
# Edit config.toml: set data_directory, relay_url, etc.

# Run
./target/release/nostr-rs-relay
```

Default port: `8080`. Set `relay_url = "wss://relay.yourdomain.com"` in config.

---

## Option C: `strfry` (production, high throughput)

`strfry` is a C++ relay with LMDB storage, suitable for large communities.

```bash
git clone https://github.com/hoytech/strfry
cd strfry
git submodule update --init
make setup-golpe
make -j4

cp strfry.conf strfry.local.conf
# Edit strfry.local.conf: db path, bind port, etc.

./strfry relay --config strfry.local.conf
```

---

## Docker Compose (nostr-rs-relay)

```yaml
version: '3.8'
services:
  relay:
    image: scsibug/nostr-rs-relay:latest
    volumes:
      - ./data:/usr/src/app/db
      - ./config.toml:/usr/src/app/config.toml
    ports:
      - '8080:8080'
    restart: unless-stopped
```

```bash
docker compose up -d
```

---

## Klk Relay (rootless Podman + Quadlet + Cloudflare Tunnel)

Klk ships a pre-configured `strfry` relay in `apps/relay/` designed for production self-hosting on a VPS behind a Cloudflare Tunnel.

**Key features:**
- strfry + Node.js write-policy plugin (hot-reloading allowlist)
- Rootless Podman + Quadlet (systemd-native, daemonless, auto-restart)
- Bound to `127.0.0.1:3100` (TLS handled by Cloudflare)
- Persistent storage outside the repo
- Metrics + maintenance cron

**Setup** (~15 min):

1. Check out the repo at `~/klk` on your VPS
2. Follow the [deployment checklist](../apps/relay/README.md)
3. Allow your keys: `./apps/relay/bin/klk-allow.sh npub1...`
4. Seed test data: `KLK_RELAY_URL=wss://nostr.illo.fyi bun run seed`

**Configure in EAS:**

```bash
eas env:create --name EXPO_PUBLIC_RELAY_URL --value wss://nostr.illo.fyi \
  --environment production --visibility sensitive
eas env:create --name EXPO_PUBLIC_RELAY_URL --value wss://nostr.illo.fyi \
  --environment preview --visibility sensitive
```

---

## TLS + Nginx Reverse Proxy

Nostr relays require WebSocket (`ws://`) locally but **must** use `wss://` in production. Use Nginx + Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name relay.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/relay.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Obtain a certificate: `certbot --nginx -d relay.yourdomain.com`

---

## Connecting Klk to Your Relay

Set `EXPO_PUBLIC_RELAY_URL` at build time — no source edits required:

```bash
# Local dev (.env.local, gitignored)
EXPO_PUBLIC_RELAY_URL=wss://relay.yourdomain.com

# EAS build (server-managed, keeps URL out of git)
eas env:create --name EXPO_PUBLIC_RELAY_URL --value wss://relay.yourdomain.com \
  --environment production --visibility sensitive
```

The relay URL lives in `packages/infrastructure/src/nostr/ndk.ts`. When
`EXPO_PUBLIC_RELAY_URL` is unset (local dev), it falls back to the local `nak`
relay (`ws://localhost:10547` on iOS, `ws://10.0.2.2:10547` on Android).

Rebuild to pick up the new URL:

```bash
bun ios   # or: bun android
```

> Note: in-app relay switching is not yet supported. Colleagues who want to
> point at a different relay must rebuild with their own `EXPO_PUBLIC_RELAY_URL`.

### Adding multiple relays (federation)

Edit `packages/infrastructure/src/nostr/ndk.ts` and extend `RELAYS`:

```ts
export const RELAYS = [RELAY_URL, 'wss://relay.damus.io'];
```

NDK will subscribe to and publish on all listed relays automatically.

---

## Restricting Write Access

Most relay implementations support an allowlist of pubkeys that can write. Example for `nostr-rs-relay` in `config.toml`:

```toml
[authorization]
pubkey_whitelist = [
  "f7c6644f01e8cba936c7...",   # your pubkey
  "abc123..."                   # team member
]
```

For `strfry`, use a write policy plugin:

```bash
# strfry.local.conf
writePolicy.plugin = "./myplugin.js"
```

See the strfry docs for the plugin API.

---

## Business Adoption Paths

### Small business / association

No infrastructure needed. Create a private group in the Klk app, invite members. Events are AES-GCM encrypted; even the default relay cannot read them.

### Enterprise / branded experience

1. Stand up your own relay (Docker option above takes ~10 minutes).
2. Fork this repo, update `RELAY_URL`, update the app name and bundle ID.
3. Submit to your own Apple Developer / Google Play account.
4. Optionally restrict relay write access to your organisation's pubkeys.

Your users' events never touch a third-party server. The app can enforce your design system and brand while remaining Nostr-compatible — other Nostr clients can still read your public events.

---

## Privacy Notes for Relay Operators

As a relay operator you can see:

- Event pubkeys and timestamps
- Public event content (kind 31923, kind 31925)
- The _existence_ of gift-wrapped invites (kind 1059) and private group events (kind 30078), but **not their content**

You cannot see:

- Any user's private key
- Group symmetric keys
- Plaintext of encrypted events
