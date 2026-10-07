/** klk's event kinds on the Nostr contract (mirrors apps/relay policy). */
export const KIND_CALENDAR_EVENT = 31923;
export const KIND_RSVP = 31925;
export const KIND_CIRCLE = 31950;
export const KIND_CIRCLE_MEMBER = 31951;
export const KIND_AGENT_SCOPE = 24134;

export type CircleTier = "hosted" | "sealed";

/** "31950:<pubkey>:<d>" — the addressable coordinate of a circle. */
export function circleCoord(ownerPubkey: string, d: string): string {
  return `${KIND_CIRCLE}:${ownerPubkey}:${d}`;
}
