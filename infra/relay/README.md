# Klk Relay — Deploy Runbook

strfry relay behind Caddy + Cloudflare. Handles kinds 31923, 31925, 1059, 30078.
Write access requires allowlist membership; reads are always open.

## Prerequisites

- Docker Engine + compose plugin
- A Cloudflare-proxied subdomain (`relay.<domain>`)
- A Cloudflare Origin Certificate for that subdomain

## First-time setup

### 1. Place TLS certificates

```bash
mkdir -p certs
# Paste Cloudflare Origin Certificate → certs/origin.pem
# Paste private key                   → certs/origin-key.pem
chmod 600 certs/origin-key.pem
```

### 2. Configure your domain

Edit `Caddyfile` — replace `relay.yourdomain.com` with your actual subdomain.

### 3. Start

```bash
docker compose up -d
docker compose logs -f
```

### 4. Verify

```bash
# WebSocket reachable through Cloudflare
wscat -c wss://relay.yourdomain.com

# Write rejected for non-allowlisted key (expected)
nak event --kind 31923 --content "test" ws://localhost:7777

# Containers within resource caps
docker stats
```

## Managing the allowlist

```bash
# Add by npub (requires nak in PATH)
./bin/klk-allow.sh npub1xxxxxxxxxx

# Add by hex pubkey directly
./bin/klk-allow.sh f7c6644f01e8cba936c7...

# View current list
grep -v '^#' write-policy/allowlist.txt
```

No restart needed — the plugin hot-reloads on file change.

## Maintenance

### Compact LMDB (reclaim space after retention prunes old events)

```bash
docker compose exec strfry strfry compact
```

Recommended: run weekly via cron.

### Stats

```bash
./bin/relay-stats.sh
```

Outputs JSON with per-kind event counts and DB size.

### Suggested crontab

```cron
# Compact weekly (Sunday 3am UTC)
0 3 * * 0 cd /opt/klk-relay && docker compose exec -T strfry strfry compact

# Stats every 10 minutes
*/10 * * * * cd /opt/klk-relay && ./bin/relay-stats.sh >> /var/log/klk-relay-stats.jsonl
```

## Seeding from local dev

```bash
# From repo root — point seed script at the live relay
KLK_RELAY_URL=wss://relay.yourdomain.com bun run seed
```

## Upgrading strfry

```bash
docker compose pull strfry
docker compose up -d strfry
```

## Directory layout

```
infra/relay/
  docker-compose.yml      strfry + caddy, with CPU/mem caps
  strfry.conf             retention, limits, write-policy plugin hook
  Caddyfile               TLS termination + WS reverse proxy to strfry
  write-policy/
    allowlist.txt         hot-editable hex pubkeys, one per line
    write-policy.js       strfry write-policy plugin (stdin/stdout JSON)
  bin/
    klk-allow.sh          add an npub/hex to allowlist (no restart)
    relay-stats.sh        event counts by kind + DB size
  certs/                  Cloudflare Origin cert + key (gitignored)
  strfry-db/              LMDB data (gitignored)
  caddy-data/             Caddy ACME data (gitignored)
  caddy-config/           Caddy runtime config (gitignored)
```
