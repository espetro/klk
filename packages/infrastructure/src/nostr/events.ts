import NDK, { NDKEvent } from '@klk/nostr-mobile';

import { KlkKind } from './kinds';
import { cityTag, dTag, titleTag, startTag, endTag, locationTag, summaryTag, imageTag, parseCitySlug } from './tags';

export interface PublicEventData {
  title: string;
  start: number;
  end: number;
  location: string | undefined;
  summary: string | undefined;
  image?: string | undefined;
  city: string;
}

export async function publishPublicEvent(ndk: NDK, data: PublicEventData): Promise<NDKEvent> {
  const event = new NDKEvent(ndk);
  event.kind = KlkKind.PublicEvent;
  const summary: string = data.summary ?? '';
  event.content = summary;
  event.tags = [
    dTag(`${Date.now()}`),
    titleTag(data.title),
    startTag(data.start),
    endTag(data.end),
    locationTag(data.location ?? ''),
    summaryTag(summary),
    cityTag(data.city),
  ];
  if (data.image) {
    event.tags.push(imageTag(data.image));
  }
  await event.publish();
  return event;
}

export function parsePublicEvent(
  event: NDKEvent
): PublicEventData & { id: string; pubkey: string } {
  const tags = event.tags ?? [];
  const tag = (name: string) => tags.find(([t]) => t === name)?.[1] ?? '';
  return {
    id: event.id ?? event.tagId(),
    pubkey: event.pubkey,
    title: tag('title'),
    start: Number(tag('start')) || 0,
    end: Number(tag('end')) || 0,
    location: tag('location'),
    summary: tag('summary'),
    image: tag('image') || undefined,
    city: parseCitySlug(tags),
  };
}
