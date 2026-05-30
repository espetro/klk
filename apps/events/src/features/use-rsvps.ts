import { NDKContext } from '@/lib/context/ndk-context';
import { KlkKind, NDKEvent } from '@klk/infrastructure';
import { useContext, useEffect, useState } from 'react';

export function useRsvps(eventCoordinate: string) {
  const { ndk } = useContext(NDKContext);
  const [rsvps, setRsvps] = useState<NDKEvent[]>([]);

  useEffect(
    function subscribeToRsvps() {
      if (!ndk || !eventCoordinate) {
        return;
      }
      setRsvps([]);
      const sub = ndk.subscribe(
        { kinds: [KlkKind.RSVP as number], '#a': [eventCoordinate] },
        { closeOnEose: false }
      );
      sub.on('event', (e: NDKEvent) => {
        setRsvps((prev) => {
          const exists = prev.find((x) => x.pubkey === e.pubkey);
          return exists ? prev : [...prev, e];
        });
      });
      return function stopRsvpSubscription() {
        sub.stop();
      };
    },
    [ndk, eventCoordinate]
  );

  return rsvps;
}
