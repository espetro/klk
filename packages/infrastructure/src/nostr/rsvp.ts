import NDK, { NDKEvent } from '@klk/nostr-mobile';

import { KlkKind } from './kinds';
import { aTag, dTag, eventCoordinate, statusTag } from './tags';

export async function publishRsvp(ndk: NDK, coord: string): Promise<NDKEvent> {
  const rsvp = new NDKEvent(ndk);
  rsvp.kind = KlkKind.RSVP;
  rsvp.content = '';
  rsvp.tags = [
    aTag(coord),
    statusTag('accepted'),
    dTag(`${Date.now()}`),
  ];
  await rsvp.publish();
  return rsvp;
}

export function buildEventCoordinate(event: NDKEvent): string {
  const d = event.tags.find(([t]) => t === 'd')?.[1] ?? '';
  return eventCoordinate(event.kind!, event.pubkey, d);
}
