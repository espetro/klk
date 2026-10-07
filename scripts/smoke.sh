#!/usr/bin/env bash
# Compose smoke: boot the stack, verify relay+PWA+seed work, tear down.
# Usage: ./scripts/smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BASE=http://localhost:3334
cleanup() { docker compose down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> building + starting stack"
docker compose up -d --build --wait

echo "==> healthz"
curl -fsS "$BASE/healthz" | grep -q ok && echo "   ok"

echo "==> PWA shell + assets"
curl -fsS -o /dev/null "$BASE/"
curl -fsS "$BASE/manifest.webmanifest" | grep -q '"Klk"'
curl -fsS -o /dev/null "$BASE/sw.js"
# SPA fallback serves the app on deep links
curl -fsS "$BASE/circle/anything" | grep -q '<div id="root">\|<html' && echo "   ok"

echo "==> seed ran"
docker compose logs seed | grep -q "seeded circle" && echo "   ok"

echo "==> relay accepts the v0 loop (client e2e over real WS)"
# node lives wherever the toolchain put it — PATH, mise, or this box
export PATH="$HOME/.local/share/mise/shims:/tmp/node-v24.21.0-linux-x64/bin:$PATH"
KLK_E2E=1 KLK_RELAY_URL=ws://localhost:3334 \
  pnpm -C packages/core exec vitest run src/e2e.test.ts

echo "==> smoke OK — stack left down; run 'docker compose up' to use it"
