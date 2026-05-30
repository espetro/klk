# Do NOT fake Android-only native components with Pressable (or any JSX)

**Date:** 2026-05-28

## What happened

When `@expo/ui` FAB (FloatingActionButton, Android M3 Compose) and `FieldGroup`
(iOS SwiftUI) were first added, a cross-platform `.tsx` fallback was created using
`Pressable` to simulate the component on the other platform. This caused crashes
because Metro's platform resolution loaded the fallback file under specific conditions
and `@expo/ui` imports outside a `<Host>` boundary hard-crash.

The correct fix was to replace the fallback with a `null` stub.

## Rule

For Android-only or iOS-only `@expo/ui` native components:

- Create `.android.tsx` with the real component.
- Create `.ios.tsx` with the real component (or `null` if not available on that platform).
- The non-platform file (`.tsx` cross-platform) must export `null` — no JSX, no imports from `@expo/ui`.

```tsx
// button.tsx  (cross-platform fallback — Metro resolution safety)
export const HostedButton = null;
```

**Never** import `@expo/ui` in a cross-platform `.tsx` file. Metro may resolve it
directly and it will crash without a `<Host>` boundary.

## Reference

See `apps/events/AGENTS.md` § @expo/ui Host Boundary and
`.agents/notepad/2026-05-27-expo-ui-host-boundary.md` for the full incident analysis.
