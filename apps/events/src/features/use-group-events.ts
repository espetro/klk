import { NDKContext } from '@/lib/context/ndk-context';
import { GroupRecord, aesGcmDecrypt, PublicEventData } from '@klk/infrastructure';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { useContext, useEffect, useState } from 'react';

export interface DecryptedGroupEvent extends PublicEventData {
  id: string;
  pubkey: string;
}

export function useGroupEvents(group: GroupRecord | null) {
  const { ndk } = useContext(NDKContext);
  const [events, setEvents] = useState<DecryptedGroupEvent[]>([]);

  useEffect(() => {
    if (!ndk || !group) return;
    setEvents([]);
    const sub = ndk.subscribe({ kinds: [30078 as any], '#g': [group.id] }, { closeOnEose: false });
    sub.on('event', async (e: NDKEvent) => {
      try {
        const plain = await aesGcmDecrypt(group.symKey, e.content);
        const data = JSON.parse(plain) as PublicEventData;
        setEvents((prev) => {
          const exists = prev.find((x) => x.id === e.id);
          return exists ? prev : [...prev, { ...data, id: e.id ?? '', pubkey: e.pubkey }];
        });
      } catch {}
    });
    return () => sub.stop();
  }, [ndk, group?.id]);

  return events;
}
