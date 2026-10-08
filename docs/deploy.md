# Deploy — CF Pages + VPS behind cloudflared

Topology: the PWA is a static site on **Cloudflare Pages**
(`app.pinya.club`); the relay is a single Go binary on a small VPS
(`api.pinya.club`) reachable only through a **cloudflared tunnel** — the
VPS keeps every inbound port closed, so its IP is never exposed. BoltDB
lives on the VPS disk. No Postgres, no Redis, no Caddy, no TLS cert on
the box (the tunnel terminates at Cloudflare).

## 1. PWA → Cloudflare Pages (`app.pinya.club`)

Pages project settings (dashboard → Workers & Pages → Create → Connect
to Git → `espetro/klk`):

| Setting        | Value                                          |
| -------------- | ---------------------------------------------- |
| Build command  | `pnpm install && pnpm --filter @klk/pwa build` |
| Build output   | `apps/pwa/dist/client`                         |
| Root directory | _(repo root)_                                  |
| Node version   | 24 (set `NODE_VERSION=24` env var)             |

Environment variables (Production):

| Var               | Value                    |
| ----------------- | ------------------------ |
| `VITE_APP_ORIGIN` | `https://app.pinya.club` |
| `VITE_API_ORIGIN` | `https://api.pinya.club` |
| `VITE_RELAY_URL`  | `wss://api.pinya.club`   |
| `NODE_VERSION`    | `24`                     |

`VITE_COHORT_GATE`, `VITE_POSTHOG_*`, `VITE_MAX_RANGE_DAYS` have working
defaults — only set to override. `public/_redirects` ships a SPA
fallback (`/* /index.html 200`) so deep links like `/circle/<coord>`
resolve.

Custom domain: Pages → `app.pinya.club` (CNAME auto-added since DNS is
on Cloudflare). Apex `pinya.club` can redirect-rule → `app.pinya.club`.

## 2. Relay build → GitHub Release (CI)

`.github/workflows/release.yml` builds `klk-relay` + the PWA dist into a
versioned tarball per arch (`klk-linux-amd64.tar.gz`,
`klk-linux-arm64.tar.gz`):

- push to `main` touching `apps/relay|apps/pwa|packages` → refreshes the
  moving `latest` prerelease;
- tag `v*` / `relay-v*` → cuts a named release with generated notes.

## 3. VPS install (`api.pinya.club` target)

Repo is private → auth once: `gh auth login` as root, **or** export a
fine-grained PAT (`contents:read`) as `GH_TOKEN`.

```sh
git clone https://github.com/espetro/klk.git /srv/klk-src   # for deploy/
sudo bash /srv/klk-src/deploy/install.sh                   # latest release
sudo bash /srv/klk-src/deploy/install.sh v0.2.0            # or a pinned tag
```

The script fetches the right arch tarball, installs
`/usr/local/bin/klk-relay`, the `pwa/` statics into `/var/lib/klk/pwa`,
writes the `klk.service` unit (`127.0.0.1:3334`, `MemoryMax=384M`,
`ProtectSystem=strict`), and health-checks. Re-run anytime to upgrade.

## 4. cloudflared tunnel (`api.pinya.club` → `127.0.0.1:3334`)

```sh
# install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel create klk-api          # prints a UUID + writes ~/.cloudflared/<UUID>.json
sudo mkdir -p /etc/cloudflared
sudo mv ~/.cloudflared/<UUID>.json /etc/cloudflared/
sudo cp /srv/klk-src/deploy/cloudflared.yml /etc/cloudflared/config.yml
sudo sed -i "s/<TUNNEL_UUID>/<UUID>/g" /etc/cloudflared/config.yml
cloudflared tunnel route dns klk-api api.pinya.club   # CNAME → <UUID>.cfargotunnel.com
sudo cloudflared service install            # systemd unit, starts on boot
sudo systemctl enable --now cloudflared
```

`api.pinya.club` then proxies to the local relay — WS upgrades included.
`app.` on Pages and `api.` on the tunnel can diverge freely; auth is
NIP-42 over the socket itself, no cookies.

### Close every inbound port

cloudflared is outbound-only, so nothing else must listen:

```sh
sudo ufw default deny incoming
sudo ufw allow outgoing
# SSH: prefer Tailscale/`cloudflared access` short-lived certs; if you
# keep plain SSH, restrict it:  sudo ufw allow in proto tcp from <office-ip> to any port 22
sudo ufw enable
```

After that, the VPS answers nothing on the public internet except
through the tunnel.

## Cohort emails

`POST /api/cohort` appends `{email,ts,ua}` to `/var/lib/klk/cohort.jsonl`
(mode 0600, per-IP 5s throttle). Reach it at `api.pinya.club` through
the tunnel.

## Verify

```sh
curl https://api.pinya.club/healthz        # ok
curl -I https://app.pinya.club/            # 200, the PWA from Pages
curl -X POST https://api.pinya.club/api/cohort \
  -H 'Content-Type: application/json' -d '{"email":"test@pinya.club"}'  # 204
cat /var/lib/klk/cohort.jsonl            # the collected email
# relay WS
websocat wss://api.pinya.club -1 <<< '[ "REQ", "x", {"kinds":[31950], "limit":1} ]' || true
```

## Local E2E

`docker compose up` → app at http://localhost:3334 with a seeded demo
circle. `docker compose --profile tunnel up` adds a public cloudflared
URL. `./scripts/smoke.sh` runs the full check (build, healthz, SPA, seed,
client e2e).
