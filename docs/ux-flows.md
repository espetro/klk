# UX Flows

### Flow 1: Join a public city server

**Spec**: User generates a keypair on first launch, selects a city, connects to the relay
**Test**: `Launch app → profile shows npub → city picker works`
**Evidence**: Screenshot showing profile with npub and city selector active

### Flow 2: View public events

**Spec**: User sees a list of public events in the current city, filtered by `["t", "city:<slug>"]` tag
**Test**: `Create event in city → switch to feed → event appears in list`
**Evidence**: Screenshot showing feed with event card

### Flow 3: RSVP a public event

**Spec**: User RSVPs with NIP-52 kind-31925, guest count updates for event author
**Test**: `Event detail → tap RSVP → count increments → snapshot shows RSVP event on relay`
**Evidence**: Screenshot showing "You're going!" + guest list with 2+ names

### Flow 4: Create a public event

**Spec**: User publishes NIP-52 kind-31923 event with city tag, title, time, location, summary
**Test**: `New event form → fill fields → publish → feed refreshes → event appears`
**Evidence**: Screenshot showing filled form, then feed with new event

### Flow 5: Create a private group + invite a friend

**Spec**: User generates symmetric key, stores locally, invites via NIP-44/NIP-59 gift wrap
**Test**: `Groups tab → new group → invite (paste npub) → recipient sees group appear`
**Evidence**: Screenshot showing both sides seeing the same group in sidebar

### Flow 6: Create a private event for the group

**Spec**: Event encrypted with group symkey, published as kind-30078, decrypted by group members only
**Test**: `Group detail → new private event → publish → appears for both → third user sees ciphertext only`
**Evidence**: Screenshot showing decrypted event, and terminal output of raw event JSON (ciphertext)
