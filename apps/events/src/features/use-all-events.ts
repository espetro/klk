import { NDKContext, NDKContextValue } from '@/lib/context/ndk-context';
import {
  CircleRecord,
  aesGcmDecrypt,
  PublicEventData,
  NDKEvent,
  NkdKind,
} from '@klk/infrastructure';
import { useContext, useEffect, useMemo, useState } from 'react';

import { usePublicEvents } from './use-public-events';

export type AllEvent = PublicEventData & { id: string; pubkey: string };

export interface UseAllEventsResult {
  events: AllEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function getDecryptedCircleEvents(
  ndk: NonNullable<NDKContextValue['ndk']>,
  circle: CircleRecord
): Promise<AllEvent[]> {
  return new Promise((resolve) => {
    const results: AllEvent[] = [];
    const sub = ndk.subscribe(
      { kinds: [NkdKind.AppSpecificData as number], '#g': [circle.id] },
      { closeOnEose: false }
    );
    sub.on('event', async (e: NDKEvent) => {
      try {
        const plain = await aesGcmDecrypt(circle.symKey, e.content);
        const data = JSON.parse(plain) as PublicEventData;
        results.push({ ...data, id: e.id ?? '', pubkey: e.pubkey });
      } catch {}
    });
    sub.on('eose', () => {
      sub.stop();
      resolve(results);
    });
    // Timeout fallback
    setTimeout(() => {
      sub.stop();
      resolve(results);
    }, 5000);
  });
}

export function useAllEvents(): UseAllEventsResult {
  const { ndk } = useContext(NDKContext);
  const {
    events: publicEvents,
    loading: publicLoading,
    error: publicError,
    refresh: publicRefresh,
  } = usePublicEvents();
  const [circleEvents, setCircleEvents] = useState<AllEvent[]>([]);
  const [circleLoading, setCircleLoading] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);

  useEffect(
    function subscribeToCircleEvents() {
      if (!ndk) {
        return;
      }
      setCircleLoading(true);
      setCircleError(null);

      const ndkInstance = ndk;
      let cancelled = false;

      async function loadCircleEvents() {
        try {
          const { getAllCircles } = await import('@klk/infrastructure');
          const circles = await getAllCircles();
          if (cancelled) {
            return;
          }

          const allCircleEvents: AllEvent[] = [];
          for (const circle of circles) {
            // eslint-disable-next-line no-await-in-loop
            const events = await getDecryptedCircleEvents(ndkInstance, circle);
            allCircleEvents.push(...events);
          }
          if (!cancelled) {
            setCircleEvents(allCircleEvents);
            setCircleLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setCircleError(err instanceof Error ? err.message : 'Failed to load circle events');
            setCircleLoading(false);
          }
        }
      }

      loadCircleEvents();

      return () => {
        cancelled = true;
      };
    },
    [ndk]
  );

  const allEvents: AllEvent[] = useMemo(() => {
    const merged = [...publicEvents, ...circleEvents];
    // Sort by start time (newest first), filtering out events without valid start
    return (
      merged
        .filter((e) => e.start > 0)
        .slice()
        // eslint-disable-next-line unicorn/no-array-sort
        .sort((a, b) => b.start - a.start)
    );
  }, [publicEvents, circleEvents]);

  const loading = publicLoading || circleLoading;
  const error = publicError || circleError;

  const refresh = () => {
    publicRefresh();
    setCircleEvents([]);
    setCircleError(null);
  };

  return { events: allEvents, loading, error, refresh };
}
