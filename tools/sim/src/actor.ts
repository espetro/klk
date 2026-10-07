import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRealm, identityFromSecretHex, secretKeyToHex } from "@klk/core";
import type { Circle, Realm } from "@klk/core";
import { generateKeypair, npubEncode } from "@klk/proto";
import type { Keypair } from "@klk/proto";

/** One simulated user: a keypair + its own realm (own WS connection). */
export interface Actor {
  name: string;
  keypair: Keypair;
  realm: Realm;
  /** Append one line to this actor's per-actor log (stdout + run-dir file). */
  log(line: string): void;
}

const NAME_POOL = [
  "ann",
  "bob",
  "cid",
  "dan",
  "eve",
  "fin",
  "gus",
  "hal",
  "ivy",
  "jim",
  "kim",
  "leo",
  "mia",
  "ned",
  "ora",
  "pam",
];

export function actorName(i: number): string {
  return (
    NAME_POOL[i % NAME_POOL.length] +
    (i >= NAME_POOL.length ? `-${Math.floor(i / NAME_POOL.length)}` : "")
  );
}

/**
 * Identity persistence: one hex secret per actor in the run dir. tmux
 * panes (separate processes) reload the same key on restart, so an
 * actor's pubkey is stable across a session.
 */
export function loadOrCreateKeypair(runDir: string, name: string): Keypair {
  mkdirSync(runDir, { recursive: true });
  const file = join(runDir, `${name}.key`);
  if (existsSync(file)) return identityFromSecretHex(readFileSync(file, "utf8").trim());
  const kp = generateKeypair();
  writeFileSync(file, secretKeyToHex(kp.secretKey) + "\n", { mode: 0o600 });
  return kp;
}

/**
 * File-backed `localStorage` for Node — the same seam core uses for
 * sealed-circle keys in the browser. One JSON file per actor dir; swarm
 * actors share a process and should NOT install this (each realm keeps
 * its own in-memory map already). Repl panes install it so sealed keys
 * survive a pane restart.
 */
export function installFileStorage(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
  } catch {
    // first run or corrupt file — start empty
  }
  const flush = () => writeFileSync(file, JSON.stringify(data));
  const shim = {
    getItem: (k: string): string | null => data[k] ?? null,
    setItem: (k: string, v: string): void => {
      data[k] = String(v);
      flush();
    },
    removeItem: (k: string): void => {
      delete data[k];
      flush();
    },
    clear: (): void => {
      data = {};
      flush();
    },
    key: (i: number): string | null => Object.keys(data)[i] ?? null,
    get length(): number {
      return Object.keys(data).length;
    },
  };
  try {
    Object.defineProperty(globalThis, "localStorage", { value: shim, configurable: true });
  } catch {
    // Node may already expose localStorage — core tolerates either.
  }
}

/** Wire an actor: load identity, create its realm, connect, log to file. */
export async function spawnActor(name: string, relayUrl: string, runDir: string): Promise<Actor> {
  const keypair = loadOrCreateKeypair(runDir, name);
  const realm = createRealm();
  const logFile = join(runDir, `${name}.log`);
  const actor: Actor = {
    name,
    keypair,
    realm,
    log: (line) => {
      const stamped = `${new Date().toISOString().slice(11, 19)} ${line}`;
      appendFileSync(logFile, stamped + "\n");
      console.log(`[${name}] ${line}`);
    },
  };
  await realm.connect(keypair, { relayUrl });
  actor.log(`connected ${npubEncode(keypair.pubkey).slice(0, 16)}… → ${relayUrl}`);
  return actor;
}

/** The actor's view of a circle, normalized for cross-actor comparison. */
export interface ActorView {
  members: string[];
  events: { id: string; title: string }[];
  rsvpCounts: Record<string, number>;
  suggestionCount: number;
}

export function viewOf(actor: Actor, coord: string): ActorView {
  const circle = actor.realm.$circles.get()[coord];
  const events = actor.realm.$events.get()[coord] ?? [];
  const rsvpCounts: Record<string, number> = {};
  let suggestionCount = 0;
  for (const e of events) {
    rsvpCounts[e.id] = (actor.realm.$rsvps.get()[`${coord}:${e.id}`] ?? []).length;
    suggestionCount += (actor.realm.$suggestions.get()[`${coord}:${e.id}`] ?? []).length;
  }
  return {
    members: (circle?.members ?? []).toSorted(),
    events: events
      .map((e) => ({ id: e.id, title: e.title }))
      .toSorted((a, b) => (a.id < b.id ? -1 : 1)),
    rsvpCounts,
    suggestionCount,
  };
}

export function circleOrThrow(actor: Actor, coord: string): Circle {
  const c = actor.realm.$circles.get()[coord];
  if (c === undefined) throw new Error(`${actor.name} doesn't know circle ${coord}`);
  return c;
}
