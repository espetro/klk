/** klk's event kinds on the Nostr contract (mirrors apps/relay policy). */
export const KIND_CALENDAR_EVENT = 31923;
export const KIND_RSVP = 31925;
export const KIND_SUGGESTION = 31926; // member-proposed change to an event
export const KIND_CIRCLE = 31950;
export const KIND_CIRCLE_MEMBER = 31951;
// addressable range (30000-39999) — 24134 would be ephemeral per NIP-16
export const KIND_AGENT_SCOPE = 34134;

// suggested fields a member may propose when an event is `suggestable`
export type SuggestionField = "title" | "starts" | "ends" | "location" | "geo" | "summary";

// capabilities a delegation scope can grant (mirrors relay policy)
export const CAP_READ = "read";
export const CAP_POST_EVENT = "postEvent";
export const CAP_SET_RSVP = "setRsvp";

/** "34134:<delegator>:<d>" — coordinate of an agent scope. */
export function scopeCoord(delegator: string, d: string): string {
  return `${KIND_AGENT_SCOPE}:${delegator}:${d}`;
}

export type CircleTier = "hosted" | "sealed";

/** "31950:<pubkey>:<d>" — the addressable coordinate of a circle. */
export function circleCoord(ownerPubkey: string, d: string): string {
  return `${KIND_CIRCLE}:${ownerPubkey}:${d}`;
}
