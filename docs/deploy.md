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
klk.example.com {
	reverse_proxy 127.0.0.1:3334
}
```

Caddy terminates TLS (ACME automatic) and proxies the same origin — the
relay answers `wss://klk.example.com` WebSocket upgrades and `https://`
static/SPA requests on one port, so the PWA's default `RELAY_URL` (same
host, `wss`) works with zero config.

## Verify

```sh
curl https://klk.example.com/healthz   # ok
curl -I https://klk.example.com/       # 200, the PWA
```

## Local E2E

`docker compose up` → app at http://localhost:3334 with a seeded demo
circle. `docker compose --profile tunnel up` adds a public cloudflared
URL. `./scripts/smoke.sh` runs the full check (build, healthz, SPA, seed,
client e2e).
