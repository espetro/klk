#!/usr/bin/env node
/**
 * strfry write-policy plugin for the Klk relay.
 *
 * Protocol: one JSON line per event on stdin → one JSON action line on stdout.
 * Input:  { event: NostrEvent, sourceType: string, sourceInfo: string }
 * Output: { id: string, action: "accept"|"reject"|"shadowReject", msg: string }
 */

'use strict';

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const ALLOWLIST_PATH = path.join(__dirname, 'allowlist.txt');

// Allowed kinds — cheapest spam filter
const ALLOWED_KINDS = new Set([31923, 31925, 1059, 30078]);

// ─── Allowlist with hot-reload on mtime change ────────────────────────────────

let allowlist = new Set();
let lastMtime = 0;

function reloadAllowlistIfChanged() {
  try {
    const stat = fs.statSync(ALLOWLIST_PATH);
    const mtime = stat.mtimeMs;
    if (mtime === lastMtime) return;
    lastMtime = mtime;

    const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
    const keys = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    allowlist = new Set(keys);
  } catch {
    // File missing or unreadable — keep existing allowlist
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const event = req.event ?? {};
  const id = event.id ?? '';
  const kind = event.kind;
  const pubkey = event.pubkey ?? '';

  reloadAllowlistIfChanged();

  // Reject unknown kinds immediately
  if (!ALLOWED_KINDS.has(kind)) {
    out(id, 'reject', 'blocked: kind not permitted');
    return;
  }

  // kind 1059 (gift-wrap / invite): accept if sender is allowlisted
  // Defensive branch: future true NIP-59 ephemeral keys would need a separate allowlist
  if (kind === 1059) {
    if (allowlist.has(pubkey)) {
      out(id, 'accept', '');
    } else {
      out(id, 'reject', 'blocked: pubkey not in allowlist');
    }
    return;
  }

  // All other allowed kinds: require allowlist membership
  if (allowlist.has(pubkey)) {
    out(id, 'accept', '');
  } else {
    out(id, 'reject', 'blocked: pubkey not in allowlist');
  }
});

function out(id, action, msg) {
  process.stdout.write(JSON.stringify({ id, action, msg }) + '\n');
}
