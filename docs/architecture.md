# Architecture

This document describes the technical architecture of Klk: how the client is structured, how it communicates with relays, and how each of the 6 user flows is implemented at the protocol level.

---

## Stack

| Layer           | Technology                                                              |
| --------------- | ----------------------------------------------------------------------- |
| Framework       | Expo 56 / React Native 0.85.6                                           |
| JS Engine       | Hermes (New Architecture — Fabric + TurboModules)                       |
| Routing         | Expo Router 56 (file-based, tab + modal)                                |
| UI              | UniWind (Tailwind CSS for RN) + Expo UI (native iOS/Android components) |
| Nostr client    | `@nostr-dev-kit/ndk-mobile`.x                                           |
| Relay cache     | `expo-sqlite` via `NDKCacheAdapterSqlite`                               |
| Key storage     | `expo-secure-store` (iOS Keychain / Android Keystore)                   |
| Encryption      | `@noble/ciphers/aes` — AES-256-GCM                                      |
| RNG             | `expo-crypto` + `react-native-get-random-values` polyfill               |
| Package manager | Bun                                                                     |

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
    circle/[id].tsx Circle detail modal
    circle/new.tsx Create private circle
  components/     App-specific components
  src/
    features/     Glue hooks (use-public-events, use-rsvps, use-identity, ndkStore, cityStore, onboardingStore)
    widgets/      App-specific composite components
tests/            Gauge E2E specs + step implementations
```

---

## Design Tokens

Klk uses a semantic design token system built on Tailwind v4 with CSS custom properties. This system provides a consistent, maintainable foundation for the UI while maintaining flexibility for different contexts.

### Base Palette

The base palette defines the raw color values that serve as the foundation of the design system. These are the source values that all semantic tokens reference.

| Token | Hex Value | Purpose |
|-------|-----------|---------|
| `paper-100` | `#FDFBF7` | Warm global background |
| `paper-200` | `#F5F0E8` | Elevated surfaces, cards, sheets |
| `ink-900` | `#1A1612` | Primary text, strongest icon color |
| `ink-600` | `#5C554D` | Secondary text, metadata, hints |
| `accent-500` | `#C45B3A` | Main brand accent (terracotta) |
| `accent-400` | `#D97B5D` | Softer highlight |
| `accent-olive-500` | `#7A8450` | Secondary accent (olive) |

### Semantic Tokens

Semantic tokens provide meaning and context to the UI. These are the tokens that should be used directly in components and styles.

| Token | Maps To | Usage |
|-------|---------|-------|
| `bg-default` | `paper-100` | App background, default page background |
| `bg-elevated` | `paper-200` | Cards, drawers, modal sheets, elevated surfaces |
| `text-primary` | `ink-900` | Titles, body text, strong labels, primary content |
| `text-secondary` | `ink-600` | Supporting copy, timestamps, captions, metadata |
| `text-inverse` | `paper-100` | Text on dark or accent-filled surfaces |
| `action-primary` | `accent-500` | Main CTA, active chips, primary highlights |
| `action-secondary` | `accent-olive-500` | Secondary action, category emphasis, chips |
| `state-highlight` | `accent-400` | Focus states, onboarding prompts, hover glows |

### Integration

The design tokens are implemented as CSS custom properties in `apps/events/global.css` and automatically generate Tailwind utility classes. For complete details on implementation, usage examples, and component patterns, see [docs/designtokens.md](docs/designtokens.md).

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

## Guiding Principles

1. **Thin App Shell**: The Expo app (`apps/events`) contains only routing, DI wiring, and glue hooks. All business logic lives in packages.
2. **Clean Architecture**: Dependencies point inward. The domain (`packages/core`) knows nothing about React Native, NDK, or Expo.
3. **Error as Value**: All fallible operations return `Result<T, E>` via [neverthrow](https://github.com/supermacro/neverthrow). No exceptions for control flow.
4. **Explicit Contracts**: Ports (interfaces) in `core`, adapters in `infrastructure`. No direct NDK/Expo imports in screens.

---

## Error Handling

All use-cases and repository methods return `Result<T, DomainError>` instead of throwing.

```typescript
import { Result } from 'neverthrow';

export interface IEventRepository {
  findByCity(city: string): Promise<Result<Event[], NostrError>>;
  publish(event: Event): Promise<Result<void, PublishError>>;
  rsvp(eventId: string, user: User): Promise<Result<void, RsvpError>>;
}
```

Domain errors use typed codes:

```typescript
export class NostrError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'RELAY_ERROR' | 'PARSE_ERROR'
  ) {
    super(message);
  }
}

export class PublishError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_EVENT' | 'RELAY_REJECTED'
  ) {
    super(message);
  }
}
```

Consumption in UI:

```typescript
const result = await publishEvent(repo, crypto, draftEvent);
if (result.isErr()) {
  showToast(result.error.message);
  return;
}
router.push(`/event/${result.value.id}`);
```

---

## State Management

Uses [nanostores](https://github.com/nanostores/nanostores) for cross-cutting state:

- Framework-agnostic (works outside React)
- Atomic stores = perfect tree-shaking (~1.2KB total)
- Computed/derived stores built-in
- Zero dependencies

```typescript
import { atom } from 'nanostores';

export const $city = atom<string>('madrid');

export async function loadCity(): Promise<Result<void, StorageError>> {
  try {
    const stored = await AsyncStorage.getItem('city');
    if (stored) $city.set(stored);
    return ok(undefined);
  } catch (e) {
    return err(new StorageError('Failed to load city'));
  }
}
```

Custom AsyncStorage adapter or `@nanostores/persistent` with custom storage engine.

---

## Validation

[valibot](https://valibot.dev/) for runtime validation at domain boundaries:

- Fully tree-shakeable (~300B per schema vs Zod's ~10KB)
- Nearly identical API to Zod
- No dependencies

```typescript
import * as v from 'valibot';

export const EventSchema = v.object({
  id: v.string(),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  city: v.string(),
  startTime: v.date(),
  location: v.optional(v.string()),
  isPrivate: v.boolean(),
});

export type Event = v.InferOutput<typeof EventSchema>;

export const parseEvent = (raw: unknown): Result<Event, ValidationError> => {
  const result = v.safeParse(EventSchema, raw);
  return result.success ? ok(result.output) : err(new ValidationError(result.issues));
};
```

---

## Tooling

### Linting & Formatting

- **oxlint**
- **oxfmt**
- **@expo/oxlint-config-universe** for Expo-specific rules
- Config: `.oxlintrc.json` at root, `.oxfmt.toml` at root

### TypeScript

Strict config with additional guards:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedSideEffectImports": true
  }
}
```

### React Compiler

Babel plugin added to `babel.config.cjs`:

```js
plugins: ['react-native-reanimated/plugin', ['babel-plugin-react-compiler', { target: '19' }]];
```

Auto-memoizes components. Manual `useMemo`/`useCallback` can be removed over time.

### Validation Script

`scripts/validate.ts` runs checks via `tasuku`:

1. TypeScript (`tsc --noEmit`)
2. Lint (`oxlint`)
3. Format (`oxfmt --check`)
4. Bundle Check (`expo export --platform ios`) — catches Metro/Hermes issues
5. Production Start (`expo start --no-dev`) — smoke test

Run: `bun run validate`

---

## Key Decisions

| Decision         | Choice                | Rationale                                                    |
| ---------------- | --------------------- | ------------------------------------------------------------ |
| Core deps        | Zero RN deps          | Pure TypeScript. NDK stays in `infrastructure/`.             |
| FSD in app       | Pages + Features only | `entities/` and `shared/` belong in packages.                |
| State management | nanostores            | Atomic, tree-shakeable, framework-agnostic.                  |
| Validation       | valibot               | 30x smaller than Zod, same API.                              |
| Error handling   | neverthrow            | Explicit error paths, no try/catch soup.                     |
| Package linking  | Internal packages     | Path aliases in tsconfig, no build step.                     |
| Feature flags    | Port only             | Add `IConfigService` to `@klk/core/ports/`. Implement later. |

---

## Watch Out For

- **NDK version pinning**: `@nostr-dev-kit/ndk-mobile` hard-deps RN 0.79.2 but app uses 0.85. Metro singleton redirect is a workaround.
- **Onboarding init**: `app/_layout.tsx` lines 28-55 is the most complex "thin shell" logic. Treat as first port boundary test.
- **Bundle size**: Adding packages means Metro resolves more modules. Monitor `expo export` output.
