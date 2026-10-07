# Deploy — <1GB VPS, systemd + Caddy

The app is a single Go binary serving both the Nostr relay (WS) and the
built PWA. BoltDB lives on a data volume. No Postgres, no Redis.

## Build

```sh
# on the VPS (or CI): produce the binary + PWA dist
docker build -t klk:latest .
# or cross-build locally and ship the artifacts
```

Or without Docker on the host:

```sh
cd apps/relay && go build -o /usr/local/bin/klk-relay ./cmd/klk-relay
cd apps/pwa && pnpm build            # produces dist/client
```

## PWA build-time env (`apps/pwa`)

All optional — defaults keep local dev working with zero config.

| Var | Purpose | Prod example |
| --- | --- | --- |
| `VITE_APP_ORIGIN` | absolute origin for share/invite links | `https://app.pinya.club` |
| `VITE_API_ORIGIN` | origin for API calls (cohort, ICS feeds) | `https://api.pinya.club` |
| `VITE_RELAY_URL` | WebSocket relay URL | `wss://api.pinya.club` |
| `VITE_COHORT_GATE` | `0` disables the email gate | unset (on) |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog EU analytics | `phc_…` / `https://eu.i.posthog.com` |
| `VITE_MAX_RANGE_DAYS` | calendar range cap | `21` |

Note: split `app.`/`api.` origins break same-origin WS cookies — none used,
auth is NIP-42 over the socket itself, so a separate `api.` host is fine.

## Cohort emails

`POST /api/cohort` appends `{email,ts,ua}` to `$DATA_DIR/cohort.jsonl`
(mode 0600, per-IP 5s throttle). Nothing else to run.

## systemd

`/etc/systemd/system/klk.service`:

```ini
[Unit]
Description=klk relay + PWA
After=network.target

[Service]
User=klk
Group=klk
Environment=ADDR=127.0.0.1:3334
Environment=DATA_DIR=/var/lib/klk
Environment=STATIC_DIR=/var/lib/klk/pwa
ExecStart=/usr/local/bin/klk-relay
Restart=on-failure
RestartSec=3
# resource budget: fits the <1GB VPS alongside Caddy + sshd
MemoryMax=384M
ProtectSystem=strict
ReadWritePaths=/var/lib/klk
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```sh
sudo useradd -r -m -d /var/lib/klk klk
sudo cp -r apps/pwa/dist/client /var/lib/klk/pwa
sudo chown -R klk:klk /var/lib/klk
sudo systemctl enable --now klk
```

## Caddy

`/etc/caddy/Caddyfile`:

```caddyfile
api.pinya.club {
	reverse_proxy 127.0.0.1:3334
}

app.pinya.club {
	reverse_proxy 127.0.0.1:3334
}
```

Caddy terminates TLS (ACME automatic). One binary serves relay WS, API
(`/api/*`), and static/SPA on the same port; `app.` and `api.` can share
the target — set `VITE_APP_ORIGIN`/`VITE_API_ORIGIN`/`VITE_RELAY_URL` at
PWA build time to match. For a single-domain deploy, leave them unset:
the defaults resolve everything same-origin.

## Verify

```sh
curl https://api.pinya.club/healthz        # ok
curl -I https://app.pinya.club/            # 200, the PWA
curl -X POST https://api.pinya.club/api/cohort \
  -H 'Content-Type: application/json' -d '{"email":"test@pinya.club"}'  # 204
cat /var/lib/klk/cohort.jsonl            # the collected email
```

## Local E2E

`docker compose up` → app at http://localhost:3334 with a seeded demo
circle. `docker compose --profile tunnel up` adds a public cloudflared
URL. `./scripts/smoke.sh` runs the full check (build, healthz, SPA, seed,
client e2e).
