#!/usr/bin/env bash
# klk-allow.sh — add a pubkey to the relay allowlist (no restart needed)
# Usage: ./bin/klk-allow.sh npub1... | ./bin/klk-allow.sh <hex>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALLOWLIST="$SCRIPT_DIR/../write-policy/allowlist.txt"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <npub1... or hex pubkey>" >&2
  exit 1
fi

INPUT="$1"
HEX=""

# Decode npub → hex if needed (requires nak in PATH)
if [[ "$INPUT" == npub1* ]]; then
  if ! command -v nak &>/dev/null; then
    echo "Error: 'nak' not found in PATH. Install with: brew install nak" >&2
    exit 1
  fi
  HEX=$(nak decode "$INPUT" | grep -oP '(?<=pubkey: )[0-9a-f]{64}' || true)
  if [[ -z "$HEX" ]]; then
    # fallback: nak key convert
    HEX=$(nak key convert --to-hex "$INPUT" 2>/dev/null || true)
  fi
  if [[ -z "$HEX" ]]; then
    echo "Error: could not decode npub. Is nak up to date?" >&2
    exit 1
  fi
else
  HEX="$INPUT"
fi

# Validate hex
if ! [[ "$HEX" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "Error: '$HEX' is not a valid 64-char hex pubkey" >&2
  exit 1
fi

HEX="${HEX,,}"  # lowercase

# Check for duplicates
if grep -qxF "$HEX" "$ALLOWLIST" 2>/dev/null; then
  echo "Already in allowlist: $HEX"
  exit 0
fi

echo "$HEX" >> "$ALLOWLIST"
echo "Added: $HEX"
echo "Allowlist now has $(grep -cE '^[0-9a-f]{64}$' "$ALLOWLIST") pubkey(s)."
