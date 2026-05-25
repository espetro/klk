# expo-modules-core reifiedOperationMarker Fix

**Date:** 2026-05-25

## Problem

Android app launched but showed no screen (blank). JS did load (Metro connected), but no screen rendered. Root cause was a native crash during module registration that prevented the React Native bridge from completing initialization.

```
UnsupportedOperationException: This function has a reified type parameter and thus can only be inlined at compilation time, not called directly.
at kotlin.jvm.internal.Intrinsics.reifiedOperationMarker(Intrinsics.java:213)
at expo.modules.image.ExpoImageModule.definition(ExpoImageModule.kt:517)
```

## Root Cause

`Module.kt` in `expo-modules-core@56.0.12` defined `ModuleDefinition` and `ModuleConverters` as:

```kotlin
inline fun Module.ModuleDefinition(crossinline block: ModuleDefinitionBuilder.() -> Unit): ModuleDefinitionData {
  return trace("${this.javaClass}.ModuleDefinition") { ModuleDefinitionBuilder(this).also(block).buildModule() }
}
```

`trace()` is NOT an inline function, so `block` is passed through a non-inline lambda boundary. `crossinline` allows this but prevents reified type parameters in `block` from being substituted at call sites. The DSL inside the module definition (`Prop<ViewType, PropType>`) calls `typeDescriptorOf<T>()` which needs reified T — impossible through a non-inline boundary.

Secondary issue: `typeDescriptorOf.kt` line 34:

```kotlin
val kTypeProvider = { typeOf<T>() }  // lambda capturing reified T = reifiedOperationMarker
```

## Fix Applied

**File 1: `node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/modules/Module.kt`**

Removed `crossinline` and `trace()` from both functions:

```kotlin
inline fun Module.ModuleDefinition(block: ModuleDefinitionBuilder.() -> Unit): ModuleDefinitionData {
  return ModuleDefinitionBuilder(this).also(block).buildModule()
}

inline fun Module.ModuleConverters(block: ModuleConvertersBuilder.() -> Unit): TypeConverterProvider {
  return ModuleConvertersBuilder().also(block).buildTypeConverterProvider()
}
```

Also removed `import expo.modules.kotlin.tracing.trace`.

**File 2: `node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/types/descriptors/typeDescriptorOf.kt`**

Evaluated `typeOf<T>()` eagerly before the lambda:

```kotlin
val kType = typeOf<T>()
val kTypeProvider = { kType }
```

**Patch file:** `patches/expo-modules-core@56.0.12.patch`
**Registered in:** root `package.json` → `patchedDependencies`

## Verification

After rebuilding with `./gradlew :app:assembleDebug --no-build-cache`:

- No `reifiedOperationMarker` in logcat
- App shows Events screen with city picker (Barcelona), empty state, and tab navigation
- Screenshot confirmed at 2026-05-25 18:49

## Note on bun Cache

The memory file referenced a bun cache at `node_modules/.bun/expo-modules-core@...`. This cache no longer exists (was cleared). The fix was applied to `node_modules/expo-modules-core/` directly and will be re-applied by `bun install` via the patch file.

## expo-nip55 Note

expo-nip55 was removed in a previous session (see 2026-05-25-ndk-mobile-expo-nip55-removal.md) because it required RN 0.79.x. With the reifiedOperationMarker fix, expo-image now works. expo-nip55 would have the same fix applied automatically if it were re-added.
