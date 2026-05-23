// Typed NDK event kind constants for Klk
// NDK's NDKKind enum doesn't include NIP-52 custom kinds, so we define our own.

export const KlkKind = {
  /** NIP-52 calendar event (public city event) */
  PublicEvent: 31923,
  /** NIP-52 RSVP */
  RSVP: 31925,
} as const;

export type KlkKindValue = (typeof KlkKind)[keyof typeof KlkKind];
