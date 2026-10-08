#!/usr/bin/env bash
# install.sh — fetch the latest klk release from GitHub and (re)install it
# under systemd on the VPS. Idempotent; safe to re-run for upgrades.
#
# Usage:
#   sudo bash deploy/install.sh              # install/upgrade to `latest`
#   sudo bash deploy/install.sh v0.2.0       # pin a release tag
#   GH_TOKEN=… sudo -E bash deploy/install.sh  # private repo auth
#
# Auth (private repo): set GH_TOKEN (a fine-grained PAT with contents:read),
# or install `gh` and run `gh auth login` as root once — the script prefers gh.
set -euo pipefail

REPO="${KLK_REPO:-espetro/klk}"
RELEASE="${1:-latest}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

ASSET="klk-linux-${ARCH}.tar.gz"
APP_DIR=/opt/klk
DATA_DIR=/var/lib/klk
BIN=/usr/local/bin/klk-relay

fetch() {
  local out="$1"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh release download "$RELEASE" -R "$REPO" -p "$ASSET" -O "$out" --clobber
  else
    local api="https://api.github.com/repos/${REPO}/releases"
    [ "$RELEASE" = latest ] && url_path="$api/latest" || url_path="$api/tags/$RELEASE"
    curl -fsSL ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} "$url_path" \
      | python3 -c "import json,sys;print([a['id'] for a in json.load(sys.stdin)['assets'] if a['name']=='$ASSET'][0])" \
      | xargs -I{} curl -fsSL ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} \
          -H "Accept: application/octet-stream" \
          "https://api.github.com/repos/${REPO}/releases/assets/{}" -o "$out"
  fi
}

echo "→ fetching ${REPO}@${RELEASE} ${ASSET}"
fetch /tmp/klk.tar.gz

echo "→ unpacking"
mkdir -p "$APP_DIR"
tar -xzf /tmp/klk.tar.gz -C "$APP_DIR"
install -m 0755 "$APP_DIR/klk-relay-linux-${ARCH}" "$BIN"
# tarball layout: klk-relay-linux-<arch> + pwa/ (the built client)

id -u klk >/dev/null 2>&1 || useradd -r -m -d "$DATA_DIR" klk
mkdir -p "$DATA_DIR"
rm -rf "$DATA_DIR/pwa" && cp -r "$APP_DIR/pwa" "$DATA_DIR/pwa"
chown -R klk:klk "$DATA_DIR"

cat > /etc/systemd/system/klk.service <<'EOF'
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
MemoryMax=384M
ProtectSystem=strict
ReadWritePaths=/var/lib/klk
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now klk
sleep 1
curl -fsS http://127.0.0.1:3334/healthz && echo " ✓ klk up"
