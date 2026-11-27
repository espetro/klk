import { finalizeEvent } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToBase64 } from "./crypto.ts";

// NIP-98 HTTP auth — the same keypair that answers NIP-42 signs API
// requests (spec §3.1: no second credential system). Kind-27235 event
// with `u` (full endpoint URL) + `payload` (sha256 of the exact body),
// base64'd into the Authorization header.

function hexEncode(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function signHttpAuth(url: string, body: string, secretKey: Uint8Array): string {
  const sum = sha256(new TextEncoder().encode(body));
  const ev = finalizeEvent(
    {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["u", url],
        ["payload", hexEncode(sum)],
      ],
    },
    secretKey,
  );
  return "Nostr " + bytesToBase64(new TextEncoder().encode(JSON.stringify(ev)));
}
