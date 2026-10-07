import type { EventTemplate, NostrEvent } from "nostr-tools";
import { finalizeEvent } from "nostr-tools";
import { tagger, TAG_DELEGATION } from "./taxonomy.ts";
import type { CircleTier } from "./taxonomy.ts";
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
  const t = tagger("circle");
  const content =
    p.tier === "sealed" && p.sealed !== undefined
      ? p.sealed
      : JSON.stringify({ name: p.name, tier: p.tier });
  return {
    kind: KIND_CIRCLE,
    created_at: now(),
    content,
    tags: [t("d", p.slug), t("invite", p.invite), t("tier", p.tier)],
  };
}

export interface MemberClaimParams {
  coord: string; // "31950:<pk>:<d>"
  invite: string;
}

export function buildMemberClaim(p: MemberClaimParams): EventTemplate {
  const t = tagger("circleMember");
  return {
    kind: KIND_CIRCLE_MEMBER,
    created_at: now(),
    content: "",
    tags: [t("a", p.coord), t("invite", p.invite)],
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
  const t = tagger("calendarEvent");
  const tags: string[][] = [
    t("d", p.id),
    t("a", p.coord),
    t("title", p.title),
    t("start", String(p.starts)),
  ];
  if (p.ends !== undefined) tags.push(t("end", String(p.ends)));
  if (p.location !== undefined) tags.push(t("location", p.location));
  if (p.geo !== undefined) tags.push(t("g", `${p.geo[0]},${p.geo[1]}`));
  if (p.image !== undefined) tags.push(t("image", p.image));
  if (p.suggestable === true) tags.push(t("suggestable", "1"));
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
  const t = tagger("suggestion");
  const tags: string[][] = [t("e", p.eventId), t("a", p.coord)];
  if (p.title !== undefined) tags.push(t("title", p.title));
  if (p.starts !== undefined) tags.push(t("start", String(p.starts)));
  if (p.ends !== undefined) tags.push(t("end", String(p.ends)));
  if (p.location !== undefined) tags.push(t("location", p.location));
  if (p.geo !== undefined) tags.push(t("g", `${p.geo[0]},${p.geo[1]}`));
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
  const t = tagger("rsvp");
  const tags: string[][] = [t("e", p.eventId), t("a", p.coord), t("status", p.status)];
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
  const t = tagger("contacts");
  return {
    kind: KIND_CONTACTS,
    created_at: now(),
    content: "",
    tags: pubkeys.map((p) => t("p", p)),
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
  const t = tagger("agentScope");
  const tags: string[][] = [t("d", p.id), t("p", p.agent)];
  for (const c of p.circles) tags.push(t("a", c));
  for (const cap of p.caps) tags.push(t("cap", cap));
  if (p.expiration !== undefined) tags.push(t("expiration", String(p.expiration)));
  return { kind: KIND_AGENT_SCOPE, created_at: now(), content: p.comment ?? "", tags };
}

/** Tag an event template as delegated under a scope coordinate. Valid on
 * kinds with a `delegationCap` (see TAXONOMY). */
export function withDelegation(tpl: EventTemplate, scopeCoordinate: string): EventTemplate {
  return { ...tpl, tags: [...tpl.tags, [TAG_DELEGATION, scopeCoordinate]] };
}
