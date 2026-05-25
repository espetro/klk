import NDK, { NDKEvent } from '@klk/nostr-mobile';

export async function publishRsvp(ndk: NDK, eventCoordinate: string): Promise<NDKEvent> {
  const rsvp = new NDKEvent(ndk);
  rsvp.kind = 31925;
  rsvp.content = '';
  rsvp.tags = [
    ['a', eventCoordinate],
    ['status', 'accepted'],
    ['d', `${Date.now()}`],
  ];
  await rsvp.publish();
  return rsvp;
}

export function buildEventCoordinate(event: NDKEvent): string {
  const d = event.tags.find(([t]) => t === 'd')?.[1] ?? '';
  return `${event.kind}:${event.pubkey}:${d}`;
}
