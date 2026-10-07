import { circleCoord } from "@klk/proto";
import type { CircleTier } from "@klk/proto";

export interface Circle {
  coord: string; // "31950:<owner>:<slug>"
  slug: string;
  owner: string;
  name: string;
  tier: CircleTier;
  members: string[]; // pubkeys
  inviteSecret: string;
}

export interface CalendarEvent {
  id: string; // `d` tag
  coord: string;
  pubkey: string;
  title: string;
  starts: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  summary?: string;
  eventId: string; // latest revision hash — republished events keep `id`, change this
  image?: string; // NIP-52 image URL
  suggestable?: boolean; // members may propose changes (kind 31926)
}

export interface Suggestion {
  eventId: string; // target event's `d`
  coord: string;
  pubkey: string; // suggester
  title?: string;
  starts?: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  note?: string; // free-text rationale (content)
  suggestedAt: number;
}

export interface RSVP {
  pubkey: string;
  eventId: string;
  coord: string;
  status: "yes" | "no" | "maybe";
}

export function circleFromDef(
  coord: string,
  owner: string,
  content: string,
  inviteSecret: string,
): Circle {
  let name = "";
  let tier: CircleTier = "hosted";
  try {
    const parsed = JSON.parse(content) as { name?: string; tier?: CircleTier };
    name = parsed.name ?? "";
    tier = parsed.tier ?? "hosted";
  } catch {
    name = content;
  }
  return {
    coord,
    slug: coord.split(":")[2] ?? "",
    owner,
    name,
    tier,
    members: [owner],
    inviteSecret,
  };
}

export function coordFor(owner: string, slug: string): string {
  return circleCoord(owner, slug);
}

// Deterministic per-circle accent — hash the coord into a muted set so
// every member sees the same pin/badge color without a protocol field.
const CIRCLE_COLORS = [
  "#1F6C9F", // ocean
  "#346538", // moss
  "#8A4B2A", // clay
  "#5B4E8C", // indigo
  "#A03123", // brick
  "#2E7D74", // teal
  "#96631E", // ochre
  "#6B3A5B", // plum
];

export function circleColor(coord: string): string {
  let h = 5381;
  for (const ch of coord) h = (h * 33) ^ ch.charCodeAt(0);
  return CIRCLE_COLORS[Math.abs(h) % CIRCLE_COLORS.length]!;
}
