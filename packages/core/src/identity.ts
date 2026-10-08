import { gcm } from "@noble/ciphers/aes.js";
import {
  base64ToBytes,
  bytesToBase64,
  publicKeyOf,
  secretKeyFromHex,
  secretKeyToHex,
} from "@klk/proto";
import type { Keypair } from "@klk/proto";
import { storage } from "./storage";

// Identity persistence: the nsec lives encrypted at rest. Wrap key comes
// from WebAuthn PRF when the platform supports it (passkey-gated); the
// documented fallback is a device-bound wrap key in storage — honest
// "locked to this device" mode, not full passkey protection. AES-GCM here
// is @noble/ciphers (not WebCrypto) so the same code runs on React Native.
const LS_WRAPPED = "klk.nsec.wrapped";
const LS_WRAPKEY = "klk.nsec.wrapkey";
const LS_UNLOCK_MODE = "klk.nsec.mode";
const LS_CRED = "klk.nsec.credid";
const LS_SALT = "klk.nsec.prfsalt";

export type UnlockMode = "passkey" | "device";

export interface StoredIdentity {
  mode: UnlockMode;
  ciphertext: string;
  iv: string;
  pubkey: string;
}

export async function wrapSecret(
  secretKey: Uint8Array,
  wrapKey: Uint8Array,
): Promise<StoredIdentity> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = gcm(wrapKey, iv).encrypt(secretKey);
  return {
    mode: "device",
    ciphertext: bytesToBase64(ct),
    iv: bytesToBase64(iv),
    pubkey: "",
  };
}

export async function unwrapSecret(
  stored: StoredIdentity,
  wrapKey: Uint8Array,
): Promise<Uint8Array> {
  const ct = base64ToBytes(stored.ciphertext);
  const iv = base64ToBytes(stored.iv);
  return gcm(wrapKey, iv).decrypt(ct);
}

function newDeviceWrapKey(): Uint8Array {
  const k = new Uint8Array(32);
  crypto.getRandomValues(k);
  return k;
}

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  bytesToBase64(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf);
const unb64 = base64ToBytes;

interface PrfExt {
  prf?: { results?: { first?: ArrayBuffer } };
}

const hasPasskeys =
  typeof navigator !== "undefined" && typeof navigator.credentials?.create === "function";

// A platform passkey whose PRF evaluates to our wrap key. The ceremony
// is what shows Chrome's passkey manager / iCloud Keychain prompts.
// Web-only: native always lands in device mode.
async function createPasskey(pubkey: string): Promise<string | null> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)) as BufferSource,
      rp: { name: "Klk" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)) as BufferSource,
        name: `klk-${pubkey.slice(0, 8)}`,
        displayName: "Klk identity",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      extensions: { prf: {} },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  return cred !== null ? b64(cred.rawId) : null;
}

async function prfWrapKey(credIdB64: string, saltB64: string): Promise<Uint8Array | null> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)) as BufferSource,
      allowCredentials: [{ type: "public-key", id: unb64(credIdB64) as BufferSource }],
      userVerification: "preferred",
      extensions: { prf: { eval: { first: unb64(saltB64) as BufferSource } } },
    },
  })) as PublicKeyCredential | null;
  const ext = (cred?.getClientExtensionResults() ?? {}) as PrfExt;
  const first = ext.prf?.results?.first;
  return first !== undefined ? new Uint8Array(first) : null;
}

/**
 * Persist a keypair on this device. Tries a passkey (WebAuthn PRF) first —
 * that's what pops the OS passkey sheet; where PRF isn't usable it falls
 * back to a device-bound wrap key ("locked to this device").
 */
export async function persistIdentity(kp: Keypair): Promise<UnlockMode> {
  const mode: UnlockMode = "device";
  try {
    const credId = hasPasskeys ? await createPasskey(kp.pubkey) : null;
    if (credId !== null) {
      const salt = b64(crypto.getRandomValues(new Uint8Array(32)));
      const key = await prfWrapKey(credId, salt);
      if (key !== null) {
        const stored = await wrapSecret(kp.secretKey, key);
        stored.mode = "passkey";
        stored.pubkey = kp.pubkey;
        storage.setItem(LS_WRAPPED, JSON.stringify(stored));
        storage.setItem(LS_CRED, credId);
        storage.setItem(LS_SALT, salt);
        storage.setItem(LS_UNLOCK_MODE, "passkey");
        return "passkey";
      }
    }
  } catch {
    // declined or unsupported — fall through to device mode
  }

  const existing = storage.getItem(LS_WRAPKEY);
  const wrapKey =
    existing !== null
      ? unb64(existing)
      : (() => {
          const k = newDeviceWrapKey();
          storage.setItem(LS_WRAPKEY, b64(k));
          return k;
        })();
  const stored = await wrapSecret(kp.secretKey, wrapKey);
  stored.mode = mode;
  stored.pubkey = kp.pubkey;
  storage.setItem(LS_WRAPPED, JSON.stringify(stored));
  storage.setItem(LS_UNLOCK_MODE, mode);
  return mode;
}

export class PasskeyRequired extends Error {
  constructor() {
    super("identity is passkey-gated");
    this.name = "PasskeyRequired";
  }
}

/** Restore the persisted keypair, or null if none. Passkey-mode identities
 * need a user gesture — this throws PasskeyRequired for the UI to resolve
 * via `unlockWithPasskey()`. */
export async function restoreIdentity(): Promise<Keypair | null> {
  const raw = storage.getItem(LS_WRAPPED);
  if (raw === null) return null;
  const stored = JSON.parse(raw) as StoredIdentity;
  if (stored.mode === "passkey") {
    const credId = storage.getItem(LS_CRED);
    const salt = storage.getItem(LS_SALT);
    if (credId === null || salt === null) return null;
    // no WebAuthn on native — a passkey-gated identity can't unlock here
    if (!hasPasskeys) return null;
    throw new PasskeyRequired();
  }
  const wrapB64 = storage.getItem(LS_WRAPKEY);
  if (wrapB64 === null) return null;
  const secretKey = await unwrapSecret(stored, unb64(wrapB64));
  return { secretKey, pubkey: stored.pubkey };
}

/** The "unlock" button handler for passkey-mode identities — evaluates
 * the PRF under a user gesture and unwraps the keypair. */
export async function unlockWithPasskey(): Promise<Keypair | null> {
  const raw = storage.getItem(LS_WRAPPED);
  const credId = storage.getItem(LS_CRED);
  const salt = storage.getItem(LS_SALT);
  if (raw === null || credId === null || salt === null) return null;
  const stored = JSON.parse(raw) as StoredIdentity;
  const key = await prfWrapKey(credId, salt);
  if (key === null) throw new Error("passkey didn't release a key on this device");
  const secretKey = await unwrapSecret(stored, key);
  return { secretKey, pubkey: stored.pubkey };
}

export function clearIdentity(): void {
  storage.removeItem(LS_WRAPPED);
  storage.removeItem(LS_WRAPKEY);
  storage.removeItem(LS_UNLOCK_MODE);
  storage.removeItem(LS_CRED);
  storage.removeItem(LS_SALT);
}

export function storedUnlockMode(): UnlockMode | null {
  return storage.getItem(LS_UNLOCK_MODE) as UnlockMode | null;
}

// Hex helpers for export/import flows (power users, recovery)
export function identityFromSecretHex(hex: string): Keypair {
  const secretKey = secretKeyFromHex(hex);
  return { secretKey, pubkey: publicKeyOf(secretKey) };
}

export { secretKeyToHex };
