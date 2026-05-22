# Events App — Agent Validation Workflow

This document describes how an AI agent should validate the Events App against the specification.

## Prerequisites

Ensure these tools are installed globally:

- `nak` (Nostr relay): `brew install nak`
- `agent-device`: `npm install -g agent-device@latest`
- `@getgauge/cli`: `npm install -g @getgauge/cli` and `gauge install ts`
- `bun` package manager (already set in `package.json`)

## Validation Workflow

### 1. Start the Local Relay

In a dedicated terminal:

```bash
nak serve
```

This starts a local Nostr relay on `ws://localhost:10547` with in-memory storage. Restart `nak serve` to reset all events and state between test runs.

### 2. Build and Launch the App on Simulator

In a second terminal:

```bash
cd events-app
bun ios
```

Or alternatively:

```bash
bun start   # then press 'i' when prompted
```

This launches the Expo development server and the iOS simulator. The app will connect to the local relay running on the simulator's network.

### 3. Run E2E Tests with Gauge + agent-device

Once the app is running in the simulator, in a third terminal:

```bash
cd events-app
bun run test:e2e
```

Or run individual specs:

```bash
cd tests
gauge run specs/smoke.spec
```

The tests will:

1. Open an `agent-device` session controlling the running simulator
2. Execute each step (launch, screenshot, assert UI)
3. Save evidence screenshots to `tests/screenshots/`
4. Report pass/fail

### 4. Review Evidence

After the test run, screenshots and accessibility tree snapshots are saved in:

```
events-app/tests/screenshots/
```

These are embedded in the Gauge HTML report (generated in `tests/reports/html-report/`) which is human-readable.

---

## The 6 Flows to Validate

Per the specification, each iteration should add test coverage for these flows:

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

---

## Adding New Test Specs

To add coverage for the 6 flows:

1. Create a new `.spec` file in `tests/specs/` (e.g., `flow-2-view-events.spec`)
2. Write the specification as Markdown with `## Scenario` headers and `* Step` bullets
3. Implement the step methods in `tests/tests/StepImplementation.ts` using agent-device CLI commands:

   ```typescript
   @Step("Tap the <button> button")
   public async tapButton(button: string) {
     execSync(`agent-device find "${button}" --action click`, { stdio: "inherit" });
   }

   @Step("Type <text> in the <field> field")
   public async typeInField(text: string, field: string) {
     execSync(`agent-device fill "@e3" "${text}"`, { stdio: "inherit" });
   }
   ```

4. Run: `gauge run specs/flow-2-view-events.spec`

### agent-device Step Patterns

Common patterns for interacting with the app:

```bash
# Take a screenshot and save evidence
agent-device screenshot ./screenshots/step-name.png

# Get the accessibility tree (element refs like @e1, @e2, etc.)
agent-device snapshot -i

# Find and click an element
agent-device find "Button Label" --action click

# Fill a text input using element ref from snapshot
agent-device fill @e3 "text to type"

# Scroll or swipe
agent-device scroll "Feed" 5     # scroll down 5 units
agent-device swipe @e1 down      # swipe element down

# Wait and assert
agent-device find "Event Title"  # asserts element exists (exits 0) or fails

# Get device logs (for debugging)
agent-device logs
```

---

## Troubleshooting

**Issue**: `agent-device open 'Events App' --platform ios` fails

- **Check**: Is the iOS simulator running? (`xcrun simctl list devices`)
- **Check**: Has the app been built? (Run `bun ios` first to build)
- **Check**: Is `agent-device` installed? (`agent-device --version`)

**Issue**: Steps can't find UI elements

- **Debug**: Run `agent-device snapshot -i` manually to inspect the accessibility tree
- **Debug**: Check app is on the correct screen (take a screenshot: `agent-device screenshot debug.png`)
- **Fix**: Update step implementation to match actual element labels or refs

**Issue**: Relay has old state

- **Fix**: Restart `nak serve` in the relay terminal to reset in-memory storage

**Issue**: Gauge tests can't find `gauge-ts` package

- **Fix**: Run `cd tests && npm install` to install dependencies

---

## CI Integration

For CI/CD, the workflow is:

1. Start relay in background: `nak serve &`
2. Build app: `bun ios --headless` (or equivalent for CI)
3. Run tests: `bun run test:e2e`
4. Archive reports: `cp -r tests/reports/html-report/ /artifacts/`

The HTML report is viewable and shareable, containing all screenshots and step details.
