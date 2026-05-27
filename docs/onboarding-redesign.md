# Onboarding Redesign Plan

**Status**: Draft v1.0  
**Goal**: Redesign onboarding to show outcomes (not features), enable guest browsing of public events/circles, and build a habit-forming engagement loop.

---

## 1. Current State Analysis

### Existing Flow

```
App Launch
  → useInitializeApp() checks isOnboardingComplete()
    → FIRST LAUNCH: router.replace('/onboarding')
      → Welcome (branding)
      → Events (feature showcase: Discover/Create/RSVP)
      → Location (permission request)
      → Login (Apple/Google stubs + "Proceed Anonymously")
        → getOrCreateIdentity() generates nsec
        → completeOnboarding() writes "true"
        → router.replace('/(tabs)/events')
    → RETURNING: connectNDK(signer), process gift wraps
```

### Problems

| Issue | Impact |
|---|---|
| **Feature showcase, not outcome** | Users see "Discover, Create, RSVP" — they don't see *actual events happening near them* |
| **No guest browsing** | Every screen requires NDK context (signer + connected relay). No way to browse before committing |
| **"Proceed Anonymously" is the only path** | OAuth stubs create false expectation; user thinks they're choosing auth method |
| **Key generated silently** | No verification screen, no chance to back up nsec, no understanding of identity model |
| **No city selection during onboarding** | Location permission requested but city defaults to hardcoded value |
| **Onboarding ends at login** | No progressive engagement, no milestones, no habit loop |
| **No permission priming** | Location requested via `expo-location` directly — no custom context screen |

---

## 2. Redesign Goals

### 2.1 Primary: Show the Outcome, Not the Features

**Principle**: Before asking the user to generate a key, they must see *why* this app is useful.

**Implementation**:
- **Guest mode**: App opens directly to a live feed of public events
- Real events from their city/region (or global defaults)
- No login required to browse list, calendar, or map views
- Read-only NDK connection (no signer) for public event subscription

**Reference apps** (from Mobbin research):
- **Loom** — "Record & share screen or cam" with live demo animation
- **Duolingo** — Try a lesson before signup
- **Speak** — "Speak 1,000 phrases in your first week" with lesson preview
- **Headspace** — "Take a Tour" 2-min animation before signup

### 2.2 Secondary: Progressive Onboarding

Instead of a linear 4-page funnel, onboarding is **interleaved** with usage:

```
[Open App]
  → Live Events Feed (guest mode) ← AHA MOMENT
    → "See events near you? Create your identity to RSVP"
      → Key Generation Screen
        → [Optional] City Selection / Permission
          → First RSVP ← MILESTONE
            → "You're going! 🎉"
              → First Event Created ← MILESTONE
                → "Your event is live! 🔥"
                  → [Habit Loop] Weekly digest, notifications
```

### 2.3 Tertiary: CRO & Habit Formation

Onboarding is not a one-time screen sequence — it's a **30-day engagement program**.

---

## 3. Guest Mode Architecture

### 3.1 Technical Requirements

**Current limitation**: `usePublicEvents()` requires `ndk` from `NDKContext`, which is only populated after `getOrCreateIdentity()` + `connectNDK(signer)`.

**Required change**: Initialize NDK in **read-only mode** before onboarding completes.

```typescript
// packages/infrastructure/src/nostr/ndk.ts
export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: RELAYS,
    });
  }
  return ndkInstance;
}

export function connectNDK(signer?: NDKSigner): NDK {
  const ndk = getNDK();
  if (signer) {
    ndk.signer = signer;
  }
  return ndk;
}

// NEW: Connect without signer for guest browsing
export async function connectNDKGuest(): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(5000);
  return ndk;
}
```

### 3.2 Guest Mode Data Flow

```
[App Launch]
  → useInitializeApp()
    → Always call connectNDKGuest() first (no signer needed)
    → Set ndk in NDKContext immediately
    → Check isOnboardingComplete()
      → If complete: attach signer, get user, process gift wraps
      → If not: stay in guest mode, show live feed
```

### 3.3 Guest Mode Restrictions

| Feature | Guest | Authenticated |
|---|---|---|
| Browse public events | ✅ | ✅ |
| Calendar view | ✅ | ✅ |
| Map view | ✅ | ✅ |
| View public circles | ✅ (city + global) | ✅ (all) |
| RSVP to event | ❌ (prompt to create identity) | ✅ |
| Create event | ❌ (prompt to create identity) | ✅ |
| Create/join private circles | ❌ | ✅ |
| Send messages | ❌ | ✅ |

### 3.4 UI Patterns for Guest Barriers

When a guest taps a restricted action:

1. **Soft barrier** (preferred): Show a contextual upsell
   - "RSVP to save your spot" → CTA: "Create Identity"
   - "Host your own event" → CTA: "Get Started"

2. **Pattern reference**: CRED, Duolingo — the action button is visible but triggers the auth flow inline rather than blocking the UI.

---

## 4. New Onboarding Flow Design

### 4.1 Phase 0: Splash → Live Feed (Immediate Value)

```
[App Opens]
  → SplashScreen (1-2s)
    → Events Feed (guest mode)
      → Real events from default city or geolocation
      → Animated intro badge: "Welcome to Klk 🎉"
```

**Why**: The fastest path to value. No pager, no "Next" taps. The user sees events within 2 seconds.

### 4.2 Phase 1: Contextual Prompts (Interleaved)

Instead of a linear flow, prompts appear **contextually** as the user interacts:

#### Prompt A: "See something you like?"
- **Trigger**: User scrolls 3+ events or taps an event detail
- **Content**: "Create your identity to RSVP and host your own events"
- **CTA**: "Get Started" / "Later"
- **Dismissal**: Can be dismissed; re-shows after 3 more sessions

#### Prompt B: Location Permission
- **Trigger**: User taps "Map" view or manually changes city
- **Content**: Custom screen explaining why location helps (see Mobbin: Klook, Beli)
- **CTA**: "Allow Location" / "Choose City Manually"
- **No**: App works with manual city picker

#### Prompt C: Key Generation (The "Verification" Screen)
- **Trigger**: User taps any restricted action (RSVP, Create, Join Circle)
- **Content**:
  ```
  Your Identity on Klk

  Klk uses the Nostr protocol. Your identity is a
  cryptographic keypair that lives on your device.

  npub: npub1... (shown)
  nsec: nsec1... (hidden, tap to reveal)

  ⚠️ Save your nsec somewhere safe. If you lose it,
     your identity cannot be recovered.

  [I've Saved My nsec] [Copy nsec]
  ```
- **Why**: Educates the user about the protocol, creates accountability for key backup, and feels like "verification" rather than "login"

### 4.3 Phase 2: First Actions (Aha Moment)

After key generation, guide the user to their first meaningful action:

```
[Key Generated]
  → "Welcome! Here are events near you"
    → (If no events in city) "Be the first to create one!" ← prominent CTA
    → (If events exist) Highlight one event: "This is happening tomorrow — interested?"
      → Tap → Event Detail → RSVP
        → 🎉 MILESTONE: "You're going! Your first RSVP"
```

### 4.4 Phase 3: Habit Loop (Days 1-30)

See Section 6 for full habit/gamification strategy.

---

## 5. Permission Priming Screens

### 5.1 Location Permission

**Reference**: Klook, Beli, Waymo (from Mobbin)

**Screen design**:
```
┌─────────────────────────────┐
│  [Map illustration]         │
│                             │
│  Find Events Near You       │
│                             │
│  Allow location to discover │
│  events in your city. You   │
│  can also choose a city     │
│  manually.                  │
│                             │
│  [Allow Location]           │
│  [Choose City Manually]     │
└─────────────────────────────┘
```

**Flow**:
1. Show custom screen (above)
2. User taps "Allow Location"
3. App calls `expo-location.requestForegroundPermissionsAsync()`
4. If denied → fallback to manual city picker

### 5.2 Notification Permission

**Reference**: Life360, Lyft, Pillow (from Mobbin)

**Trigger**: After user's first RSVP or first event creation

**Screen design**:
```
┌─────────────────────────────┐
│  [Bell illustration]        │
│                             │
│  Don't Miss Out             │
│                             │
│  Get notified when:         │
│  • Events you're attending  │
│    are updated              │
│  • New events are posted    │
│    in your city             │
│                             │
│  [Allow Notifications]      │
│  [Not Now]                  │
└─────────────────────────────┘
```

---

## 6. CRO, Engagement & Habit Formation

### 6.1 Philosophy

Onboarding is a **30-day program**, not a 4-screen sequence. The goal is to move users through:

```
Awareness → Interest → Action → Habit
   ↓           ↓         ↓        ↓
See events   Browse    RSVP/    Weekly
             details   Create   ritual
```

### 6.2 Milestone System

Milestones are **celebrated moments** that create positive reinforcement and social proof.

#### Milestone Triggers

| Milestone | Trigger | Reward | UI |
|---|---|---|---|
| **First Open** | App launched | Welcome toast | "Welcome to Klk 🎉" |
| **First Event Viewed** | Tapped event detail | — | "Tap RSVP to save your spot" contextual hint |
| **Identity Created** | Generated nsec | — | "Your identity: npub1..." screen |
| **First RSVP** | Published kind-31925 | Confetti animation | "You're going! 🎉" + share CTA |
| **First Event Created** | Published kind-31923 | Confetti + glow | "Your event is live! 🔥" |
| **First Circle Joined** | Decrypted gift wrap | — | "You're in! 🙌" |
| **First Circle Created** | Generated symkey | — | "Circle ready. Invite friends!" |
| **3-Day Streak** | Opened app 3 days in a row | Badge | "3-day streak 🔥 Keep exploring!" |
| **7-Day Streak** | 7 days | Badge + theme unlock? | "Week warrior! 🏆" |
| **10 RSVPs** | Cumulative | Badge | "Social butterfly 🦋" |
| **5 Events Hosted** | Cumulative | Badge | "Community builder 🏗️" |

#### Milestone UI Patterns

1. **Confetti overlay** — Lottie or Reanimated particles
2. **Bottom sheet celebration** — "You did it!" with share CTA
3. **Toast with icon** — Non-blocking, auto-dismiss
4. **Profile badge** — Persistent trophy in profile screen

### 6.3 Gamification (v2)

Future iterations can add:

- **City leaderboard** — Most active event hosts/RSVPers per city
- **Event streaks** — Attended 3 events in a month
- **Host reputation** — Attendee count / repeat attendance rate
- **Circle growth** — Members invited, events hosted within circle

### 6.4 Re-engagement Hooks

| Hook | Trigger | Channel |
|---|---|---|
| **Weekly digest** | Sunday AM | Push notification: "3 events this week in [City]" |
| **RSVP reminder** | 24h before event | Push: "[Event] is tomorrow!" |
| **Event update** | Event edited | Push: "[Event] details updated" |
| **New event in city** | Real-time | Push: "New event near you: [Title]" |
| **Streak at risk** | Day 2 without open | Push: "Don't lose your 3-day streak 🔥" |
| **Circle activity** | New message/event | Push: "New activity in [Circle]" |

### 6.5 Empty States as Onboarding

Every empty state is an opportunity to teach:

| Screen | Empty State | CTA |
|---|---|---|
| Events Feed | "No events in [City] yet" | "Be the first to create one!" |
| Circles | "No circles yet" | "Create a private group" |
| RSVPs | "You haven't RSVP'd to anything" | "Browse events near you" |
| Profile | "Your profile is empty" | "Share your npub with friends" |

---

## 7. Mock Data Strategy

### 7.1 Dev Environment

For development and demos, provide realistic mock events:

```typescript
// apps/events/src/mocks/events.ts
export const MOCK_EVENTS: PublicEvent[] = [
  {
    id: 'mock-1',
    title: 'Weekly Run Club',
    location: 'Parc de la Ciutadella, Barcelona',
    start: Date.now() + 86400000, // tomorrow
    summary: 'Casual 5K run. All levels welcome!',
    city: 'barcelona',
    pubkey: 'mock-pubkey-1',
  },
  // ... 10-15 varied events
];
```

**Usage**:
- If `NODE_ENV === 'development'` and relay returns empty, inject mocks
- Visual indicator: "[Demo Data]" badge on mock events

### 7.2 Production: Global Events

For production, seed the relay with **global public events**:

- Major cultural events (New Year's, local festivals)
- Recurring community events (weekly markets, run clubs)
- These are published by a Klk "official" npub
- City-tagged so they appear in relevant feeds

**Implementation**:
- Admin tool or script to publish seed events
- Events have long duration (e.g., "Barcelona Summer Festival" spanning weeks)
- Updated seasonally

---

## 8. Implementation Phases

### Phase 1: Guest Mode Foundation (Week 1)

**Goal**: User can open app and see events without creating identity.

- [ ] Refactor `useInitializeApp()` to always connect NDK (no signer)
- [ ] Create `GuestBarrier` component for restricted actions
- [ ] Add guest mode to `usePublicEvents()` (skip RSVP/create checks)
- [ ] Remove onboarding pager redirect — app opens directly to tabs
- [ ] Add "Create Identity" CTA in Feed header or FAB

### Phase 2: Progressive Prompts (Week 2)

**Goal**: Contextual prompts replace linear onboarding.

- [ ] Remove `/onboarding` route and pages
- [ ] Create `IdentityPrompt` bottom sheet
- [ ] Create `LocationPrimer` screen
- [ ] Add prompt trigger logic (3 event views → show prompt)
- [ ] Add manual city picker (no location permission required)

### Phase 3: Key Generation & Verification (Week 2-3)

**Goal**: Transparent, educational identity creation.

- [ ] Build `IdentityScreen` with npub/nsec display
- [ ] Add nsec copy + "I've saved it" confirmation
- [ ] Wire `getOrCreateIdentity()` to show this screen first
- [ ] Add identity creation as prerequisite for restricted actions

### Phase 4: Milestones v1 (Week 3-4)

**Goal**: First 5 milestones implemented.

- [ ] Create `MilestoneTracker` store (nanostores)
- [ ] Implement: First Open, Identity Created, First RSVP, First Event, 3-Day Streak
- [ ] Add confetti animation component
- [ ] Add celebration bottom sheet
- [ ] Persist milestone state in AsyncStorage

### Phase 5: Notifications & Re-engagement (Week 4-5)

**Goal**: Permission priming + push notifications.

- [ ] Build `NotificationPrimer` screen
- [ ] Integrate `expo-notifications`
- [ ] Schedule weekly digest
- [ ] RSVP reminders (24h before)
- [ ] New event alerts

### Phase 6: Gamification v2 (Future)

- [ ] City leaderboards
- [ ] Host reputation scores
- [ ] Circle growth metrics
- [ ] Badge collection UI in Profile

---

## 9. UI/UX Patterns from Research

### 9.1 Show Outcome, Not Features

| App | Pattern | Application for Klk |
|---|---|---|
| **Loom** | Animated walkthrough of the product | Live event feed as the first screen |
| **Duolingo** | Try a lesson before signup | Browse events → prompt to RSVP |
| **Speak** | "1,000 phrases in your first week" | "5 events near you this week" |
| **Headspace** | 2-min guided tour video | Optional "How Klk Works" tooltip |
| **Pangea** | "See where everyone is" | Map view with event pins |

### 9.2 Custom Permission Screens

| App | Pattern | Application for Klk |
|---|---|---|
| **Klook** | "One last step..." with illustration | Location primer with map illustration |
| **Beli** | "Use Beli anywhere" with map graphic | Location primer with city discovery |
| **Lyft** | "Track your ride with push notifications" | Notification primer with event reminder |
| **Pillow** | "Don't Miss Important Reports" | Notification primer with sleep → event context |

### 9.3 Founder/Brand Notes

| App | Pattern | Application for Klk |
|---|---|---|
| **Centr** | Chris Hemsworth personal video welcome | Optional: protocol explanation note |
| **Craft** | "We asked users to come up with a tagline" | User testimonials about events |
| **timespent** | Founder letter explaining the "why" | "Why Nostr?" educational tooltip |

---

## 10. Files to Create / Modify

### New Files

```
apps/events/
  app/
    (tabs)/
      events/
        map.tsx              # Map view of events
        calendar.tsx         # Calendar view of events
    identity/
      index.tsx              # Key generation / verification screen
    primers/
      location.tsx           # Custom location permission screen
      notifications.tsx      # Custom notification permission screen
  src/
    features/
      guestStore.ts          # Guest mode state
      milestoneStore.ts      # Milestone tracking
      notificationStore.ts   # Push notification state
    components/
      GuestBarrier.tsx       # Soft barrier for restricted actions
      MilestoneCelebration.tsx # Confetti + celebration UI
      LocationPrimer.tsx     # Location permission primer
      NotificationPrimer.tsx # Notification permission primer
    mocks/
      events.ts              # Dev mock events
      circles.ts             # Dev mock public circles
  hooks/
    useMilestones.ts         # Milestone tracking hook
    useGuestMode.ts          # Guest mode detection
```

### Modified Files

```
apps/events/
  app/
    _layout.tsx              # Remove onboarding redirect; always show tabs
    (tabs)/
      _layout.tsx            # Add guest-aware tab items
      events/
        index.tsx            # Add view toggle (list/calendar/map)
      circles/
        index.tsx            # Show public circles when guest
  src/
    features/
      use-public-events.ts   # Support guest mode (no signer needed)
      onboardingStore.ts     # Simplify or repurpose
  hooks/
    useInitializeApp.ts      # Always connect NDK; defer signer attachment

packages/infrastructure/
  src/
    nostr/
      ndk.ts                 # Add connectNDKGuest()
      identity.ts            # Add explicit key generation screen support
    auth/
      complete-login.ts      # Update onboarding completion logic
```

---

## 11. Success Metrics

| Metric | Baseline | Target |
|---|---|---|
| Onboarding completion rate | N/A (no funnel) | >60% see events within 5s |
| Day-1 retention | N/A | >40% return |
| Day-7 retention | N/A | >20% return |
| First RSVP rate | N/A | >30% of openers |
| First event creation | N/A | >10% of openers |
| Location permission grant | N/A | >50% |
| Notification permission grant | N/A | >30% |

---

## 12. Open Questions

1. **Should we keep the onboarding pager as an optional "How it Works"?**
   - Recommendation: Yes, accessible from Settings or a "?" button, but not blocking

2. **Should mock events appear in production?**
   - Recommendation: Only if a city has <3 real events. Show "[Demo]" badge.

3. **How do we handle nsec backup?**
   - Option A: Force user to copy before proceeding
   - Option B: Allow skip, show periodic reminders
   - Recommendation: Option A for v1 (critical for Nostr identity)

4. **Should guest users have a persistent "guest identity"?**
   - Option A: Pure guest (no npub, purely read-only)
   - Option B: Generate nsec on first open, treat as "soft auth"
   - Recommendation: Option A for v1 (simpler, clearer value prop)

5. **City detection without location permission?**
   - Use IP geolocation as fallback
   - Manual city picker always available
   - Default to "Global" events if no city detected

---

## 13. Appendix: Mobbin Research References

### Onboarding: Show Outcome

- [Loom — Stay in the loop](https://mobbin.com/screens/38ff4bf6-a5bb-4dbd-ac4f-f4b3d27533e0)
- [Loom — Record & share](https://mobbin.com/screens/8b5b84cc-3d51-43ff-bc06-d942a9fb5cd2)
- [Duolingo — Enjoy continuous learning](https://mobbin.com/screens/a37887a9-b48c-4b42-99f1-2692b2daaf69)
- [Speak — Smart Review](https://mobbin.com/screens/ee9c796c-253b-407e-bd52-63f7cb74fb65)
- [Speak — 1,000 phrases](https://mobbin.com/screens/d5bc2c4a-81af-4ff9-8877-6921982d9fe9)
- [Headspace — Take a Tour](https://mobbin.com/screens/a28f8252-fdfd-4600-9b26-764a82c0e8f4)
- [Pangea — See where everyone is](https://mobbin.com/screens/6409398e-87be-48eb-9c47-efdc524e40f1)

### Permission Priming

- [Klook — One last step](https://mobbin.com/screens/b7890eb4-123b-478d-a9d2-5e1c84d720b9)
- [Beli — Use Beli anywhere](https://mobbin.com/screens/1820315c-e7e6-468f-8bea-711ed8dc3291)
- [Lyft — Track your ride](https://mobbin.com/screens/84b6a949-cd11-4283-8bc5-e6939db50c25)
- [Pillow — Don't Miss Important Reports](https://mobbin.com/screens/814f7829-304b-49f2-851b-9dadb978258c)
- [Life360 — Requires permissions](https://mobbin.com/screens/e597f054-7d50-4d1a-af3a-df0608a25892)
- [CRED — Grant access](https://mobbin.com/screens/495eb35e-96b1-422d-93f4-03e811afe6f9)
- [Waymo — Give permission](https://mobbin.com/screens/3d6cfed0-469d-4d73-b355-32f4f55e4ca3)

### Founder/Brand Notes

- [Centr — Chris Hemsworth welcome](https://mobbin.com/screens/621502c2-24e9-4cc9-bce9-bb348fa97d6b)
- [Bloom — Founder letter](https://mobbin.com/screens/6cb7e3d4-ca07-4f66-9512-7027ee4cb048)
- [timespent — Cal's letter](https://mobbin.com/screens/b1ad255f-a2ab-4129-b5c5-79c1ff3309b5)
- [Craft — User taglines](https://mobbin.com/screens/d9297ce4-0829-45fe-bded-8a906d564b0a)
- [Airbnb — Brian Chesky welcome](https://mobbin.com/screens/e6f9140b-7fba-46fc-b7ff-3f1828e97c1a)

---

*Document created: 2026-05-27*  
*Next step: Review and prioritize Phase 1 implementation*
