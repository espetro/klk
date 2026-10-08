import { atom, map } from "nanostores";
import {
  KIND_CALENDAR_EVENT,
  KIND_CIRCLE,
  KIND_CIRCLE_MEMBER,
  KIND_CONTACTS,
  KIND_PROFILE,
  KIND_RSVP,
  KIND_SUGGESTION,
  KlkRelay,
  buildAgentScope,
  buildCalendarEvent,
  buildCircleDef,
  buildContacts,
  buildMemberClaim,
  buildProfile,
  buildRSVP,
  buildSuggestion,
  circleCoord,
  circleKeyFromHex,
  circleKeyToHex,
  decodeInvite,
  delegatorOf,
  encodeInvite,
  generateCircleKey,
  generateKeypair,
  newInviteSecret,
  open as cryptoOpen,
  scopeCoord,
  seal as cryptoSeal,
} from "@klk/proto";
import type { CircleKey, Filter, Keypair } from "@klk/proto";
import type { CalendarEvent, Circle, Profile, RSVP, Suggestion } from "./domain.ts";
import { circleFromDef } from "./domain.ts";
import { getLogger } from "./log.ts";
import { storage } from "./storage";
import { usernameFor } from "./username.ts";

const log = getLogger(["klk", "client"]);

// Domain state (nanostores — framework-free, shared by app + agent surface)
export const $identity = atom<Keypair | null>(null);
export const $circles = map<Record<string, Circle>>({});
export const $events = map<Record<string, CalendarEvent[]>>({});
export const $rsvps = map<Record<string, RSVP[]>>({});
export const $suggestions = map<Record<string, Suggestion[]>>({});
export const $profiles = map<Record<string, Profile>>({});
export const $contacts = atom<string[]>([]);
export const $connected = atom(false);

let relay: KlkRelay | null = null;
const unsubscribers: (() => void)[] = [];
const watched = new Set<string>();
// sealed-circle keys: in-memory map backed by sync KV storage so a
// reload keeps decryption. Device-scoped, like the identity wrap key —
// a new device needs a fresh invite link.
const circleKeys = new Map<string, CircleKey>();

function setCircleKey(coord: string, key: CircleKey): void {
  circleKeys.set(coord, key);
  try {
    storage.setItem(`klk.circlekey.${coord}`, circleKeyToHex(key));
  } catch {
    // storage unavailable: memory only
  }
}

function getCircleKey(coord: string): CircleKey | undefined {
  const hit = circleKeys.get(coord);
  if (hit !== undefined) return hit;
  try {
    const hex = storage.getItem(`klk.circlekey.${coord}`);
    if (hex === null) return undefined;
    const key = circleKeyFromHex(hex);
    circleKeys.set(coord, key);
    return key;
  } catch {
    return undefined;
  }
}

export interface ClientOptions {
  relayUrl: string;
}

/**
 * Bring the realm online. `identity === null` is guest mode: an ephemeral
 * in-memory keypair answers the relay's NIP-42 auth so browsing works
 * without signup — $identity stays null and writes gate on it.
 */
export async function connect(identity: Keypair | null, opts: ClientOptions): Promise<void> {
  const guest = identity === null;
  const kp = identity ?? generateKeypair();
  relay = await KlkRelay.connect(opts.relayUrl, kp.secretKey);
  $identity.set(guest ? null : kp);
  $connected.set(true);
  if (!guest) {
    // my profile + contact graph ride the same boot
    void fetchProfiles([kp.pubkey]).catch(() => {});
    void restoreContacts().catch(() => {});
  }
}

export async function disconnect(): Promise<void> {
  for (const unsub of unsubscribers) unsub();
  unsubscribers.length = 0;
  relay?.close();
  relay = null;
  circleKeys.clear();
  watched.clear();
  $identity.set(null);
  $circles.set({});
  $events.set({});
  $rsvps.set({});
  $suggestions.set({});
  $profiles.set({});
  $contacts.set([]);
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
    setCircleKey(coord, key);
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
  const key = getCircleKey(circle.coord);
  return `${baseUrl}/join${encodeInvite({ coord: circle.coord, invite: circle.inviteSecret, ...(key !== undefined ? { key } : {}) })}`;
}

export async function joinCircle(fragment: string): Promise<Circle> {
  const kp = requireIdentity();
  const r = requireRelay();
  const payload = decodeInvite(fragment);

  if (payload.key !== undefined) setCircleKey(payload.coord, payload.key);

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
  }
  // (re)subscribe — idempotent: ingest dedupes, and a live sub for this
  // coord may already exist from a previous watch.
  watchCircle($circles.get()[payload.coord]!);
  return $circles.get()[payload.coord]!;
}

function watchCircle(circle: Circle): void {
  const r = requireRelay();
  const coord = circle.coord;
  if (watched.has(coord)) return;
  watched.add(coord);

  // def + members + calendar events + rsvps — one live subscription
  const filters: Filter[] = [
    { kinds: [KIND_CIRCLE], "#d": [circle.slug], authors: [circle.owner] },
    { kinds: [KIND_CIRCLE_MEMBER, KIND_CALENDAR_EVENT, KIND_SUGGESTION], "#a": [coord] },
    { kinds: [KIND_RSVP], "#a": [coord] },
  ];
  const unsub = r.subscribe(filters, {
    onevent: (ev) => ingestEvent(circle.coord, ev),
    onclose: (reason) => {
      if (reason !== "" && !reason.startsWith("closed by caller")) {
        log.warn(`circle ${circle.slug} closed: {reason}`, { reason });
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
    case KIND_CIRCLE: {
      // circle def update — refresh name/tier
      const c = $circles.get()[coord];
      const inv = ev.tags.find((t) => t[0] === "invite")?.[1] ?? c?.inviteSecret ?? "";
      const def = circleFromDef(coord, ev.pubkey, ev.content, inv);
      if (c !== undefined) def.members = c.members;
      $circles.setKey(coord, def);
      void fetchProfiles([ev.pubkey]).catch(() => {});
      break;
    }
    case KIND_CIRCLE_MEMBER: {
      const c = $circles.get()[coord];
      if (c !== undefined && !c.members.includes(ev.pubkey)) {
        $circles.setKey(coord, { ...c, members: [...c.members, ev.pubkey] });
      }
      void fetchProfiles([ev.pubkey]).catch(() => {});
      break;
    }
    case KIND_CALENDAR_EVENT: {
      const list = ($events.get()[coord] ?? []).filter((e) => e.id !== dTag(ev));
      const cal = toCalendarEvent(ev, coord);
      $events.setKey(
        coord,
        [...list, cal].toSorted((a, b) => a.starts - b.starts),
      );
      break;
    }
    case KIND_RSVP: {
      const eTag = ev.tags.find((t) => t[0] === "e")?.[1] ?? "";
      const key = `${coord}:${eTag}`;
      const list = ($rsvps.get()[key] ?? []).filter((r) => r.pubkey !== ev.pubkey);
      const status = (ev.tags.find((t) => t[0] === "status")?.[1] ?? "maybe") as RSVP["status"];
      const rsvp: RSVP = { pubkey: ev.pubkey, eventId: eTag, coord, status };
      const delegator = delegatorOf(ev.tags);
      if (delegator !== undefined) rsvp.delegatedBy = delegator;
      $rsvps.setKey(key, [...list, rsvp]);
      break;
    }
    case KIND_SUGGESTION: {
      const eTag = ev.tags.find((t) => t[0] === "e")?.[1] ?? "";
      const key = `${coord}:${eTag}`;
      const list = ($suggestions.get()[key] ?? []).filter(
        (s) => !(s.pubkey === ev.pubkey && s.suggestedAt === ev.created_at),
      );
      $suggestions.setKey(key, [...list, toSuggestion(ev, coord)]);
      break;
    }
  }
}

function toSuggestion(
  ev: { pubkey: string; content: string; tags: string[][]; created_at: number },
  coord: string,
): Suggestion {
  const tag = (n: string) => ev.tags.find((t) => t[0] === n)?.[1];
  const g = tag("g");
  const out: Suggestion = {
    eventId: tag("e") ?? "",
    coord,
    pubkey: ev.pubkey,
    suggestedAt: ev.created_at,
  };
  const note = openFor(coord, ev.content) ?? ev.content;
  if (note !== "") out.note = note;
  const t = tag("title");
  if (t !== undefined) out.title = t;
  const st = tag("start");
  if (st !== undefined) out.starts = Number(st);
  const en = tag("end");
  if (en !== undefined) out.ends = Number(en);
  const loc = tag("location");
  if (loc !== undefined) out.location = loc;
  if (g !== undefined) out.geo = g.split(",").map(Number) as [number, number];
  return out;
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
    summary: openFor(coord, ev.content) ?? ev.content,
    eventId: ev.id,
  };
  const delegator = delegatorOf(ev.tags);
  if (delegator !== undefined) out.delegatedBy = delegator;
  const end = tag("end");
  if (end !== undefined) out.ends = Number(end);
  const loc = tag("location");
  if (loc !== undefined) out.location = loc;
  if (geo !== undefined) out.geo = geo;
  const img = tag("image");
  if (img !== undefined) out.image = img;
  if (tag("suggestable") === "1") out.suggestable = true;
  return out;
}

// ---------- discovery ----------

/**
 * Re-discover circles I authored or joined, for a fresh realm (reload,
 * deep link): REQ my own 31950 defs + 31951 claims, then watchCircle
 * each. The relay admits this filter because it's scoped to my pubkey.
 */
export async function discoverCircles(): Promise<void> {
  const kp = requireIdentity();
  const r = requireRelay();
  const events = await r.query([
    { authors: [kp.pubkey], kinds: [KIND_CIRCLE, KIND_CIRCLE_MEMBER] },
  ]);
  for (const ev of events) {
    const coord =
      ev.kind === KIND_CIRCLE
        ? circleCoord(kp.pubkey, dTag(ev))
        : (ev.tags.find((t) => t[0] === "a")?.[1] ?? "");
    if (coord === "") continue;
    const invite = ev.tags.find((t) => t[0] === "invite")?.[1] ?? "";
    if ($circles.get()[coord] === undefined) {
      const circle: Circle =
        ev.kind === KIND_CIRCLE
          ? circleFromDef(coord, kp.pubkey, ev.content, invite)
          : {
              coord,
              slug: coord.split(":")[2] ?? "",
              owner: coord.split(":")[1] ?? "",
              name: "",
              tier: "hosted",
              members: [kp.pubkey],
              inviteSecret: invite,
            };
      $circles.setKey(coord, circle);
    }
    watchCircle($circles.get()[coord]!);
  }
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
  image?: string;
  suggestable?: boolean;
}

export async function postEvent(input: NewEventInput): Promise<CalendarEvent> {
  const r = requireRelay();
  const id = input.id ?? `e-${Math.random().toString(36).slice(2, 10)}`;
  const key = getCircleKey(input.coord);
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
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.suggestable === true ? { suggestable: true } : {}),
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

// ---------- suggestions ----------

export interface SuggestChangeInput {
  coord: string;
  eventId: string; // target event `d`
  title?: string;
  starts?: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  note?: string;
}

/** A member proposes a change on a `suggestable` event (kind 31926). */
export async function suggestChange(input: SuggestChangeInput): Promise<void> {
  const r = requireRelay();
  const key = getCircleKey(input.coord);
  const sealed =
    key !== undefined && input.note !== undefined ? cryptoSeal(key, input.note) : undefined;
  const res = await r.publish(
    buildSuggestion({
      eventId: input.eventId,
      coord: input.coord,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.starts !== undefined ? { starts: input.starts } : {}),
      ...(input.ends !== undefined ? { ends: input.ends } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.geo !== undefined ? { geo: input.geo } : {}),
      ...(sealed !== undefined
        ? { sealed }
        : input.note !== undefined
          ? { summary: input.note }
          : {}),
    }),
  );
  if (!res.ok) throw new Error(`publish suggestion: ${res.reason}`);
}

/** The event creator accepts a suggestion — republish the event with the
 * proposed fields applied (same `d`, replaceable). */
export async function applySuggestion(
  event: CalendarEvent,
  suggestion: Suggestion,
): Promise<CalendarEvent> {
  const updated = await postEvent({
    coord: event.coord,
    id: event.id,
    title: suggestion.title ?? event.title,
    starts: suggestion.starts ?? event.starts,
    ...(suggestion.ends !== undefined || event.ends !== undefined
      ? { ends: suggestion.ends ?? event.ends }
      : {}),
    ...(suggestion.location !== undefined || event.location !== undefined
      ? { location: suggestion.location ?? event.location }
      : {}),
    ...(suggestion.geo !== undefined || event.geo !== undefined
      ? { geo: suggestion.geo ?? event.geo }
      : {}),
    ...(event.summary !== undefined ? { summary: event.summary } : {}),
    ...(event.image !== undefined ? { image: event.image } : {}),
    ...(event.suggestable === true ? { suggestable: true } : {}),
  });
  // resolved — drop it from the pending list
  const key = `${event.coord}:${suggestion.eventId}`;
  $suggestions.setKey(
    key,
    ($suggestions.get()[key] ?? []).filter(
      (s) => !(s.pubkey === suggestion.pubkey && s.suggestedAt === suggestion.suggestedAt),
    ),
  );
  return updated;
}

// ---------- calendar export ----------

const icsDate = (ts: number) =>
  new Date(ts * 1000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Render events as an iCalendar (.ics) feed — client-side, works for
 * sealed circles too since decryption happens in the realm. */
export function toICS(events: CalendarEvent[], name: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//klk//events//EN",
    `X-WR-CALNAME:${icsEscape(name)}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.coord}/${e.id}@klk`);
    lines.push(`DTSTAMP:${icsDate(Math.floor(Date.now() / 1000))}`);
    lines.push(`DTSTART:${icsDate(e.starts)}`);
    if (e.ends !== undefined) lines.push(`DTEND:${icsDate(e.ends)}`);
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    if (e.location !== undefined) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.summary !== undefined && e.summary !== "")
      lines.push(`DESCRIPTION:${icsEscape(e.summary)}`);
    if (e.geo !== undefined) lines.push(`GEO:${e.geo[0]};${e.geo[1]}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ---------- agent delegation ----------

export interface AgentScopeInput {
  scopeId: string; // `d` tag — scopes replace by (delegator, d)
  agent: string; // agent pubkey hex — signs its own delegated writes
  circles: string[]; // circle coords; must all be circles you're in
  caps: string[]; // CAP_READ / CAP_POST_EVENT / CAP_SET_RSVP
  expiration?: number; // unix seconds; omit = no expiry
  comment?: string;
}

/** Publish a kind-34134 scope granting an agent narrow powers. */
export async function grantAgentScope(input: AgentScopeInput): Promise<string> {
  const kp = requireIdentity();
  const r = requireRelay();
  const known = $circles.get();
  for (const coord of input.circles) {
    if (known[coord] === undefined) {
      throw new Error(`can't delegate a circle you're not in: ${coord}`);
    }
  }
  const res = await r.publish(buildAgentScope({ ...input, id: input.scopeId }));
  if (!res.ok) throw new Error(`publish scope: ${res.reason}`);
  return scopeCoord(kp.pubkey, input.scopeId);
}

// ---------- sealed content ----------

export function sealFor(coord: string, plaintext: string): string | null {
  const key = getCircleKey(coord);
  return key === undefined ? null : cryptoSeal(key, plaintext);
}

export function openFor(coord: string, packed: string): string | null {
  const key = getCircleKey(coord);
  if (key === undefined) return null;
  try {
    return cryptoOpen(key, packed);
  } catch {
    return null;
  }
}

// ---------- profiles + contacts ----------

/** Thrown by write paths in guest mode — the UI turns it into a
 * "create identity" prompt instead of an error. */
export class IdentityRequired extends Error {
  constructor() {
    super("create an identity first");
    this.name = "IdentityRequired";
  }
}

export interface ProfileInput {
  name?: string;
  username?: string;
  city?: string;
}

/** Latest kind-0 per author → $profiles. Open read on the relay. */
export async function fetchProfiles(pubkeys: string[]): Promise<void> {
  if (pubkeys.length === 0) return;
  const r = requireRelay();
  const events = await r.query([{ kinds: [KIND_PROFILE], authors: [...new Set(pubkeys)] }]);
  const latest = new Map<string, (typeof events)[number]>();
  for (const ev of events) {
    const cur = latest.get(ev.pubkey);
    if (cur === undefined || ev.created_at > cur.created_at) latest.set(ev.pubkey, ev);
  }
  for (const ev of latest.values()) {
    let meta: Record<string, string> = {};
    try {
      meta = JSON.parse(ev.content) as Record<string, string>;
    } catch {
      continue;
    }
    const p: Profile = { pubkey: ev.pubkey, updatedAt: ev.created_at };
    if (meta.name !== undefined && meta.name !== "") p.name = meta.name;
    if (meta.username !== undefined && meta.username !== "") p.username = meta.username;
    if (meta.city !== undefined && meta.city !== "") p.city = meta.city;
    $profiles.setKey(ev.pubkey, p);
  }
}

/** Publish my profile card. Fields left out keep their published value. */
export async function publishProfile(input: ProfileInput): Promise<void> {
  const kp = requireIdentity();
  const r = requireRelay();
  const existing = $profiles.get()[kp.pubkey];
  const res = await r.publish(
    buildProfile({
      name: input.name ?? existing?.name,
      username: input.username ?? existing?.username ?? usernameFor(kp.pubkey),
      city: input.city ?? existing?.city,
    }),
  );
  if (!res.ok) throw new Error(`publish profile: ${res.reason}`);
  await fetchProfiles([kp.pubkey]);
}

async function restoreContacts(): Promise<void> {
  const kp = requireIdentity();
  const r = requireRelay();
  const events = await r.query([{ kinds: [KIND_CONTACTS], authors: [kp.pubkey], limit: 1 }]);
  const latest = events.toSorted((a, b) => b.created_at - a.created_at)[0];
  if (latest === undefined) return;
  const list = latest.tags.filter((t) => t[0] === "p" && t[1] !== undefined).map((t) => t[1]!);
  $contacts.set(list);
  void fetchProfiles(list).catch(() => {});
}

async function saveContacts(pubkeys: string[]): Promise<void> {
  const r = requireRelay();
  const res = await r.publish(buildContacts([...new Set(pubkeys)]));
  if (!res.ok) throw new Error(`publish contacts: ${res.reason}`);
  $contacts.set([...new Set(pubkeys)]);
}

export async function addContact(pubkey: string): Promise<void> {
  const me = requireIdentity();
  if (pubkey === me.pubkey) throw new Error("that's you");
  await saveContacts([...$contacts.get(), pubkey]);
  void fetchProfiles([pubkey]).catch(() => {});
}

export async function removeContact(pubkey: string): Promise<void> {
  await saveContacts($contacts.get().filter((p) => p !== pubkey));
}

/** Display name for any pubkey: their profile name, then their
 * username, then a deterministic friendly autogen. */
export function displayName(pubkey: string): string {
  const p = $profiles.get()[pubkey];
  return p?.name ?? p?.username ?? usernameFor(pubkey);
}

// ---------- guards ----------

function requireIdentity(): Keypair {
  const kp = $identity.get();
  if (kp === null) throw new IdentityRequired();
  return kp;
}

function requireRelay(): KlkRelay {
  if (relay === null) throw new Error("not connected");
  return relay;
}
