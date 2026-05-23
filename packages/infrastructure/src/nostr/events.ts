import NDK, { NDKEvent } from "@nostr-dev-kit/ndk-mobile";
import { cityTag } from "./tags";
import { KlkKind } from "./kinds";

export interface PublicEventData {
  title: string;
  start: number;
  end: number;
  location: string;
  summary: string;
  image?: string | undefined;
  city: string;
}

export async function publishPublicEvent(ndk: NDK, data: PublicEventData): Promise<NDKEvent> {
  const event = new NDKEvent(ndk);
  event.kind = KlkKind.PublicEvent;
  event.content = data.summary;
  event.tags = [
    ["d", `${Date.now()}`],
    ["title", data.title],
    ["start", `${data.start}`],
    ["end", `${data.end}`],
    ["location", data.location],
    ["summary", data.summary],
    cityTag(data.city),
  ];
  if (data.image) {
    event.tags.push(["image", data.image]);
  }
  await event.publish();
  return event;
}

export function parsePublicEvent(
  event: NDKEvent,
): PublicEventData & { id: string; pubkey: string } {
  const tag = (name: string) => event.tags.find(([t]) => t === name)?.[1] ?? "";
  const cityTag = event.tags.find(([t, v]) => t === "t" && v?.startsWith("city:"));
  return {
    id: event.id ?? event.tagId(),
    pubkey: event.pubkey,
    title: tag("title"),
    start: Number(tag("start")) || 0,
    end: Number(tag("end")) || 0,
    location: tag("location"),
    summary: tag("summary"),
    image: tag("image") || undefined,
    city: cityTag?.[1]?.replace("city:", "") ?? "",
  };
}
