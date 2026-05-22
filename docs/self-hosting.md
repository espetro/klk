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
version: "3.8"
services:
  relay:
    image: scsibug/nostr-rs-relay:latest
    volumes:
      - ./data:/usr/src/app/db
      - ./config.toml:/usr/src/app/config.toml
    ports:
      - "8080:8080"
    restart: unless-stopped
```

```bash
docker compose up -d
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

Edit `lib/nostr/ndk.ts`:

```ts
export const RELAY_URL = "wss://relay.yourdomain.com";
export const RELAYS = [RELAY_URL];
```

Then rebuild the app:

```bash
bun ios   # or: bun android
```

Runtime relay switching (no rebuild required) is planned for a future release.

### Adding multiple relays (federation)

```ts
export const RELAYS = ["wss://relay.yourdomain.com", "wss://relay.damus.io"];
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
