# Do NOT use @expo/ui BottomSheet for new sheets

**Date:** 2026-05-28

## What happened

`@expo/ui BottomSheet` was adopted, then reverted, then re-adopted, then reverted again
within a single two-week cycle. Each flip-flop cost ~1 day of churn in commit history.

## Root cause

`@expo/ui BottomSheet` is a SwiftUI / Compose primitive exposed via JSI. Its API surface
changed between SDK preview builds, and the detached-header / grabber configuration behaved
differently across iOS versions and Android API levels. The revert path was always "use RN Modal".

## Rule

Use `React Native Modal` with `presentationStyle="pageSheet"` for all new bottom sheets.
Do not introduce `@expo/ui BottomSheet` for new surfaces without explicit user sign-off
and a pinned SDK version that has been verified on both platforms.

## How to spot the trap

If you find yourself writing:

```tsx
import { BottomSheet } from '@expo/ui';
```

Stop. Use instead:

```tsx
import { Modal } from 'react-native';
<Modal presentationStyle="pageSheet" animationType="slide" ... />
```

The existing `InviteFriendSheet` (`apps/events/components/invite-friend-sheet.tsx`) is
the approved reference pattern.
