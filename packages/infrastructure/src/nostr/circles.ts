import NDK, { NDKEvent, NDKPrivateKeySigner } from '@klk/nostr-mobile';
import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';

import { CircleRecord, getCircle, saveCircle } from '../storage/circles-store';
import { PublicEventData } from './events';

function uint8ToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

export async function createCircle(name: string, myPubkey: string): Promise<CircleRecord> {
  const keyBytes = await Crypto.getRandomBytesAsync(32);
  const symKey = uint8ToHex(keyBytes);
  const idBytes = await Crypto.getRandomBytesAsync(16);
  const id = uint8ToHex(idBytes);
  const circle: CircleRecord = {
    id,
    name,
    symKey,
    members: [myPubkey],
    createdAt: Math.floor(Date.now() / 1000),
  };
  await saveCircle(circle);
  return circle;
}

export async function inviteToCircle(
  ndk: NDK,
  signer: NDKPrivateKeySigner,
  circle: CircleRecord,
  recipientPubkey: string
): Promise<void> {
  const payload = JSON.stringify({
    id: circle.id,
    name: circle.name,
    symKey: circle.symKey,
    members: circle.members,
  });

  const inner = new NDKEvent(ndk);
  inner.kind = 14;
  inner.content = payload;
  inner.tags = [['p', recipientPubkey]];
  inner.created_at = Math.floor(Date.now() / 1000);

  const sealed = await signer.encrypt(ndk.getUser({ pubkey: recipientPubkey }), payload, 'nip44');

  const wrap = new NDKEvent(ndk);
  wrap.kind = 1059;
  wrap.content = sealed;
  wrap.tags = [['p', recipientPubkey]];
  await wrap.publish();

  const updated: CircleRecord = {
    ...circle,
    members: [...new Set([...circle.members, recipientPubkey])],
  };
  await saveCircle(updated);
}

export function processIncomingGiftWraps(ndk: NDK, myPubkey: string): void {
  const sub = ndk.subscribe({ kinds: [1059], '#p': [myPubkey] }, { closeOnEose: false });
  sub.on('event', async (event: NDKEvent) => {
    try {
      if (!ndk.signer) return;
      const decrypted = await (ndk.signer as NDKPrivateKeySigner).decrypt(
        ndk.getUser({ pubkey: event.pubkey }),
        event.content,
        'nip44'
      );
      const parsed = JSON.parse(decrypted) as {
        id: string;
        name: string;
        symKey: string;
        members: string[];
      };
      if (parsed.id && parsed.symKey) {
        const existing = await getCircle(parsed.id);
        if (!existing) {
          await saveCircle(parsed as CircleRecord);
        }
      }
    } catch {}
  });
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const iv = await Crypto.getRandomBytesAsync(12);
  const plainBytes = new TextEncoder().encode(plaintext);
  const cipher = gcm(key, iv);
  const cipherBytes = cipher.encrypt(plainBytes);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);
  return uint8ToHex(combined);
}

export function aesGcmDecrypt(symKeyHex: string, cipherHex: string): string {
  const combined = hexToUint8(cipherHex);
  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);
  const key = hexToUint8(symKeyHex);
  const cipher = gcm(key, iv);
  const plainBytes = cipher.decrypt(cipherBytes);
  return new TextDecoder().decode(plainBytes);
}

export async function publishPrivateEvent(
  ndk: NDK,
  circle: CircleRecord,
  data: PublicEventData
): Promise<NDKEvent> {
  const payload = JSON.stringify(data);
  const symKey = hexToUint8(circle.symKey);
  const encrypted = await aesGcmEncrypt(symKey, payload);

  const eventId = uint8ToHex(await Crypto.getRandomBytesAsync(16));
  const event = new NDKEvent(ndk);
  event.kind = 30078;
  event.content = encrypted;
  event.tags = [
    ['d', `circle-event:${circle.id}:${eventId}`],
    ['g', circle.id],
  ];
  await event.publish();
  return event;
}
