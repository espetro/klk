# Klk — Product Requirements Document

**Status:** M1 hardening (2026-05-30)

---

## Problem & User

Nostr-native event hosts want a private-by-default way to organise events with
a trusted group of people — without giving up self-custody of their keys or
depending on a centralised platform. Existing Nostr clients treat events as
public-only; private coordination happens in off-protocol side-channels (Signal,
Telegram) which breaks the social graph and the protocol's censorship-resistance
guarantees.

**Primary user:** someone who already has a Nostr keypair (or is willing to
generate one) and wants to plan a small private event (≤ ~30 people).

---

## PMF Hypothesis

> The smallest loop that proves value is:
> **create a private circle → invite ≥ 3 people → post an event inside it → RSVP.**

If 5 real users can complete this flow independently on the first try, the core
value proposition is validated and M2 (public relay interop) can begin.

---

## Current Screen Inventory

All 19 screens are implemented and documented with ASCII wireframes in
`tmp/current-ui/wireframes-ascii/`. The M1 PMF path runs through screens 10–18.

| #   | Screen                     | File                                 |
| --- | -------------------------- | ------------------------------------ |
| 1–5 | Onboarding                 | `app/onboarding/`                    |
| 6   | Events Home (map + list)   | `app/(tabs)/add/index.tsx`           |
| 7   | Events Listing             | `app/(tabs)/circles/index.tsx`       |
| 8   | Event Detail (public)      | `app/event/[id].tsx`                 |
| 9   | Create Public Event        | `app/event/new.tsx`                  |
| 10  | Circles Listing            | `app/(tabs)/circles/index.tsx`       |
| 11  | Create Circle              | `app/circle/new.tsx`                 |
| 12  | Circle Detail — Events tab | `app/circle/[id].tsx`                |
| 13  | Circle Event Detail        | `app/event/[id].tsx` (via circle)    |
| 14  | Circle Members tab         | `app/circle/[id].tsx`                |
| 15  | Circle Info tab            | `app/circle/[id].tsx`                |
| 16  | Create Event from Circle   | `app/circle/[id].tsx` (inline form)  |
| 17  | Circle Admin / Manage      | `app/circle/manage.tsx`              |
| 18  | Invite Member              | `components/invite-friend-sheet.tsx` |
| 19  | Profile                    | `app/(tabs)/`                        |

**PMF flow thread:** see `tmp/current-ui/wireframes-ascii/0-flows.md`.

**Ephemeral state overlays:**

- `8a-rsvp-confirm.txt` — RSVP button state transitions
- `11a-circle-created-toast.txt` — post-create success feedback
- `18a-invite-sent.txt` — post-invite success feedback

---

## M1 Gaps (hardening required before dogfood)

These are the only code tasks for M1. Nothing outside this list is in scope.

### 1. EventFormValues type misalignment (likely crash)

`circle/[id].tsx:handlePublishPrivateEvent` references `values.start` and
`values.end`, but `EventFormValues` (from `@klk/ui`) uses `startDate` /
`endDate` (matching `event/new.tsx`). This will crash at runtime when the
form is submitted from a circle.

**Fix:** Align field names in `circle/[id].tsx` to use `values.startDate` /
`values.endDate`.

### 2. RSVP button state not driven by useRsvps (unknown)

`event/[id].tsx` renders a button labelled "Not Going" by default. It is
unclear whether the button reflects the current user's actual RSVP status
from `useRsvps()`. If not, a user who has already RSVPed will see the wrong
state on re-open.

**Fix:** Read `rsvps` from `useRsvps(eventCoordinate)`; if `currentUser.pubkey`
is in the rsvps array, initialise button state to "Going ✓".

### 3. Missing success feedback (UX — dogfood blocker)

- Circle created: navigate silently. Add toast after `router.replace()` in
  `circle/new.tsx`. Reference: overlay `11a`.
- Invite sent: sheet closes silently. Emit toast from circle detail after
  `onCircleUpdated` fires. Reference: overlay `18a`.
- Copy Circle ID: no visual acknowledgement. Toggle a "Copied ✓" label for
  ~1.5 s. Reference: overlay `18a`.

### 4. Private event tap routes to public event screen (unverified)

`circle/[id].tsx` routes event taps to `/event/${e.id}`. If `e.id` is a
private Nostr event ID, this opens the public event detail screen which may
fail to decrypt. Verify this reaches the right screen or add a dedicated
private event detail route.

### 5. NDKMock type alias in InviteFriendSheet (verify)

`invite-friend-sheet.tsx` imports `NDKMock as NDK`. Confirm that NDKContext
injects the real NDK instance at runtime (not a mock). This is import-alias
only — grep `NDKMock` in infrastructure to confirm it re-exports real NDK.

---

## Non-goals (M1)

Everything in `docs/roadmap.md` § Non-goals. The PMF loop does not require
map view, calendar, public relay support, push notifications, or web.
