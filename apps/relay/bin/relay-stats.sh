#!/usr/bin/env bash
# relay-stats.sh — emit event counts by kind + DB size as JSON
# Intended to run on a cron (e.g. every 10 min) and optionally push to Grafana Cloud.
# Usage: ./bin/relay-stats.sh | tee -a /var/log/klk-relay-stats.jsonl

set -euo pipefail

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Count events per kind via strfry scan (runs inside the container)
count_kind() {
  local kind="$1"
  podman exec klk-relay strfry scan --count '{"kinds":['$kind']}' 2>/dev/null || echo 0
}

KIND_31923=$(count_kind 31923)
KIND_31925=$(count_kind 31925)
KIND_1059=$(count_kind 1059)
KIND_30078=$(count_kind 30078)

DB_SIZE_BYTES=$(podman exec klk-relay du -sb /app/strfry-db 2>/dev/null | awk '{print $1}' || echo 0)
PUBKEYS=$(podman exec klk-relay strfry scan --count '{}' 2>/dev/null || echo 0)

jq -n \
  --arg ts "$TIMESTAMP" \
  --argjson k31923 "$KIND_31923" \
  --argjson k31925 "$KIND_31925" \
  --argjson k1059 "$KIND_1059" \
  --argjson k30078 "$KIND_30078" \
  --argjson db "$DB_SIZE_BYTES" \
  --argjson total "$PUBKEYS" \
  '{
    timestamp: $ts,
    events: {
      "31923": $k31923,
      "31925": $k31925,
      "1059": $k1059,
      "30078": $k30078
    },
    total_events: ($k31923 + $k31925 + $k1059 + $k30078),
    db_size_bytes: $db
  }'
