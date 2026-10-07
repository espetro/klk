import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

export interface Keypair {
  secretKey: Uint8Array;
  pubkey: string;
}

export function generateKeypair(): Keypair {
  const secretKey = generateSecretKey();
  return { secretKey, pubkey: getPublicKey(secretKey) };
}

export function publicKeyOf(secretKey: Uint8Array): string {
  return getPublicKey(secretKey);
}

export function npubEncode(pubkey: string): string {
  return nip19.npubEncode(pubkey);
}

/** Accepts an npub or bare hex pubkey; returns hex or null. */
export function npubDecode(s: string): string | null {
  const t = s.trim();
  if (/^[0-9a-f]{64}$/i.test(t)) return t.toLowerCase();
  try {
    const d = nip19.decode(t);
    return d.type === "npub" ? (d.data as string) : null;
  } catch {
    return null;
  }
}

export function secretKeyFromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function secretKeyToHex(sk: Uint8Array): string {
  return Array.from(sk, (b) => b.toString(16).padStart(2, "0")).join("");
}
