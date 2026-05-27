# @expo/ui Host Boundary Rules

## Pattern Rules

`@expo/ui` components are Jetpack Compose (Android) / SwiftUI (iOS) under the hood. Any such component **must** be a direct child of `<Host>` from the matching platform package.

A cross-platform `.tsx` fallback that imports `@expo/ui` components without `Host` will crash if loaded on native, regardless of Metro's platform resolution intent.

**Use platform-split files (`.android.tsx`, `.ios.tsx`)** for any screen or component that uses `@expo/ui`; keep the `.tsx` as a pure React Native fallback with zero `@expo/ui` imports.

## Incident: event-form.tsx SwiftUI FieldGroup

**Date**: 2026-05-27

**Error**: "A SwiftUI view 'UIBaseView<FormViewProps, FormView>' is being mounted inside a standard UIView."

**Root cause**: `event-form.tsx` (cross-platform fallback) imported `FieldGroup` from `@expo/ui` without `<Host>` wrapping. Even though Metro should prefer `event-form.ios.tsx` (which has correct Host wrapping), having a SwiftUI component in the fallback is unsafe — it crashes any time Metro's platform resolution fails or the file is resolved directly.

**Fix**: Removed all `@expo/ui` imports from `event-form.tsx` and replaced `<FieldGroup>` structure with plain React Native `<View>` layout. Platform-specific `event-form.ios.tsx` remains untouched with correct `<Host>` + `<FieldGroup>`.

## Pattern Examples

### ✅ Correct: Platform-split

```
hosted-fab.tsx (doesn't exist — no cross-platform fallback for native-only components)
hosted-fab.android.tsx
  - Contains Jetpack Compose components wrapped in <Host>
hosted-fab.ios.tsx
  - Contains stub (returns null) for Metro resolution
```

### ❌ Wrong: Cross-platform with @expo/ui

```
hosted-fab.tsx
  - Imports Button from '@expo/ui'
  - No <Host> wrapper
  - This WILL crash on native
```

### ✅ Correct: Pure React Native fallback

```
event-form.tsx
  - Zero @expo/ui imports
  - Plain View, Text, Pressable only
  - Safe cross-platform fallback

event-form.ios.tsx
  - Imports FieldGroup from '@expo/ui'
  - Wrapped in <Host>
  - Only loaded on iOS via Metro resolution
```

## Verification

When adding a new `@expo/ui` component:

1. Create `.android.tsx` and `.ios.tsx` platform-specific files
2. Do NOT create a `.tsx` fallback — Metro will fail to resolve (that's correct)
3. If a cross-platform fallback is needed, use pure React Native only (no `@expo/ui`)
4. Run `bun run validate` to ensure no imports of native-only packages leak into fallbacks
