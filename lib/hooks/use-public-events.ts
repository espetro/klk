import { useContext, useEffect, useMemo, useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-mobile";
import { NDKContext } from "@/app/_layout";
import { cityTagValue } from "../nostr/tags";
import { parsePublicEvent } from "../nostr/events";

export function usePublicEvents() {
  const { ndk, city } = useContext(NDKContext);
  const [events, setEvents] = useState<NDKEvent[]>([]);

  useEffect(() => {
    if (!ndk) return;
    setEvents([]);
    const sub = ndk.subscribe(
      { kinds: [31923 as any], "#t": [cityTagValue(city)] },
      { closeOnEose: false }
    );
    sub.on("event", (e: NDKEvent) => {
      setEvents((prev) => {
        const exists = prev.find((x) => x.id === e.id);
        return exists ? prev : [...prev, e];
      });
    });
    return () => sub.stop();
  }, [ndk, city]);

  const parsed = useMemo(
    () =>
      events
        .map(parsePublicEvent)
        .filter((e) => e.start > 0)
        .sort((a, b) => a.start - b.start),
    [events]
  );

  return parsed;
}
