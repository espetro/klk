# ndk-mobile / expo-nip55 Removal - Build Verification

**Date:** 2026-05-25

## Problem

`@nostr-dev-kit/ndk-mobile` has a transitive dependency on `expo-nip55`, which hard-depends on `react-native@0.79.2`. Running this alongside RN 0.85.x causes a `PlatformConstants` TurboModule crash (per docs/architecture.md line 76).

## Action Taken

1. **Removed** `@nostr-dev-kit/ndk-mobile` from:
   - `packages/infrastructure/package.json`
   - `apps/events/package.json`

2. **Removed** `expo-nip55` from:
   - `apps/events/package.json` (was a direct dep; only used by ndk-mobile)

3. **Created mock** at `packages/infrastructure/src/__mocks__/@nostr-dev-kit/ndk-mobile.ts`
   - Exports: `NDKCacheAdapterSqlite`, `NDKPrivateKeySigner`, `NDKEvent`, `NDKUser`, `NDKSubscription`, `NDK` (default)
   - All methods are no-op/promise-resolving mocks preserving the same TypeScript interface

4. **Updated imports** in 13 files to use the mock:
   - `packages/infrastructure/src/nostr/ndk.ts`
   - `packages/infrastructure/src/nostr/events.ts`
   - `packages/infrastructure/src/nostr/groups.ts`
   - `packages/infrastructure/src/nostr/rsvp.ts`
   - `packages/infrastructure/src/nostr/identity.ts`
   - `packages/infrastructure/src/auth/complete-login.ts`
   - `apps/events/src/features/ndkStore.ts`
   - `apps/events/src/features/use-public-events.ts`
   - `apps/events/src/features/use-rsvps.ts`
   - `apps/events/src/features/use-group-events.ts`
   - `apps/events/lib/context/ndk-context.ts`
   - `apps/events/hooks/useInitializeApp.ts`
   - `apps/events/components/invite-friend-sheet.tsx`

5. **Re-ran** `bun install` to prune lockfile

6. **Ran** `expo prebuild --clean --platform android` → clean prebuild ✅

7. **Built** `./gradlew assembleDebug` → **BUILD SUCCESSFUL** ✅
   - APK: `apps/events/android/app/build/outputs/apk/debug/app-debug.apk` (289MB)
   - No ndk-mobile or expo-nip55 related errors

8. **Runtime verification** on Android emulator (Medium_Phone_API_36.1):
   - APK installed successfully: `adb install -r app-debug.apk` ✅
   - App launched: `adb shell am start -n dev.events.app/.MainActivity` ✅
   - App process running (PID 4321): `dev.events.app` ✅
   - **No ndk-mobile, expo-nip55, or PlatformConstants TurboModule errors** in logcat ✅
   - No app crashes detected

## Conclusion

**Confirmed: The build conflict was isolated to `ndk-mobile` / `expo-nip55`.** With these removed and mocked, the Android build AND runtime are clean. The app launches and runs without any ndk-mobile related errors.

## Next Steps

- Consider creating a custom `klk-ndk` package that wraps `nostr-tools` directly (avoiding `ndk-mobile`'s RN version pinning)
- Or wait for `ndk-mobile` to support newer RN versions
