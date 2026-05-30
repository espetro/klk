import { NDKContext } from '@/lib/context/ndk-context';
import { CircleRecord, aesGcmDecrypt, NDKEvent, NkdKind } from '@klk/infrastructure';
import { useContext, useEffect, useState } from 'react';

export interface CircleRsvp {
  pubkey: string;
  status: string;
}

export function useCircleRsvps(circle: CircleRecord | null, eventId: string | null): CircleRsvp[] {
  const { ndk } = useContext(NDKContext);
  const [rsvps, setRsvps] = useState<CircleRsvp[]>([]);

  useEffect(
    function subscribeToCircleRsvps() {
      if (!ndk || !circle?.id || !eventId) {
        return;
      }
      setRsvps([]);
      const sub = ndk.subscribe(
        { kinds: [NkdKind.AppSpecificData as number], '#g': [circle.id], '#e': [eventId] },
        { closeOnEose: false }
      );
      sub.on('event', async (e: NDKEvent) => {
        try {
          const plain = await aesGcmDecrypt(circle.symKey, e.content);
          const data = JSON.parse(plain) as { status?: string };
          setRsvps((prev) => {
            const exists = prev.find((x) => x.pubkey === e.pubkey);
            return exists
              ? prev
              : [...prev, { pubkey: e.pubkey, status: data.status ?? 'accepted' }];
          });
        } catch {}
      });
      return function stopCircleRsvpsSubscription() {
        sub.stop();
      };
    },
    [ndk, circle?.symKey, circle?.id, eventId]
  );

  return rsvps;
}
