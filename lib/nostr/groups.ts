import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-mobile";
import * as Crypto from "expo-crypto";
import { GroupRecord, getAllGroups, getGroup, saveGroup } from "../storage/groups-store";
import { PublicEventData } from "./events";

function uint8ToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToUint8(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

export async function createGroup(name: string, myPubkey: string): Promise<GroupRecord> {
  const keyBytes = await Crypto.getRandomBytesAsync(32);
  const symKey = uint8ToHex(keyBytes);
  const idBytes = await Crypto.getRandomBytesAsync(16);
  const id = uint8ToHex(idBytes);
  const group: GroupRecord = { id, name, symKey, members: [myPubkey] };
  await saveGroup(group);
  return group;
}

export async function inviteToGroup(
  ndk: NDK,
  signer: NDKPrivateKeySigner,
  group: GroupRecord,
  recipientPubkey: string
): Promise<void> {
  const payload = JSON.stringify({ id: group.id, name: group.name, symKey: group.symKey, members: group.members });

  const inner = new NDKEvent(ndk);
  inner.kind = 14;
  inner.content = payload;
  inner.tags = [["p", recipientPubkey]];
  inner.created_at = Math.floor(Date.now() / 1000);

  const sealed = await signer.encrypt(
    await ndk.getUser({ pubkey: recipientPubkey }),
    payload,
    "nip44"
  );

  const wrap = new NDKEvent(ndk);
  wrap.kind = 1059;
  wrap.content = sealed;
  wrap.tags = [["p", recipientPubkey]];
  await wrap.publish();

  const updated: GroupRecord = { ...group, members: [...new Set([...group.members, recipientPubkey])] };
  await saveGroup(updated);
}

export function processIncomingGiftWraps(ndk: NDK, myPubkey: string): void {
  const sub = ndk.subscribe({ kinds: [1059 as any], "#p": [myPubkey] }, { closeOnEose: false });
  sub.on("event", async (event: NDKEvent) => {
    try {
      if (!ndk.signer) return;
      const decrypted = await (ndk.signer as NDKPrivateKeySigner).decrypt(
        await ndk.getUser({ pubkey: event.pubkey }),
        event.content,
        "nip44"
      );
      const parsed = JSON.parse(decrypted) as { id: string; name: string; symKey: string; members: string[] };
      if (parsed.id && parsed.symKey) {
        const existing = await getGroup(parsed.id);
        if (!existing) {
          await saveGroup(parsed as GroupRecord);
        }
      }
    } catch {}
  });
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const ivBytes = await Crypto.getRandomBytesAsync(12);
  const textBytes = new TextEncoder().encode(plaintext);
  const cryptoKey = await (globalThis as any).crypto.subtle.importKey(
    "raw", key, { name: "AES-GCM" }, false, ["encrypt"]
  );
  const cipherBuf = await (globalThis as any).crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes }, cryptoKey, textBytes
  );
  const combined = new Uint8Array(ivBytes.length + cipherBuf.byteLength);
  combined.set(ivBytes, 0);
  combined.set(new Uint8Array(cipherBuf), ivBytes.length);
  return uint8ToHex(combined);
}

export async function aesGcmDecrypt(symKeyHex: string, cipherHex: string): Promise<string> {
  const combined = hexToUint8(cipherHex);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const key = hexToUint8(symKeyHex);
  const cryptoKey = await (globalThis as any).crypto.subtle.importKey(
    "raw", key, { name: "AES-GCM" }, false, ["decrypt"]
  );
  const plainBuf = await (globalThis as any).crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, cryptoKey, ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}

export async function publishPrivateEvent(
  ndk: NDK,
  group: GroupRecord,
  data: PublicEventData
): Promise<NDKEvent> {
  const payload = JSON.stringify(data);
  const symKey = hexToUint8(group.symKey);
  const encrypted = await aesGcmEncrypt(symKey, payload);

  const eventId = uint8ToHex(await Crypto.getRandomBytesAsync(16));
  const event = new NDKEvent(ndk);
  event.kind = 30078;
  event.content = encrypted;
  event.tags = [
    ["d", `group-event:${group.id}:${eventId}`],
    ["g", group.id],
  ];
  await event.publish();
  return event;
}
