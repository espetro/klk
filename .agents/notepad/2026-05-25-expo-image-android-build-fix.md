# expo-image transitive dependency conflict — Android build failure

**Date:** 2026-05-25
**Symptom:** `bun run android` fails with Kotlin compilation error:

```
GlideUrlWrapperLoader.kt:31:38 Argument type mismatch: actual type is 'ResponseBody?', but 'ResponseBody' was expected.
```

**Root cause:** `@nostr-dev-kit/ndk-mobile` transitively depends on `expo-image ~2.0.7`, while `expo-router` transitively depends on `expo-image ^55.0.11`. Bun's resolution installed `expo-image@2.0.7` at the root, which has a Kotlin null-safety bug incompatible with the OkHttp version shipped by React Native 0.83.6.

**Fix:** Explicitly declare `"expo-image": "~55.0.11"` in `package.json` dependencies to force the Expo 55-compatible version. Run `bun install` to update `bun.lock`.

**Files changed:**

- `package.json` — added `expo-image` dependency
- `bun.lock` — lockfile updated with correct resolution

**Prevention:** Always pin transitive native-module dependencies when multiple packages in the dependency tree require conflicting version ranges. Check `bun.lock` or `npm ls <pkg>` after installs to verify which version of native modules is actually resolved.
