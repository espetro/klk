# Klk — Agent Guide

Main Expo Router app. File-based routing: files in `app/` = routes.

## Structure

```
app/
  (tabs)/          Tab bar: Feed, Groups, Profile
  event/[id].tsx   Event detail (modal)
  event/new.tsx   Create public event
  group/[id].tsx   Group detail (modal)
  group/new.tsx    Create private group
src/features/      Nanostores: use-public-events, use-rsvps, use-identity
components/        App-specific components
tests/             Gauge E2E specs + step implementations
```

## State Management

Uses nanostores (not React Context):

- `cityStore` — current city slug
- `ndkStore` — NDK singleton + connection state
- `onboardingStore` — first-launch flow state

## Icons

- For iOS, use [SF Symbols](https://github.com/andrewtavis/sf-symbols-online/blob/master/README.md)
- For Android, use [MD Icons](https://fonts.google.com/icons)

## @expo/ui Host Boundary

`@expo/ui` components are Jetpack Compose (Android) / SwiftUI (iOS) and must be wrapped in `<Host>` from the matching platform package.

**Pattern**: Use platform-split files (`.android.tsx`, `.ios.tsx`) for components using `@expo/ui`. Cross-platform `.tsx` fallbacks must contain zero `@expo/ui` imports — use pure React Native only.

**Why**: A fallback that imports `@expo/ui` without `<Host>` will crash if Metro's platform resolution fails or the file is resolved directly, even if platform-specific files exist.

See `.agents/notepad/2026-05-27-expo-ui-host-boundary.md` for incident details and verification patterns.

## E2E Testing

Prerequisites: `nak serve` (relay), `bun ios` (simulator), `gauge run specs/`

6 flows to validate:

1. Join city (keypair + city select)
2. View public events (city-tagged feed)
3. RSVP event (kind 31925)
4. Create public event (kind 31923)
5. Create private group + invite (NIP-59 gift wrap)
6. Create private group event (AES-256-GCM encrypted)

## Running the App

Use the parallel dev runner from the repo root:

```bash
bun run dev        # iOS + Android in parallel
bun run dev:ios    # iOS only
bun run dev:android # Android only
bun run dev:stop   # Kill session
```

See root `AGENTS.md` for full documentation including tmux controls and dangling session handling.

## Import Aliases

- `@/*` — local files (e.g., `@/features/use-public-events`)

## Key Dependencies

- `expo-router` — file-based routing
- `@nostr-dev-kit/ndk-mobile` — Nostr client
- `nanostores` + `@nanostores/react` — state management
- `expo-crypto` — key generation
