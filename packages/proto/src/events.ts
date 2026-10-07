import type { EventTemplate, NostrEvent } from "nostr-tools";
import { finalizeEvent } from "nostr-tools";
import {
  KIND_AGENT_SCOPE,
  KIND_CALENDAR_EVENT,
  KIND_CIRCLE,
  KIND_CIRCLE_MEMBER,
  KIND_CONTACTS,
  KIND_PROFILE,
  KIND_RSVP,
  KIND_SUGGESTION,
} from "./kinds.ts";
import type { CircleTier } from "./kinds.ts";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export interface CircleDefParams {
  slug: string; // `d` tag — stable id for the circle
  name: string;
  tier: CircleTier;
  invite: string; // invite secret carried in join links
  sealed?: string; // sealed content blob (tier 'sealed' only)
}

export function buildCircleDef(p: CircleDefParams): EventTemplate {
  const content =
    p.tier === "sealed" && p.sealed !== undefined
      ? p.sealed
      : JSON.stringify({ name: p.name, tier: p.tier });
  return {
    kind: KIND_CIRCLE,
    created_at: now(),
    content,
    tags: [
      ["d", p.slug],
      ["invite", p.invite],
      ["tier", p.tier],
    ],
  };
}

export interface MemberClaimParams {
  coord: string; // "31950:<pk>:<d>"
  invite: string;
}

export function buildMemberClaim(p: MemberClaimParams): EventTemplate {
  return {
    kind: KIND_CIRCLE_MEMBER,
    created_at: now(),
    content: "",
    tags: [
      ["a", p.coord],
      ["invite", p.invite],
    ],
  };
}

export interface CalendarEventParams {
  id: string; // `d` tag — stable event id within the circle
  coord: string;
  title: string;
  starts: number; // unix seconds
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  summary?: string;
  sealed?: string; // sealed content blob for sealed circles
  image?: string; // NIP-52 image URL — pin/card thumbnail
  suggestable?: boolean; // members may post 31926 suggestions
}

export function buildCalendarEvent(p: CalendarEventParams): EventTemplate {
  const tags: string[][] = [
    ["d", p.id],
    ["a", p.coord],
    ["title", p.title],
    ["start", String(p.starts)],
  ];
  if (p.ends !== undefined) tags.push(["end", String(p.ends)]);
  if (p.location !== undefined) tags.push(["location", p.location]);
  if (p.geo !== undefined) tags.push(["g", `${p.geo[0]},${p.geo[1]}`]);
  if (p.image !== undefined) tags.push(["image", p.image]);
  if (p.suggestable === true) tags.push(["suggestable", "1"]);
  const content = p.sealed ?? p.summary ?? "";
  return { kind: KIND_CALENDAR_EVENT, created_at: now(), content, tags };
}

export interface SuggestionParams {
  eventId: string; // `e` tag — target calendar event's `d`
  coord: string; // `a` tag — circle coordinate
  title?: string;
  starts?: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  summary?: string;
  sealed?: string;
}

/** A member-proposed change on a `suggestable` event. Content carries the
 * note; the proposed values ride as tags mirroring the event's own. */
export function buildSuggestion(p: SuggestionParams): EventTemplate {
  const tags: string[][] = [
    ["e", p.eventId],
    ["a", p.coord],
  ];
  if (p.title !== undefined) tags.push(["title", p.title]);
  if (p.starts !== undefined) tags.push(["start", String(p.starts)]);
  if (p.ends !== undefined) tags.push(["end", String(p.ends)]);
  if (p.location !== undefined) tags.push(["location", p.location]);
  if (p.geo !== undefined) tags.push(["g", `${p.geo[0]},${p.geo[1]}`]);
  const content = p.sealed ?? p.summary ?? "";
  return { kind: KIND_SUGGESTION, created_at: now(), content, tags };
}

export interface RSVPParams {
  eventId: string; // `e` tag — target event's `d` (stable across edits)
  coord: string; // circle coordinate the event belongs to
  status: "yes" | "no" | "maybe";
  comment?: string;
}

export function buildRSVP(p: RSVPParams): EventTemplate {
  const tags: string[][] = [
    ["e", p.eventId],
    ["a", p.coord],
    ["status", p.status],
  ];
  return { kind: KIND_RSVP, created_at: now(), content: p.comment ?? "", tags };
}

/** Kind-0 user metadata — the profile card (name, username, city). */
export function buildProfile(meta: Record<string, string | undefined>): EventTemplate {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }
  return { kind: KIND_PROFILE, created_at: now(), content: JSON.stringify(clean), tags: [] };
}

/** Kind-3 contact list — the friend graph. One `p` tag per contact. */
export function buildContacts(pubkeys: string[]): EventTemplate {
  return {
    kind: KIND_CONTACTS,
    created_at: now(),
    content: "",
    tags: pubkeys.map((p) => ["p", p]),
  };
}

export function sign(tpl: EventTemplate, secretKey: Uint8Array): NostrEvent {
  return finalizeEvent(tpl, secretKey);
}

export interface AgentScopeParams {
  id: string; // `d` tag — scope name under the delegator's pubkey
  agent: string; // agent pubkey (hex) — author of delegated writes
  circles: string[]; // circle coords this scope covers (required, explicit)
  caps: string[]; // CAP_READ / CAP_POST_EVENT / CAP_SET_RSVP
  expiration?: number; // unix seconds (NIP-40 style); omit = no expiry
  comment?: string;
}

export function buildAgentScope(p: AgentScopeParams): EventTemplate {
  const tags: string[][] = [
    ["d", p.id],
    ["p", p.agent],
  ];
  for (const c of p.circles) tags.push(["a", c]);
  for (const cap of p.caps) tags.push(["cap", cap]);
  if (p.expiration !== undefined) tags.push(["expiration", String(p.expiration)]);
  return { kind: KIND_AGENT_SCOPE, created_at: now(), content: p.comment ?? "", tags };
}

/** Tag an event template as delegated under a scope coordinate. */
export function withDelegation(tpl: EventTemplate, scopeCoordinate: string): EventTemplate {
  return { ...tpl, tags: [...tpl.tags, ["delegation", scopeCoordinate]] };
}

/** Delegator pubkey behind a `delegation` tag ("34134:<delegator>:<d>"),
 * or undefined when the event isn't delegated. This is the second half of
 * dual attribution: the author is the agent, this is who empowered it. */
export function delegatorOf(tags: string[][]): string | undefined {
  const addr = tags.find((t) => t[0] === "delegation")?.[1];
  if (addr === undefined) return undefined;
  const pk = addr.split(":")[1];
  return pk !== undefined && /^[0-9a-f]{64}$/i.test(pk) ? pk : undefined;
}
