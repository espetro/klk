import type { Actor } from "./actor.ts";
import { viewOf } from "./actor.ts";

export interface Check {
  actor: string;
  name: string;
  ok: boolean;
  detail: string;
}

/** What a scenario gets: the actors, a convergence waiter, and a check sink. */
export interface ScenarioContext {
  actors: Actor[];
  /** Poll `cond` until true or the deadline passes; throws with `what`. */
  until(cond: () => boolean, what: string, timeoutMs?: number): Promise<void>;
  /** Record one pass/fail line for the final report. */
  check(actor: Actor, name: string, ok: boolean, detail?: string): void;
}

export interface Scenario {
  description: string;
  run(ctx: ScenarioContext): Promise<void>;
}

const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const sameEvents = (
  a: { id: string; title: string }[],
  b: { id: string; title: string }[],
): boolean =>
  a.length === b.length && a.every((e, i) => e.id === b[i]!.id && e.title === b[i]!.title);

const sameCounts = (a: Record<string, number>, b: Record<string, number>): boolean => {
  const ka = Object.keys(a).toSorted();
  const kb = Object.keys(b).toSorted();
  return sameSet(ka, kb) && ka.every((k) => a[k] === b[k]);
};

/**
 * social: the full v0 loop at N users — owner opens a circle, everyone
 * joins off the invite, two members post events, half the swarm RSVPs,
 * one member suggests an edit, the event creator applies it. Asserts per
 * actor that the circle membership, event list, and RSVP counts converge
 * to the same view everywhere.
 */
export const social: Scenario = {
  description: "join circle → 2 events → half RSVP → suggestion → apply → per-actor consistency",
  async run(ctx) {
    const { actors, until, check } = ctx;
    const [owner, ...members] = actors;
    if (owner === undefined || members.length === 0) {
      throw new Error("social needs --users ≥ 2");
    }
    const pubkeys = actors.map((a) => a.keypair.pubkey).toSorted();
    const now = Math.floor(Date.now() / 1000);

    // ── 1. circle + joins ────────────────────────────────────────────
    const circle = await owner.realm.createCircle("sim social", "hosted");
    const frag = owner.realm.inviteLinkFor(circle, "http://sim").split("/join")[1]!;
    owner.log(`created circle ${circle.coord} (${circle.name})`);
    await Promise.all(
      members.map(async (m) => {
        await m.realm.joinCircle(frag);
        m.log(`joined ${circle.coord}`);
      }),
    );
    await until(
      () => actors.every((a) => viewOf(a, circle.coord).members.length === actors.length),
      "all actors see the full member set",
    );
    for (const a of actors) {
      const v = viewOf(a, circle.coord);
      check(a, "members", sameSet(v.members, pubkeys), `${v.members.length}/${actors.length}`);
    }

    // ── 2. two events ────────────────────────────────────────────────
    const evAuthors = [members[0]!, members[1] ?? members[0]!];
    const ev1 = await evAuthors[0]!.realm.postEvent({
      coord: circle.coord,
      title: "park picnic",
      starts: now + 3600,
      location: "the park",
      suggestable: true,
    });
    evAuthors[0]!.log(`posted event ${ev1.id} "park picnic"`);
    const ev2 = await evAuthors[1]!.realm.postEvent({
      coord: circle.coord,
      title: "board games",
      starts: now + 7200,
    });
    evAuthors[1]!.log(`posted event ${ev2.id} "board games"`);
    await until(
      () => actors.every((a) => viewOf(a, circle.coord).events.length === 2),
      "all actors see both events",
    );
    for (const a of actors) {
      const v = viewOf(a, circle.coord);
      check(a, "events", v.events.length === 2, `${v.events.length}`);
    }

    // ── 3. half the swarm RSVPs yes to ev1 ──────────────────────────
    const voters = actors.slice(0, Math.ceil(actors.length / 2));
    await Promise.all(
      voters.map(async (a) => {
        await a.realm.setRsvp(circle.coord, ev1.id, "yes");
        a.log(`rsvp yes → ${ev1.id}`);
      }),
    );
    const key = `${circle.coord}:${ev1.id}`;
    await until(
      () => actors.every((a) => (a.realm.$rsvps.get()[key] ?? []).length === voters.length),
      "all actors see every RSVP",
    );
    for (const a of actors) {
      const got = (a.realm.$rsvps.get()[key] ?? []).length;
      check(a, "rsvps", got === voters.length, `${got}/${voters.length}`);
    }

    // ── 4. a member suggests an edit on ev1 ─────────────────────────
    const suggester = members.find((m) => m.keypair.pubkey !== ev1.pubkey) ?? members[0]!;
    const newTitle = "park picnic (by the lake)";
    await suggester.realm.suggestChange({
      coord: circle.coord,
      eventId: ev1.id,
      title: newTitle,
      note: "closer to the water",
    });
    suggester.log(`suggested "${newTitle}" on ${ev1.id}`);
    const creator = actors.find((a) => a.keypair.pubkey === ev1.pubkey)!;
    await until(
      () => (creator.realm.$suggestions.get()[key] ?? []).length >= 1,
      "creator sees the suggestion",
    );

    // ── 5. creator applies ──────────────────────────────────────────
    const suggestion = creator.realm.$suggestions.get()[key]![0]!;
    const stored = creator.realm.$events.get()[circle.coord]!.find((e) => e.id === ev1.id)!;
    await creator.realm.applySuggestion(stored, suggestion);
    creator.log(`applied suggestion → "${newTitle}"`);
    await until(
      () =>
        actors.every(
          (a) =>
            (a.realm.$events.get()[circle.coord] ?? []).find((e) => e.id === ev1.id)?.title ===
            newTitle,
        ),
      "all actors see the applied title",
    );
    for (const a of actors) {
      const ev = (a.realm.$events.get()[circle.coord] ?? []).find((e) => e.id === ev1.id);
      check(a, "applied", ev?.title === newTitle, ev?.title ?? "<missing>");
    }
    // RSVPs key off `d` — they must survive the republish
    for (const a of actors) {
      const got = (a.realm.$rsvps.get()[key] ?? []).length;
      check(a, "rsvps-kept", got === voters.length, `${got}/${voters.length}`);
    }

    // ── 6. full-view consensus ──────────────────────────────────────
    const ref = viewOf(owner, circle.coord);
    for (const a of actors) {
      const v = viewOf(a, circle.coord);
      check(
        a,
        "consensus",
        sameSet(v.members, ref.members) &&
          sameEvents(v.events, ref.events) &&
          sameCounts(v.rsvpCounts, ref.rsvpCounts),
        "view identical to owner's",
      );
    }
  },
};

export const scenarios: Record<string, Scenario> = { social };
