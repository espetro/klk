import { NDKContext } from '@/lib/context/ndk-context';
import { CircleRecord, aesGcmDecrypt, PublicEventData, NDKEvent } from '@klk/infrastructure';
import { useContext, useEffect, useState } from 'react';

export interface DecryptedCircleEvent extends PublicEventData {
  id: string;
  pubkey: string;
}

export function useCircleEvents(circle: CircleRecord | null) {
  const { ndk } = useContext(NDKContext);
  const [events, setEvents] = useState<DecryptedCircleEvent[]>([]);

  useEffect(
    function subscribeToCircleEvents() {
      if (!ndk || !circle) return;
      setEvents([]);
      const sub = ndk.subscribe(
        { kinds: [30078 as any], '#g': [circle.id] },
        { closeOnEose: false }
      );
      sub.on('event', async (e: NDKEvent) => {
        try {
          const plain = await aesGcmDecrypt(circle.symKey, e.content);
          const data = JSON.parse(plain) as PublicEventData;
          setEvents((prev) => {
            const exists = prev.find((x) => x.id === e.id);
            return exists ? prev : [...prev, { ...data, id: e.id ?? '', pubkey: e.pubkey }];
          });
        } catch {}
      });
      return function stopCircleSubscription() {
        sub.stop();
      };
    },
    [ndk, circle?.id]
  );

  return events;
}
