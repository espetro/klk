import { atom, map } from "nanostores";
import {
  KlkRelay,
  buildCalendarEvent,
  buildCircleDef,
  buildMemberClaim,
  buildRSVP,
  circleCoord,
  decodeInvite,
  encodeInvite,
  generateCircleKey,
  newInviteSecret,
  open as cryptoOpen,
  seal as cryptoSeal,
} from "@klk/proto";
import type { CircleKey, Keypair } from "@klk/proto";
import type { CalendarEvent, Circle, RSVP } from "./domain.ts";
import { circleFromDef } from "./domain.ts";

// Domain state (nanostores — framework-free, shared by app + agent surface)
export const $identity = atom<Keypair | null>(null);
export const $circles = map<Record<string, Circle>>({});
export const $events = map<Record<string, CalendarEvent[]>>({});
export const $rsvps = map<Record<string, RSVP[]>>({});
export const $connected = atom(false);

let relay: KlkRelay | null = null;
const unsubscribers: (() => void)[] = [];
const circleKeys = new Map<string, CircleKey>();

export interface ClientOptions {
  relayUrl: string;
}

export async function connect(identity: Keypair, opts: ClientOptions): Promise<void> {
  relay = await KlkRelay.connect(opts.relayUrl, identity.secretKey);
  $identity.set(identity);
  $connected.set(true);
}

export async function disconnect(): Promise<void> {
  for (const unsub of unsubscribers) unsub();
  unsubscribers.length = 0;
  relay?.close();
  relay = null;
  $connected.set(false);
}

// ---------- circles ----------

export async function createCircle(name: string, tier: "hosted" | "sealed"): Promise<Circle> {
  const kp = requireIdentity();
  const r = requireRelay();
  const slug = `c-${Math.random().toString(36).slice(2, 10)}`;
  const invite = newInviteSecret();
  const coord = circleCoord(kp.pubkey, slug);

  let key: CircleKey | undefined;
  let sealedContent: string | undefined;
  if (tier === "sealed") {
    key = generateCircleKey();
    circleKeys.set(coord, key);
    sealedContent = cryptoSeal(key, JSON.stringify({ name, tier }));
  }

  const res = await r.publish(
    buildCircleDef({
      slug,
      name,
      tier,
      invite,
      ...(sealedContent !== undefined ? { sealed: sealedContent } : {}),
    }),
  );
  if (!res.ok) throw new Error(`publish circle: ${res.reason}`);

  // owner claims membership so the ACL learns them
  await r.publish(buildMemberClaim({ coord, invite }));

  const circle = circleFromDef(coord, kp.pubkey, JSON.stringify({ name, tier }), invite);
  $circles.setKey(coord, circle);
  watchCircle(circle);
  return circle;
}

export function inviteLinkFor(circle: Circle, baseUrl: string): string {
  const key = circleKeys.get(circle.coord);
  return `${baseUrl}/join${encodeInvite({ coord: circle.coord, invite: circle.inviteSecret, ...(key !== undefined ? { key } : {}) })}`;
}

export async function joinCircle(fragment: string): Promise<Circle> {
  const kp = requireIdentity();
  const r = requireRelay();
  const payload = decodeInvite(fragment);

  if (payload.key !== undefined) circleKeys.set(payload.coord, payload.key);

  const res = await r.publish(buildMemberClaim({ coord: payload.coord, invite: payload.invite }));
  if (!res.ok) throw new Error(`join circle: ${res.reason}`);

  // bootstrap the circle into local state; def arrives via subscription
  const existing = $circles.get()[payload.coord];
  if (existing === undefined) {
    const circle: Circle = {
      coord: payload.coord,
      slug: payload.coord.split(":")[2] ?? "",
      owner: payload.coord.split(":")[1] ?? "",
      name: "",
      tier: "hosted",
      members: [kp.pubkey],
      inviteSecret: payload.invite,
    };
    $circles.setKey(payload.coord, circle);
    watchCircle(circle);
  }
  return $circles.get()[payload.coord]!;
}

function watchCircle(circle: Circle): void {
  const r = requireRelay();
  const coord = circle.coord;

  // def + members + calendar events + rsvps — one live subscription
  const filters = [
    { kinds: [31950], "#d": [circle.slug], authors: [circle.owner] },
    { kinds: [31951, 31923], "#a": [coord] },
    { kinds: [31925], "#a": [coord] },
  ];
  const unsub = r.subscribe(filters as never, {
    onevent: (ev) => ingestEvent(circle.coord, ev),
    onclose: (reason) => {
      if (reason.startsWith("restricted") || reason.startsWith("auth-required")) {
        console.warn(`circle ${circle.slug} closed: ${reason}`);
      }
    },
  });
  unsubscribers.push(unsub);
}

function ingestEvent(
  coord: string,
  ev: {
    kind: number;
    pubkey: string;
    content: string;
    tags: string[][];
    id: string;
    created_at: number;
  },
): void {
  switch (ev.kind) {
    case 31950: {
      // circle def update — refresh name/tier
      const c = $circles.get()[coord];
      const inv = ev.tags.find((t) => t[0] === "invite")?.[1] ?? c?.inviteSecret ?? "";
      const def = circleFromDef(coord, ev.pubkey, ev.content, inv);
      if (c !== undefined) def.members = c.members;
      $circles.setKey(coord, def);
      break;
    }
    case 31951: {
      const c = $circles.get()[coord];
      if (c !== undefined && !c.members.includes(ev.pubkey)) {
        $circles.setKey(coord, { ...c, members: [...c.members, ev.pubkey] });
      }
      break;
    }
    case 31923: {
      const list = ($events.get()[coord] ?? []).filter((e) => e.id !== dTag(ev));
      const cal = toCalendarEvent(ev, coord);
      $events.setKey(
        coord,
        [...list, cal].sort((a, b) => a.starts - b.starts),
      );
      break;
    }
    case 31925: {
      const eTag = ev.tags.find((t) => t[0] === "e")?.[1] ?? "";
      const key = `${coord}:${eTag}`;
      const list = ($rsvps.get()[key] ?? []).filter((r) => r.pubkey !== ev.pubkey);
      const status = (ev.tags.find((t) => t[0] === "status")?.[1] ?? "maybe") as RSVP["status"];
      $rsvps.setKey(key, [...list, { pubkey: ev.pubkey, eventId: eTag, coord, status }]);
      break;
    }
  }
}

function dTag(ev: { tags: string[][] }): string {
  return ev.tags.find((t) => t[0] === "d")?.[1] ?? "";
}

function toCalendarEvent(
  ev: { id: string; pubkey: string; content: string; tags: string[][] },
  coord: string,
): CalendarEvent {
  const tag = (n: string) => ev.tags.find((t) => t[0] === n)?.[1];
  const g = tag("g");
  const geo = g !== undefined ? (g.split(",").map(Number) as [number, number]) : undefined;
  const out: CalendarEvent = {
    id: dTag(ev),
    coord,
    pubkey: ev.pubkey,
    title: tag("title") ?? "",
    starts: Number(tag("start") ?? 0),
    summary: ev.content,
    eventId: ev.id,
  };
  const end = tag("end");
  if (end !== undefined) out.ends = Number(end);
  const loc = tag("location");
  if (loc !== undefined) out.location = loc;
  if (geo !== undefined) out.geo = geo;
  return out;
}

// ---------- events ----------

export interface NewEventInput {
  coord: string;
  id?: string;
  title: string;
  starts: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  summary?: string;
}

export async function postEvent(input: NewEventInput): Promise<CalendarEvent> {
  const r = requireRelay();
  const id = input.id ?? `e-${Math.random().toString(36).slice(2, 10)}`;
  const key = circleKeys.get(input.coord);
  const sealed =
    key !== undefined && input.summary !== undefined ? cryptoSeal(key, input.summary) : undefined;

  const res = await r.publish(
    buildCalendarEvent({
      id,
      coord: input.coord,
      title: input.title,
      starts: input.starts,
      ...(input.ends !== undefined ? { ends: input.ends } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.geo !== undefined ? { geo: input.geo } : {}),
      ...(sealed !== undefined
        ? { sealed }
        : input.summary !== undefined
          ? { summary: input.summary }
          : {}),
    }),
  );
  if (!res.ok) throw new Error(`publish event: ${res.reason}`);

  const cal = toCalendarEvent(
    {
      id,
      pubkey: requireIdentity().pubkey,
      content: input.summary ?? "",
      tags: [
        ["d", id],
        ["title", input.title],
        ["start", String(input.starts)],
        ...(input.ends !== undefined ? [["end", String(input.ends)]] : []),
        ...(input.location !== undefined ? [["location", input.location]] : []),
      ],
    },
    input.coord,
  );
  return cal;
}

export async function setRsvp(
  coord: string,
  eventId: string,
  status: RSVP["status"],
): Promise<void> {
  const r = requireRelay();
  const res = await r.publish(buildRSVP({ eventId, coord, status }));
  if (!res.ok) throw new Error(`publish rsvp: ${res.reason}`);
}

// ---------- sealed content ----------

export function sealFor(coord: string, plaintext: string): string | null {
  const key = circleKeys.get(coord);
  return key === undefined ? null : cryptoSeal(key, plaintext);
}

export function openFor(coord: string, packed: string): string | null {
  const key = circleKeys.get(coord);
  if (key === undefined) return null;
  try {
    return cryptoOpen(key, packed);
  } catch {
    return null;
  }
}

// ---------- guards ----------

function requireIdentity(): Keypair {
  const kp = $identity.get();
  if (kp === null) throw new Error("not signed in");
  return kp;
}

function requireRelay(): KlkRelay {
  if (relay === null) throw new Error("not connected");
  return relay;
}
