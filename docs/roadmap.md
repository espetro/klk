# Klk — Roadmap

Single source of truth for the next half-month (updated 2026-05-30).

---

## M1 — PMF Probe (target: 2026-06-04)

**Goal:** Ship a TestFlight + Android internal-track build where the
*create circle → invite 3 people → post event → RSVP* flow works end-to-end
against the bundled Nostr relay without hand-holding.

**Success metric:** 5 dogfooders complete the flow independently.

**Scope (hardening only — flow already implemented):**

- Fix `EventFormValues` type misalignment between `circle/[id].tsx` (`values.start`/`values.end`) and `event/new.tsx` (`values.startDate`/`values.endDate`) — likely runtime crash.
- Confirm RSVP button state in `event/[id].tsx` reflects live `useRsvps()` — show "Going ✓" if current user's pubkey is in rsvps.
- Add success feedback: circle-created toast (11a), invite-sent toast (18a), copy-circle-id feedback.
- Confirm `circle/[id].tsx` routes private event taps to the correct detail screen (not the public event route).
- Verify `InviteFriendSheet` receives real NDK via `NDKContext` (not NDKMock stub).
- Native build gates green on CI before TestFlight submit.

---

## M2 — Public Relay Smoke (target: 2026-06-11)

**Goal:** Same M1 flow against a public Nostr relay (Damus / nos.lol).
Confirm protocol-level interop; no new features.

---

## M3 — Discovery Surface (target: end of cycle)

Map + calendar + city feed are already in-tree. Promoted only after M1 + M2
validate the core circle flow.

---

## Non-goals for the next 14 days

- MapLibre work (keep existing code; use react-native-maps/expo-maps for any new map work)
- Onboarding rewrites
- Any identifier rename
- Expo SDK / native dep upgrades
- Web target
- New auth flows / identity surfaces
- Group chat, push notifications
- Formatter config changes
- Architectural refactors

---

## Hard freeze (in effect until M1 ships)

No renames, no architectural refactors, no formatter changes, no Expo SDK or
native dep upgrades. Bug fixes and M1 hardening only.

If you're about to write a `refactor:` or `style:` commit, stop and check with
the user first.
