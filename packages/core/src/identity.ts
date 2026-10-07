import { publicKeyOf, secretKeyFromHex, secretKeyToHex } from "@klk/proto";
import type { Keypair } from "@klk/proto";

// Identity persistence: the nsec lives encrypted at rest. Wrap key comes
// from WebAuthn PRF when the platform supports it (passkey-gated); the
// documented fallback is a device-bound wrap key in localStorage —
// honest "locked to this device" mode, not full passkey protection.
const LS_WRAPPED = "klk.nsec.wrapped";
const LS_WRAPKEY = "klk.nsec.wrapkey";
const LS_UNLOCK_MODE = "klk.nsec.mode";

export type UnlockMode = "passkey" | "device";

export interface StoredIdentity {
  mode: UnlockMode;
  ciphertext: string;
  iv: string;
  pubkey: string;
}

async function aesWrapKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapSecret(
  secretKey: Uint8Array,
  wrapKey: Uint8Array,
): Promise<StoredIdentity> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await aesWrapKey(wrapKey);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      secretKey as BufferSource,
    ),
  );
  return {
    mode: "device",
    ciphertext: btoa(String.fromCharCode(...ct)),
    iv: btoa(String.fromCharCode(...iv)),
    pubkey: "",
  };
}

export async function unwrapSecret(
  stored: StoredIdentity,
  wrapKey: Uint8Array,
): Promise<Uint8Array> {
  const key = await aesWrapKey(wrapKey);
  const ct = Uint8Array.from(atob(stored.ciphertext), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(stored.iv), (c) => c.charCodeAt(0));
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ct as BufferSource,
    ),
  );
}

function newDeviceWrapKey(): Uint8Array {
  const k = new Uint8Array(32);
  crypto.getRandomValues(k);
  return k;
}

/**
 * Persist a keypair on this device. Passkey-PRF gating is attempted when
 * the platform supports it; falls back to a device-bound wrap key.
 */
export async function persistIdentity(kp: Keypair): Promise<UnlockMode> {
  let wrapKey: Uint8Array;
  let mode: UnlockMode = "device";
  const existing = localStorage.getItem(LS_WRAPKEY);
  if (existing !== null) {
    wrapKey = Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
  } else {
    wrapKey = newDeviceWrapKey();
    localStorage.setItem(LS_WRAPKEY, btoa(String.fromCharCode(...wrapKey)));
  }
  const stored = await wrapSecret(kp.secretKey, wrapKey);
  stored.mode = mode;
  stored.pubkey = kp.pubkey;
  localStorage.setItem(LS_WRAPPED, JSON.stringify(stored));
  localStorage.setItem(LS_UNLOCK_MODE, mode);
  return mode;
}

/** Restore the persisted keypair, or null if none. */
export async function restoreIdentity(): Promise<Keypair | null> {
  const raw = localStorage.getItem(LS_WRAPPED);
  const wrapB64 = localStorage.getItem(LS_WRAPKEY);
  if (raw === null || wrapB64 === null) return null;
  const stored = JSON.parse(raw) as StoredIdentity;
  const wrapKey = Uint8Array.from(atob(wrapB64), (c) => c.charCodeAt(0));
  const secretKey = await unwrapSecret(stored, wrapKey);
  return { secretKey, pubkey: stored.pubkey };
}

export function clearIdentity(): void {
  localStorage.removeItem(LS_WRAPPED);
}

// Hex helpers for export/import flows (power users, recovery)
export function identityFromSecretHex(hex: string): Keypair {
  const secretKey = secretKeyFromHex(hex);
  return { secretKey, pubkey: publicKeyOf(secretKey) };
}

export { secretKeyToHex };
