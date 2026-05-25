# @klk/nostr-mobile Implementation + Android Fixes

**Date:** 2026-05-25

## What Was Done

Replaced the no-op mock at `packages/infrastructure/src/__mocks__/@nostr-dev-kit/ndk-mobile.ts`
with a real greenfield package `packages/nostr-mobile` (`@klk/nostr-mobile`).

Key files created:
- `packages/nostr-mobile/src/index.ts` — re-exports NDK class + selected named exports
- `packages/nostr-mobile/src/ndk.ts` — `createNDK()` factory, `NDKPrivateKeySigner` re-export
- `packages/nostr-mobile/src/cache/sqlite.ts` — `KlkSQLiteCacheAdapter` implementing `NDKCacheAdapter`

---

## Learning 1: Metro must be told about new `workspace:*` packages

`metro.config.cjs` has a manual `klkPackages` map — adding a new workspace package is NOT
automatic. If omitted, Metro throws `Unable to resolve module @klk/nostr-mobile`.

**Fix:** add the entry to `apps/events/metro.config.cjs`:
```js
'@klk/nostr-mobile': path.resolve(__dirname, '..', '..', 'packages', 'nostr-mobile', 'package.json'),
```

Any future `@klk/*` workspace package needs the same registration.

---

## Learning 2: Real NDK API differences vs the mock

| Point | Mock behaviour | Real NDK behaviour |
|-------|---------------|-------------------|
| `ndk.getUser({ pubkey })` | returned `Promise<NDKUser>` | **synchronous** — returns `NDKUser` directly. Remove all `await`. |
| `NDKFilter.kinds` | required `as any` for kind 1059 | accepts numeric literals — remove the cast |
| `NDKCacheAdapter.initialize(ndk)` | `initialize()` with no args | takes `(ndk: NDK)` — signature must match |
| `NDKCacheAdapter.query(sub)` | void / called `sub.eventReceived` directly | must return `NDKEvent[] \| Promise<NDKEvent[]>` |
| `NDKCacheAdapter.setEvent(e, filters, relay)` | relay was `string \| undefined` | relay is `NDKRelay \| undefined` |

---

## Learning 3: `NDKPool.connect()` hangs forever without a timeout

When no `timeoutMs` is passed, `NDKPool.connect()` creates:
```js
const timeoutPromise = new Promise(() => {}); // never resolves
await Promise.race([allConnectedPromise, timeoutPromise]);
```

If the relay is unreachable (e.g. `ws://localhost:10547` on Android emulator),
`allConnectedPromise` never fires either. Result: `await ndk.connect()` hangs
indefinitely, `SplashScreen.hideAsync()` is never called, app stays black forever.

**Fix:** always pass a timeout:
```ts
await instance.connect(5000); // 5s is enough; app continues even if relay is down
```

---

## Learning 4: `@expo/ui` Compose views need platform-specific `<Host>` wrappers

`Button` and `TextInput` from `@expo/ui` are Jetpack Compose views on Android and
SwiftUI views on iOS. They must be direct children of a `<Host>` with no `View`
wrapper between them and the Host, or the native composition boundary breaks.

The existing pattern only had an `.ios.tsx` variant using `@expo/ui/swift-ui`. The
default `.tsx` had no Host. Solution: add `.android.tsx` variants using
`@expo/ui/jetpack-compose`:

```tsx
// hosted-button.android.tsx
import { Button, type ButtonProps } from '@expo/ui';
import { Host } from '@expo/ui/jetpack-compose';

export function HostedButton(props: ButtonProps) {
  return <Host matchContents><Button {...props} /></Host>;
}
```

Same pattern for `hosted-input.android.tsx`. The default `.tsx` (web/other) stays
as-is without a Host since it's not a Compose/SwiftUI context.
