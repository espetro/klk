# Architecture

This document describes the technical architecture of Klk: how the client is structured, how it communicates with relays, and how each of the 6 user flows is implemented at the protocol level.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 55 / React Native 0.83.6 |
| JS Engine | Hermes (New Architecture — Fabric + TurboModules) |
| Routing | Expo Router 55 (file-based, tab + modal) |
| UI | NativeWind v4 (Tailwind CSS for React Native) |
| Nostr client | `@nostr-dev-kit/ndk-mobile` 0.8.x |
| Relay cache | `expo-sqlite` via `NDKCacheAdapterSqlite` |
| Key storage | `expo-secure-store` (iOS Keychain / Android Keystore) |
| Encryption | `@noble/ciphers/aes` — AES-256-GCM |
| RNG | `expo-crypto` + `react-native-get-random-values` polyfill |
| Package manager | Bun |

---

## Project Layout

```
app/               Expo Router pages (file = route)
  (tabs)/          Tab bar: Feed, Groups, Profile
  event/[id].tsx   Event detail modal
  event/new.tsx    Create public event
  group/[id].tsx   Group detail modal
  group/new.tsx    Create private group
components/        Shared UI components
lib/
  nostr/           Nostr protocol layer
    ndk.ts         NDK singleton + relay config
    identity.ts    Keypair generation and storage
    events.ts      Public event publish/subscribe
    rsvp.ts        RSVP publish/subscribe
    groups.ts      Group crypto + gift-wrap invite + private event
    tags.ts        NIP tag helpers
  hooks/           React hooks consuming the nostr layer
  storage/
    groups-store.ts  GroupRecord persistence (secure-store)
    secure.ts        Low-level secure-store wrapper
tests/             Gauge E2E specs + step implementations
```

---

## NDK Initialization

`lib/nostr/ndk.ts` exports a singleton `NDK` instance. On first call it:

1. Creates an `NDKCacheAdapterSqlite` and calls `.initialize()` to create the SQLite schema.
2. Sets `explicitRelayUrls` to `[RELAY_URL]` (currently `ws://localhost:10547` for dev; production will use `wss://relay.klk.app`).

The singleton is created in `app/_layout.tsx` inside the root `useEffect`, which also:
- Calls `instance.connect()` to open the WebSocket.
- Attaches the private key signer.
- Starts the NIP-59 gift-wrap listener (`processIncomingGiftWraps`).

### Metro resolver note

`@nostr-dev-kit/ndk-mobile` has a transitive dependency on `expo-nip55`, which hard-depends on `react-native@0.79.2`. Running this alongside RN 0.83.6 would cause a `PlatformConstants` TurboModule crash. The `metro.config.js` resolveRequest hook intercepts all singleton package requires (react-native, expo, react, react-native-reanimated) and redirects them to the app-level copy, preventing the nested version from being bundled.

---

## Identity (Flow 1)

```
lib/nostr/identity.ts → getOrCreateIdentity()
```

On first launch, `getOrCreateIdentity()`:
1. Generates a 32-byte private key using `expo-crypto`.
2. Creates an `NDKPrivateKeySigner` from it.
3. Persists the hex-encoded private key in `expo-secure-store`.

On subsequent launches it reads the stored key. The public key (npub) is derived from the private key via secp256k1 — it is never transmitted separately.

City selection is stored in React state (root context) and written to AsyncStorage. It drives the subscription filter (`["t", "city:<slug>"]`).

---

## Public Events (Flows 2 & 4)

### NIP-52 Calendar Events — kind 31923

```
lib/nostr/events.ts
lib/hooks/use-public-events.ts
```

**Publishing (Flow 4)**: `publishEvent()` creates an `NDKEvent` with:
- `kind: 31923`
- `tags: [["d", unique-id], ["t", "city:<slug>"], ["name", title], ...]`
- `content`: description/summary
- Signs and publishes via NDK.

**Subscribing (Flow 2)**: `usePublicEvents()` subscribes with filter:
```ts
{ kinds: [31923], "#t": ["city:barcelona"] }
```
Results are surfaced as React state and rendered in the Feed tab.

---

## RSVPs (Flow 3)

### NIP-52 Calendar RSVPs — kind 31925

```
lib/nostr/rsvp.ts
lib/hooks/use-rsvps.ts
```

`publishRsvp()` publishes a kind 31925 event referencing the event's `d` tag. `useRsvps(eventId)` subscribes and counts unique pubkeys, displayed as the guest count on the event detail screen.

---

## Private Groups (Flow 5)

### Group creation — local only

```
lib/nostr/groups.ts → createGroup()
lib/storage/groups-store.ts
```

`createGroup()` generates a 256-bit symmetric key using `expo-crypto.getRandomBytesAsync(32)` and a 128-bit group ID. Both are stored locally in `expo-secure-store` as a `GroupRecord`:

```ts
type GroupRecord = {
  id: string;       // 16-byte hex
  name: string;
  symKey: string;   // 32-byte hex — never leaves the device unencrypted
  members: string[]; // pubkeys
};
```

### Inviting — NIP-59 gift wrap

`inviteToGroup()` wraps the group record payload in a NIP-59 gift wrap:

1. Serialises `{ id, name, symKey, members }` as JSON.
2. Encrypts with NIP-44 (`NDKPrivateKeySigner.encrypt`) addressed to the recipient's pubkey.
3. Publishes a kind 1059 "gift wrap" event with `["p", recipientPubkey]`.

The recipient's `processIncomingGiftWraps()` listener (started at app boot) decrypts incoming kind 1059 events and stores new `GroupRecord`s locally.

---

## Private Group Events (Flow 6)

### Encryption — AES-256-GCM

```
lib/nostr/groups.ts → publishPrivateEvent() / aesGcmEncrypt() / aesGcmDecrypt()
```

`publishPrivateEvent()`:
1. Serialises `PublicEventData` as JSON.
2. Generates a 12-byte IV via `expo-crypto.getRandomBytesAsync(12)`.
3. Encrypts with `gcm(key, iv).encrypt(plaintext)` from `@noble/ciphers/aes`.
4. Prepends the IV to the ciphertext and hex-encodes the result.
5. Publishes a kind 30078 event with tags `["d", "group-event:<groupId>:<eventId>"]` and `["g", groupId]`.

**Why `@noble/ciphers` instead of `crypto.subtle`**: Hermes (the React Native JS engine) does not expose `crypto.subtle`. `@noble/ciphers` is a pure-JS implementation with no native dependency.

Decryption reverses the process: split the hex blob at byte 12 to recover IV and ciphertext, then call `gcm(key, iv).decrypt(cipherBytes)`.

---

## Relay Model

The relay URL is a module-level constant in `lib/nostr/ndk.ts`. All NDK operations (subscribe, publish) go through this single relay. Federation (multiple relays) is supported by expanding the `RELAYS` array — NDK handles multiplexing automatically.

**Runtime relay switching** (letting users change the relay from the Profile screen without rebuilding) is planned. It requires:
1. Persisting the relay URL in AsyncStorage.
2. Re-initialising the NDK singleton when the URL changes (requires app restart or context re-mount).

---

## Data Flow Summary

```
User action
  → lib/nostr/* (protocol layer)
      → NDKEvent.publish() → WebSocket → relay
      ← NDKSubscription.on("event") ← WebSocket ← relay
  → lib/hooks/* (React state)
  → UI component render
```

Encrypted group data never passes through the relay in plaintext. The relay is a dumb message bus for group flows — it stores and forwards ciphertext it cannot read.
