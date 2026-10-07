# Multi-user simulation harness

`tools/sim` (`@klk/sim`) drives **N real users against a real relay** for
development — two modes: a headless scripted `swarm` and an interactive
tmux `watch/drive` mode. Actors only call `@klk/core` verbs (`connect`,
`createCircle`, `joinCircle`, `postEvent`, `setRsvp`, `suggestChange`,
`applySuggestion`, …) — the same surface the app uses — each on its own
`createRealm()` instance, so N actors = N independent nanostore realms +
N WebSocket connections in one process. No browser, no raw nostr-tools.

Requires Node ≥ 22.18 (the repo pins Node 24) — the CLI runs straight on
TypeScript source via `node --experimental-transform-types`.

## Setup

```bash
pnpm install
alias klk-sim='node tools/sim/bin/klk-sim.mjs'   # or: pnpm -F @klk/sim klk-sim <cmd>
```

## Swarm mode (headless)

```bash
klk-sim swarm --users 8 --scenario social --spawn-relay
```

`--spawn-relay` runs `go build ./cmd/klk-relay` and boots the relay on a
free port with its data inside the run dir; use `--relay ws://…` to hit an
already-running relay instead (default `ws://localhost:3334`).

The swarm connects all actors, runs the scenario, prints a per-actor log
(`[ann] …`, `[bob] …`), then an assertion table and a PASS/FAIL verdict —
exit code 0/1, so it's scriptable. Per-actor logs and keyfiles land in the
run dir (`$TMPDIR/klk-sim-<ts>` or `--run-dir`), plus `checks.json`.

Flags: `--users N` · `--scenario <name>` · `--relay ws://…` ·
`--spawn-relay` · `--run-dir DIR` · `--timeout MS` (per-convergence-step
deadline, default 10000).

### Scenarios

`klk-sim scenarios` lists them. Today:

- **social** — owner creates a hosted circle → everyone joins off the
  invite → 2 members post events → half the swarm RSVPs yes → 1 member
  suggests an edit → the event creator applies it. Checks per actor:
  identical member set, identical event list, identical RSVP counts,
  applied title visible everywhere, RSVPs survive the republish (they key
  on `d`), and a final full-view consensus vs the owner.

Add a scenario by dropping a `Scenario` into `tools/sim/src/scenarios.ts`
— it gets `actors` (connected realms), `until(cond, what)` convergence
points, and `check(actor, name, ok, detail)` for the report.

## tmux mode (watch/drive)

```bash
klk-sim tmux --users 3                  # attach automatically
klk-sim tmux --users 3 --spawn-relay    # relay gets its own window too
klk-sim tmux --users 3 --no-attach      # just create, print attach cmd
```

Opens a `klk-sim-<ts>` session: one pane per actor, each running a REPL
bound to a persisted keypair (`<run-dir>/<name>.key` — stable identity
across pane restarts) and a file-backed `localStorage` shim
(`<name>.storage.json` — sealed-circle keys survive too). Panes print
`⟐`-prefixed notices when remote state changes (member joined, new/updated
event, rsvp/suggestion counts), so you can watch others' views update as
you drive one. Without tmux it prints the equivalent per-terminal
commands instead.

REPL commands (`help` in the pane):

```
whoami · circles · use <n|coord>
create-circle "<name>" [sealed] · invite · join <fragment-or-url> · members
create-event "<title>" [--in H] [--suggestable] · events
rsvp <event> <yes|no|maybe> · suggest <event> [--title X] [--in H] [--location X] [--note X]
apply <event>                 # apply newest pending suggestion (creator)
profile "<name>" ["<city>"] · contacts · follow|unfollow <npub|hex>
state · quit
```

`<event>` accepts any unique `d`-tag prefix (`rsvp e-59k yes`).

`klk-sim repl` also runs standalone (one actor, one terminal) — handy for
adding a rogue actor to a running session or driving flows from a script.

## Run-dir layout

```
<run-dir>/
  <actor>.key            # nsec hex — actor identity, 0600
  <actor>.log            # swarm-mode per-actor log lines
  <actor>.storage.json   # repl-mode file-backed localStorage (sealed keys)
  relay/                 # relay bolt data when --spawn-relay
  checks.json            # swarm assertion results
```

## Design notes

- `packages/core` gained `createRealm()` (`src/realm.ts`): the whole client
  is now a factory, and `src/client.ts` re-exports one default realm so
  the app + e2e surface is unchanged. Realms are cheap — a WS connection
  plus its nanostores, nothing else.
- Actors never touch `nostr-tools` directly; if a verb is missing it
  belongs in `@klk/core`, not here.
- Keep swarms gentle on the box: sequential `until()` convergence points,
  one subscription per circle per actor, `--timeout` bounds every wait.
