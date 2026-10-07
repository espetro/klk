import type { EventTemplate, NostrEvent } from "nostr-tools";
import { finalizeEvent } from "nostr-tools";
import {
  KIND_AGENT_SCOPE,
  KIND_CALENDAR_EVENT,
  KIND_CIRCLE,
  KIND_CIRCLE_MEMBER,
  KIND_RSVP,
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
  const content = p.sealed ?? p.summary ?? "";
  return { kind: KIND_CALENDAR_EVENT, created_at: now(), content, tags };
}

export interface RSVPParams {
  eventId: string; // id of the calendar event (or its coordinate)
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
