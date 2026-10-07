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
  eventId: string; // nostr event id for RSVP e-tag
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
