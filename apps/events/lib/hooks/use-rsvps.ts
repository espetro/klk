import { useContext, useEffect, useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-mobile";
import { NDKContext } from "@/app/_layout";

export function useRsvps(eventCoordinate: string) {
  const { ndk } = useContext(NDKContext);
  const [rsvps, setRsvps] = useState<NDKEvent[]>([]);

  useEffect(() => {
    if (!ndk || !eventCoordinate) return;
    setRsvps([]);
    const sub = ndk.subscribe(
      { kinds: [31925 as any], "#a": [eventCoordinate] },
      { closeOnEose: false },
    );
    sub.on("event", (e: NDKEvent) => {
      setRsvps((prev) => {
        const exists = prev.find((x) => x.pubkey === e.pubkey);
        return exists ? prev : [...prev, e];
      });
    });
    return () => sub.stop();
  }, [ndk, eventCoordinate]);

  return rsvps;
}
