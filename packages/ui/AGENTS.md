# UI Package — Agent Guide

Shared UI components and theme. Uses Tailwind CSS (via UniWind) and Expo UI Native platform (iOS/Android) components.

## Structure

```
src/
  components/  Button, Input, Card, Avatar, EventForm, CityPicker
  theme/       Tailwind tokens, dark mode, global.css
```

## Styling

Utility classes via UniWind:

```tsx
<View className='flex-row items-center gap-2 dark:bg-gray-900' />
```

## Theme

- Tailwind config in `theme/`
- Dark mode via `dark:` prefix
- Global styles in `global.css`

## Peer Dependencies

- `react` 19+
- `react-native` \*
- `uniwind`

## When Adding Components

1. Create in `src/components/`
2. Export from `src/index.ts`
3. Prefer extending Expo UI components; use UniWind utility classes for layout/spacing; fallback to React Native Reusables (RNR) components otherwise

## Skeleton Components

Skeletons are implemented with Reanimated `useSharedValue` + `withRepeat(withSequence(withTiming(...)))` for UI-thread safe opacity pulsing. This approach is:

- **Fast**: Runs on the UI thread, no JavaScript bridge overhead
- **Consistent**: Matches react-native-reusables (RNR) canonical pattern
- **Lightweight**: No shimmer, no `expo-linear-gradient` dependency

**Why no shimmer**: Shimmer requires `expo-linear-gradient`, which is not currently installed. Opacity pulsing is sufficient and consistent with RNR docs.

**If shimmer is needed later**: Install `expo-linear-gradient` and follow [`reactnativereusables.com/docs/components/skeleton`](https://reactnativereusables.com/docs/components/skeleton).

**Future**: Consider auto-generation from component data shapes via `boneyard.vercel.app`.

**Location**: Core skeleton in `src/components/skeleton.tsx`; composed into `*-skeleton.tsx` files per feature.
