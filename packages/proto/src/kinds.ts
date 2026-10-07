import { CAPABILITIES, TAXONOMY } from "./taxonomy.ts";

// klk's event kinds — declared in ./taxonomy.ts (the contract of record);
// the Go mirror lives in apps/relay/internal/policy/policy.go.
export const KIND_PROFILE = TAXONOMY.profile.kind; // user metadata: name, username, city
export const KIND_CONTACTS = TAXONOMY.contacts.kind; // contact list (p tags) — the friend graph
export const KIND_CALENDAR_EVENT = TAXONOMY.calendarEvent.kind;
export const KIND_RSVP = TAXONOMY.rsvp.kind;
export const KIND_SUGGESTION = TAXONOMY.suggestion.kind; // member-proposed change to an event
export const KIND_CIRCLE = TAXONOMY.circle.kind;
export const KIND_CIRCLE_MEMBER = TAXONOMY.circleMember.kind;
// addressable range (30000-39999) — 24134 would be ephemeral per NIP-16
export const KIND_AGENT_SCOPE = TAXONOMY.agentScope.kind;

export type { CircleTier } from "./taxonomy.ts";

// suggested fields a member may propose when an event is `suggestable`
export type SuggestionField = "title" | "starts" | "ends" | "location" | "geo" | "summary";

// capabilities a delegation scope can grant (declared in ./taxonomy.ts)
export const CAP_READ = CAPABILITIES.read.cap;
export const CAP_POST_EVENT = CAPABILITIES.postEvent.cap;
export const CAP_SET_RSVP = CAPABILITIES.setRsvp.cap;

/** "34134:<delegator>:<d>" — coordinate of an agent scope. */
export function scopeCoord(delegator: string, d: string): string {
  return `${KIND_AGENT_SCOPE}:${delegator}:${d}`;
}

/** "31950:<pubkey>:<d>" — the addressable coordinate of a circle. */
export function circleCoord(ownerPubkey: string, d: string): string {
  return `${KIND_CIRCLE}:${ownerPubkey}:${d}`;
}
