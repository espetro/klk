import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";

// Sealed-circle encryption: AES-256-GCM with a per-circle shared key.
// Key exchange is out-of-band (the invite link carries it). No forward
// secrecy — Marmot/MLS is the documented v2 upgrade (spec §8).

const KEY_LEN = 32;
const NONCE_LEN = 12;

export type CircleKey = Uint8Array; // exactly KEY_LEN bytes

export function generateCircleKey(): CircleKey {
  const key = new Uint8Array(KEY_LEN);
  crypto.getRandomValues(key);
  return key;
}

export function seal(key: CircleKey, plaintext: string): string {
  const nonce = new Uint8Array(NONCE_LEN);
  crypto.getRandomValues(nonce);
  const data = new TextEncoder().encode(plaintext);
  const ct = gcm(key, nonce).encrypt(data);
  const packed = new Uint8Array(NONCE_LEN + ct.length);
  packed.set(nonce);
  packed.set(ct, NONCE_LEN);
  return b64encode(packed);
}

export function open(key: CircleKey, packed: string): string {
  const bytes = b64decode(packed);
  const nonce = bytes.slice(0, NONCE_LEN);
  const ct = bytes.slice(NONCE_LEN);
  const pt = gcm(key, nonce).decrypt(ct);
  return new TextDecoder().decode(pt);
}

/** Derives a display-independent key id (for key-rotation bookkeeping). */
export function keyId(key: CircleKey): string {
  return hexEncode(sha256(key).slice(0, 8));
}

export function circleKeyFromHex(hex: string): CircleKey {
  if (hex.length !== KEY_LEN * 2) throw new Error("circle key must be 32 bytes hex");
  const key = new Uint8Array(KEY_LEN);
  for (let i = 0; i < KEY_LEN; i++) key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return key;
}

export function circleKeyToHex(key: CircleKey): string {
  return hexEncode(key);
}

function hexEncode(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// portable base64 — no btoa/Buffer so it runs on web, node, and RN
export function bytesToBase64(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = ((b[i] ?? 0) << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[n >> 18];
    out += B64[(n >> 12) & 63];
    out += i + 1 < b.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < b.length ? B64[n & 63] : "=";
  }
  return out;
}

export function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/=+$/, "");
  const out = new Uint8Array((clean.length * 3) >> 2);
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (const c of clean) {
    const v = B64.indexOf(c);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits === 24) {
      out[o++] = (buf >> 16) & 255;
      out[o++] = (buf >> 8) & 255;
      out[o++] = buf & 255;
      buf = 0;
      bits = 0;
    }
  }
  if (bits === 12) {
    out[o++] = (buf >> 4) & 255;
  } else if (bits === 18) {
    out[o++] = (buf >> 10) & 255;
    out[o++] = (buf >> 2) & 255;
  }
  return out.subarray(0, o);
}

const b64encode = bytesToBase64;
const b64decode = base64ToBytes;
