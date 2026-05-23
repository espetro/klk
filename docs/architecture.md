# Architecture

This document describes the technical architecture of Klk: how the client is structured, how it communicates with relays, and how each of the 6 user flows is implemented at the protocol level.

---

## Stack

| Layer           | Technology                                                |
| --------------- | --------------------------------------------------------- |
| Framework       | Expo 55 / React Native 0.83.6                             |
| JS Engine       | Hermes (New Architecture — Fabric + TurboModules)         |
| Routing         | Expo Router 55 (file-based, tab + modal)                  |
| UI              | NativeWind v4 (Tailwind CSS for React Native)             |
| Nostr client    | `@nostr-dev-kit/ndk-mobile` 0.8.x                         |
| Relay cache     | `expo-sqlite` via `NDKCacheAdapterSqlite`                 |
| Key storage     | `expo-secure-store` (iOS Keychain / Android Keystore)     |
| Encryption      | `@noble/ciphers/aes` — AES-256-GCM                        |
| RNG             | `expo-crypto` + `react-native-get-random-values` polyfill |
| Package manager | Bun                                                       |

---

## Project Layout

Monorepo structure with clear separation of concerns:

```
packages/
  core/           Domain models, ports, and use cases (neverthrow/valibot)
    src/
      domain/     Events, Users, Groups, Cities entities; errors
      ports/      Interfaces: IEventRepository, IStorageService, ICryptoService, IConfigService
      use-cases/  PublishEvent, RsvpEvent, CreateGroup, FindEventsByCity
  infrastructure/ Adapters implementing the ports
    src/
      nostr/      Nostr protocol layer: ndk, identity, events, rsvp, groups, tags, NostrEventRepository
      storage/    ExpoStorageAdapter, SecureStoreAdapter, CityStore, GroupsStore
      crypto/     AesGcmCryptoAdapter
      config/     ConfigService
  ui/             Shared UI components and theme
    src/
      components/ Button, Input, Card, Avatar, EventForm, CityPicker, etc.
      theme/      Tailwind tokens, dark mode, global.css
apps/events/      Main application
  app/            Expo Router pages (file = route)
    (tabs)/       Tab bar: Feed, Groups, Profile
    event/[id].tsx Event detail modal
    event/new.tsx Create public event
    group/[id].tsx Group detail modal
    group/new.tsx Create private group
  components/     App-specific components
  src/
    features/     Glue hooks (use-public-events, use-rsvps, use-identity, ndkStore, cityStore, onboardingStore)
    widgets/      App-specific composite components
tests/            Gauge E2E specs + step implementations
```

---

## NDK Initialization

`packages/infrastructure/src/nostr/ndk.ts` exports a singleton `NDK` instance. On first call it:

1. Creates an `NDKCacheAdapterSqlite` and calls `.initialize()` to create the SQLite schema.
2. Sets `explicitRelayUrls` to `[RELAY_URL]` (currently `ws://localhost:10547` for dev; production will use `wss://relay.klk.app`).

The singleton is created in `apps/events/app/_layout.tsx` inside the root `useEffect`, which also:

- Calls `instance.connect()` to open the WebSocket.
- Attaches the private key signer.
- Starts the NIP-59 gift-wrap listener (`processIncomingGiftWraps`).

### Metro resolver note

`@nostr-dev-kit/ndk-mobile` has a transitive dependency on `expo-nip55`, which hard-depends on `react-native@0.79.2`. Running this alongside RN 0.83.6 would cause a `PlatformConstants` TurboModule crash. The `metro.config.js` resolveRequest hook intercepts all singleton package requires (react-native, expo, react, react-native-reanimated) and redirects them to the app-level copy, preventing the nested version from being bundled.

---

## Identity (Flow 1)

```
packages/infrastructure/src/nostr/identity.ts → getOrCreateIdentity()
```

On first launch, `getOrCreateIdentity()`:

1. Generates a 32-byte private key using `expo-crypto`.
2. Creates an `NDKPrivateKeySigner` from it.
3. Persists the hex-encoded private key in `expo-secure-store`.

On subsequent launches it reads the stored key. The public key (npub) is derived from the private key via secp256k1 — it is never transmitted separately.

City selection is managed through nanostores (`apps/events/src/features/cityStore`) and drives the subscription filter (`["t", "city:<slug>"]`).

---

## Public Events (Flows 2 & 4)

### NIP-52 Calendar Events — kind 31923

```
packages/infrastructure/src/nostr/events.ts
apps/events/src/features/use-public-events.ts
```

**Publishing (Flow 4)**: `packages/core/src/use-cases/PublishEvent.ts` orchestrates the flow:

1. Validates input with valibot schemas
2. Calls `packages/infrastructure/src/nostr/events.ts` to create NDKEvent
3. Creates `NDKEvent` with:
   - `kind: 31923`
   - `tags: [["d", unique-id], ["t", "city:<slug>"], ["name", title], ...]`
   - `content`: description/summary
4. Signs and publishes via NDK.

**Subscribing (Flow 2)**: `apps/events/src/features/use-public-events.ts` subscribes with filter:

```ts
{ kinds: [31923], "#t": ["city:barcelona"] }
```

Results are surfaced as React state via nanostores and rendered in the Feed tab.

---

## RSVPs (Flow 3)

### NIP-52 Calendar RSVPs — kind 31925

```
packages/infrastructure/src/nostr/rsvp.ts
apps/events/src/features/use-rsvps.ts
packages/core/src/use-cases/RsvpEvent.ts
```

`packages/core/src/use-cases/RsvpEvent.ts` orchestrates the flow:

1. Validates input with valibot schemas  
2. Calls `packages/infrastructure/src/nostr/rsvp.ts` to publish NDKEvent
3. Publishes kind 31925 event referencing the event's `d` tag

`apps/events/src/features/use-rsvps.ts` subscribes to kind 31925 events and counts unique pubkeys, displayed as the guest count on the event detail screen.

---

## Private Groups (Flow 5)

### Group creation — local only

```
packages/infrastructure/src/nostr/groups.ts → createGroup()
packages/infrastructure/src/storage/groups-store.ts
```

`createGroup()` generates a 256-bit symmetric key using `expo-crypto.getRandomBytesAsync(32)` and a 128-bit group ID. Both are stored locally in `expo-secure-store` as a `GroupRecord`:

```ts
type GroupRecord = {
  id: string; // 16-byte hex
  name: string;
  symKey: string; // 32-byte hex — never leaves the device unencrypted
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
packages/infrastructure/src/nostr/groups.ts → publishPrivateEvent() / aesGcmEncrypt() / aesGcmDecrypt()
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

The relay URL is a module-level constant in `packages/infrastructure/src/nostr/ndk.ts`. All NDK operations (subscribe, publish) go through this single relay. Federation (multiple relays) is supported by expanding the `RELAYS` array — NDK handles multiplexing automatically.

**Runtime relay switching** (letting users change the relay from the Profile screen without rebuilding) is planned. It requires:

1. Persisting the relay URL in AsyncStorage.
2. Re-initialising the NDK singleton when the URL changes (requires app restart or context re-mount).

---

## Data Flow Summary

```
User action
  → packages/infrastructure/src/nostr/* (protocol layer)
      → NDKEvent.publish() → WebSocket → relay
      ← NDKSubscription.on("event") ← WebSocket ← relay
  → packages/core/src/use-cases/* (business logic)
  → apps/events/src/features/* (React state)
  → UI component render
```

Encrypted group data never passes through the relay in plaintext. The relay is a dumb message bus for group flows — it stores and forwards ciphertext it cannot read.

---

## Migration Status

The architecture migration from monolithic structure to clean architecture is complete:

### Phase 2 (Contracts): ✅ COMPLETE
- Domain models (Events, Users, Groups, Cities) in `packages/core/src/domain`
- Port interfaces in `packages/core/src/ports` (IEventRepository, IStorageService, ICryptoService, IConfigService)
- Use cases in `packages/core/src/use-cases` (PublishEvent, RsvpEvent, CreateGroup, FindEventsByCity)

### Phase 3 (First Adapter): ✅ COMPLETE  
- Infrastructure stubs created in `packages/infrastructure/src/`
- Nostr, storage, crypto, and config adapters implemented

### Phase 4 (Extraction): ✅ COMPLETE
- All `lib/` contents moved to `packages/`
- `lib/nostr/*` → `packages/infrastructure/src/nostr/*`
- `lib/hooks/*` → `apps/events/src/features/*`
- Library files migrated and cleaned up

### Phase 5 (State Migration): ✅ COMPLETE
- Nanostores replace React Context throughout the app
- `apps/events/src/features/` contains all state management hooks
- Eliminated context propagation issues

### Notes
- **NDKContext**: Remains in `apps/events/app/_layout.tsx` (final item to migrate to nanostores)
- **Testing**: All 6 E2E flows verified on iOS simulator with agent-device + Gauge
- **Validation**: `bun run validate` passes (TypeScript, lint, format, bundle, production start)

The migration successfully separated concerns while maintaining full compatibility with Nostr protocols and existing functionality.
