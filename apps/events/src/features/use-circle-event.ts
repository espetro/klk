import { NDKContext } from '@/lib/context/ndk-context';
import {
  CircleRecord,
  aesGcmDecrypt,
  PublicEventData,
  NDKEvent,
  NkdKind,
} from '@klk/infrastructure';
import { useContext, useEffect, useState } from 'react';

export interface DecryptedCircleEvent extends PublicEventData {
  id: string;
  pubkey: string;
}

export function useCircleEvent(
  circle: CircleRecord | null,
  eventId: string | null
): DecryptedCircleEvent | null {
  const { ndk } = useContext(NDKContext);
  const [event, setEvent] = useState<DecryptedCircleEvent | null>(null);

  useEffect(
    function subscribeToCircleEvent() {
      if (!ndk || !circle?.id || !eventId) {
        return;
      }
      setEvent(null);
      const sub = ndk.subscribe(
        { kinds: [NkdKind.AppSpecificData as number], '#g': [circle.id], ids: [eventId] },
        { closeOnEose: false }
      );
      sub.on('event', async (e: NDKEvent) => {
        try {
          const plain = await aesGcmDecrypt(circle.symKey, e.content);
          const data = JSON.parse(plain) as PublicEventData;
          setEvent({ ...data, id: e.id ?? '', pubkey: e.pubkey });
        } catch {}
      });
      return function stopCircleEventSubscription() {
        sub.stop();
      };
    },
    [ndk, circle?.symKey, circle?.id, eventId]
  );

  return event;
}
