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

function b64encode(b: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b).toString("base64");
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
  const bin = atob(s);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
