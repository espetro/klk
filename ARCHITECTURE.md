# Klk Architecture

> Living document describing the architectural patterns, tooling decisions, and migration strategy for the Klk monorepo.

## Guiding Principles

1. **Thin App Shell**: The Expo app (`apps/events`) contains only routing, DI wiring, and glue hooks. All business logic lives in packages.
2. **Clean Architecture**: Dependencies point inward. The domain (`packages/core`) knows nothing about React Native, NDK, or Expo.
3. **Error as Value**: All fallible operations return `Result<T, E>` via [neverthrow](https://github.com/supermacro/neverthrow). No exceptions for control flow.
4. **Explicit Contracts**: Ports (interfaces) in `core`, adapters in `infrastructure`. No direct NDK/Expo imports in screens.

## Package Structure

```
klk/
├── apps/
│   └── events/              # Thin shell: Expo Router + glue hooks
│       ├── app/             # File-based routing (Expo Router)
│       └── src/
│           ├── features/    # Glue hooks: useRsvpEvent(), useCreateEvent()
│           └── widgets/     # App-specific composites (CityPicker)
│
├── packages/
│   ├── core/                # Pure domain: ZERO React Native deps
│   │   ├── src/
│   │   │   ├── domain/      # Events, Users, Groups, Cities (plain TS + valibot)
│   │   │   ├── ports/       # IEventRepository, IStorageService, ICryptoService
│   │   │   └── use-cases/   # PublishEvent, RsvpEvent, CreateGroup (neverthrow)
│   │   └── package.json     # deps: valibot, neverthrow only
│   │
│   ├── infrastructure/      # Adapters implementing ports
│   │   ├── src/
│   │   │   ├── nostr/       # NostrEventRepository (wraps NDK)
│   │   │   ├── storage/     # ExpoStorageAdapter, SQLiteAdapter
│   │   │   └── crypto/      # AesGcmCryptoAdapter
│   │   └── package.json     # deps: @klk/core, @nostr-dev-kit/ndk-mobile, expo-*
│   │
│   └── ui/                  # Shared primitive components
│       ├── src/
│       │   ├── components/  # Button, Input, Card, Avatar
│       │   └── theme/       # Tailwind tokens, dark mode
│       └── package.json     # peerDeps: react, react-native
│
└── package.json             # Bun workspaces + Turbo
```

## Error Handling with neverthrow

All use-cases and repository methods return `Result<T, DomainError>` instead of throwing.

### Pattern

```typescript
// packages/core/src/ports/IEventRepository.ts
import { Result } from "neverthrow";

export interface IEventRepository {
  findByCity(city: string): Promise<Result<Event[], NostrError>>;
  publish(event: Event): Promise<Result<void, PublishError>>;
  rsvp(eventId: string, user: User): Promise<Result<void, RsvpError>>;
}
```

### Domain Errors

```typescript
// packages/core/src/domain/errors.ts
export class NostrError extends Error {
  constructor(
    message: string,
    public readonly code: "TIMEOUT" | "RELAY_ERROR" | "PARSE_ERROR",
  ) {
    super(message);
  }
}

export class PublishError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_EVENT" | "RELAY_REJECTED",
  ) {
    super(message);
  }
}
```

### Use-Case Implementation

```typescript
// packages/core/src/use-cases/PublishEvent.ts
import { Result, ok, err } from "neverthrow";

export const publishEvent = async (
  repo: IEventRepository,
  crypto: ICryptoService,
  event: DraftEvent,
): Promise<Result<PublishedEvent, PublishError>> => {
  const validation = validateEvent(event);
  if (validation.isErr()) return err(validation.error);

  const encrypted = event.isPrivate
    ? await crypto.encrypt(event.content, event.groupKey)
    : ok(event.content);

  if (encrypted.isErr()) return err(new PublishError("Encryption failed", "INVALID_EVENT"));

  return repo.publish({ ...event, content: encrypted.value });
};
```

### Consumption in UI

```typescript
// apps/events/src/features/useCreateEvent.ts
const result = await publishEvent(repo, crypto, draftEvent);

if (result.isErr()) {
  // Handle error explicitly — no try/catch
  showToast(result.error.message);
  return;
}

// Success path
router.push(`/event/${result.value.id}`);
```

## State Management

Current: React Context (3 contexts: NDK, City, Onboarding)

Planned: [nanostores](https://github.com/nanostores/nanostores) for cross-cutting state.

### Why nanostores?

- Framework-agnostic (works outside React)
- Atomic stores = perfect tree-shaking (~1.2KB total)
- Computed/derived stores built-in
- Zero dependencies

### Store Design

```typescript
// packages/infrastructure/src/state/cityStore.ts
import { atom } from "nanostores";
import { Result, ok, err } from "neverthrow";

export const $city = atom<string>("madrid");

export async function loadCity(): Promise<Result<void, StorageError>> {
  try {
    const stored = await AsyncStorage.getItem("city");
    if (stored) $city.set(stored);
    return ok(undefined);
  } catch (e) {
    return err(new StorageError("Failed to load city"));
  }
}
```

### Persistence

Custom AsyncStorage adapter (~20 lines) or `@nanostores/persistent` with custom storage engine. No built-in Expo support yet.

## Validation

[valibot](https://valibot.dev/) for runtime validation at domain boundaries.

### Why valibot?

- Fully tree-shakeable (~300B per schema vs Zod's ~10KB)
- Nearly identical API to Zod
- No dependencies

### Pattern

```typescript
// packages/core/src/domain/events.ts
import * as v from "valibot";

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

## Tooling

### Linting & Formatting

- **oxlint** replaces ESLint (~50ms vs ~3s)
- **oxfmt** replaces Prettier
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
plugins: ["react-native-reanimated/plugin", ["babel-plugin-react-compiler", { target: "18" }]];
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

## Migration Strategy

### Phase 1: Tooling (Week 1)

- [x] oxlint + oxfmt
- [x] Stricter tsconfig
- [x] React Compiler
- [x] Validate script with expo export/start

### Phase 2: Contracts (Week 1-2)

1. Create `packages/core/src/ports/` with TypeScript interfaces
2. Define domain errors with neverthrow
3. Write valibot schemas for Event, User, Group, City
4. Do NOT move any code yet — just write interfaces

### Phase 3: First Adapter (Week 2)

1. Create `packages/infrastructure/` with stub implementations
2. Wire ONE screen (e.g., `event/[id].tsx`) through ports
3. Run `bun run validate` to verify bundle integrity
4. Repeat for remaining screens

### Phase 4: Extraction (Week 2-3)

1. Move logic from `lib/nostr/` → `packages/infrastructure/src/nostr/`
2. Move `lib/auth/` → `packages/infrastructure/src/auth/`
3. Move `lib/storage/` → `packages/infrastructure/src/storage/`
4. Delete `lib/` as it empties

### Phase 5: State Migration (Week 3)

1. Replace `CityContext` → `$city` store
2. Replace `OnboardingContext` → `$onboarding` store
3. Keep `NDKContext` until NDK lifecycle is fully ported

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

## Watch Out For

- **NDK version pinning**: `@nostr-dev-kit/ndk-mobile` hard-deps RN 0.79.2 but app uses 0.85. Metro singleton redirect is a workaround.
- **Onboarding init**: `app/_layout.tsx` lines 28-55 is the most complex "thin shell" logic. Treat as first port boundary test.
- **Bundle size**: Adding packages means Metro resolves more modules. Monitor `expo export` output.
