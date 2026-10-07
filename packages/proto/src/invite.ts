import { circleKeyFromHex, circleKeyToHex, generateCircleKey } from "./crypto.ts";
import type { CircleKey } from "./crypto.ts";

// Invite link: `${base}/join#<payload>` — payload lives in the fragment
// so it never hits the server or referers.
// payload v1: base64url(json { c: coord, i: invite, k?: circleKeyHex })

export interface InvitePayload {
  coord: string;
  invite: string;
  key?: CircleKey;
}

export function encodeInvite(p: InvitePayload): string {
  const body: Record<string, string> = { c: p.coord, i: p.invite };
  if (p.key !== undefined) body.k = circleKeyToHex(p.key);
  return `#${b64urlEncode(JSON.stringify(body))}`;
}

export function decodeInvite(fragment: string): InvitePayload {
  const f = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  const parsed = JSON.parse(b64urlDecode(f)) as Record<string, string>;
  if (parsed.c === undefined || parsed.i === undefined) {
    throw new Error("invalid invite link");
  }
  const out: InvitePayload = { coord: parsed.c, invite: parsed.i };
  if (parsed.k !== undefined) out.key = circleKeyFromHex(parsed.k);
  return out;
}

export function newInviteSecret(): string {
  return b64urlEncode(generateCircleKey() /* 32 random bytes, reused */);
}

function b64urlEncode(s: string | Uint8Array): string {
  const bytes = typeof s === "string" ? new TextEncoder().encode(s) : s;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
