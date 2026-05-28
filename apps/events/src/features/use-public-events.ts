import { NDKContext } from '@/lib/context/ndk-context';
import {
  cityTagValue,
  parsePublicEvent,
  PublicEventData,
  KlkKind,
  getSecure,
  setSecure,
  NDKEvent,
} from '@klk/infrastructure';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { FIXTURE_EVENTS } from '../fixtures';
import { useCity } from './cityStore';

export interface PublicEvent extends PublicEventData {
  id: string;
  pubkey: string;
}

export interface UsePublicEventsResult {
  events: PublicEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadCachedEvents(city: string): Promise<PublicEvent[]> {
  try {
    const raw = await getSecure(`events_cache_${city}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveCachedEvents(city: string, events: PublicEvent[]): Promise<void> {
  try {
    await setSecure(`events_cache_${city}`, JSON.stringify(events));
  } catch {}
}

const USE_FIXTURES = __DEV__ && process.env.EXPO_USE_FIXTURES === '1';
const noop = () => {};

export function usePublicEvents(): UsePublicEventsResult {
  const { ndk } = useContext(NDKContext);
  const city = useCity();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_attemptCount, setAttemptCount] = useState(0);

  const startSubscription = useCallback(
    async function startSubscription() {
      if (USE_FIXTURES || !ndk || !city) {
        return;
      }
      setLoading(true);
      setError(null);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const cached = await loadCachedEvents(city);
          if (cached.length > 0) {
            setEvents([]);
            cached.forEach((e) => {
              setEvents((prev) => {
                const exists = prev.find((x) => x.id === e.id);
                return exists ? prev : [...prev, e as unknown as NDKEvent];
              });
            });
          }

          const sub = ndk.subscribe(
            { kinds: [KlkKind.PublicEvent as number], '#t': [cityTagValue(city)] },
            { closeOnEose: false }
          );
          sub.on('event', (e: NDKEvent) => {
            setEvents((prev) => {
              const exists = prev.find((x) => x.id === e.id);
              return exists ? prev : [...prev, e];
            });
          });
          sub.on('eose', () => {
            setLoading(false);
          });
          setAttemptCount(attempt);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES) {
            // eslint-disable-next-line no-void
            void sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          }
        }
      }

      setError(lastError?.message ?? 'Failed to load events after retries');
      setLoading(false);
    },
    [ndk, city]
  );

  useEffect(
    function subscribeToPublicEvents() {
      const run = async function executeSubscription() {
        await startSubscription();
      };
      run();
    },
    [ndk, city, startSubscription]
  );

  const parsed: PublicEvent[] = useMemo(() => {
    if (USE_FIXTURES) return FIXTURE_EVENTS;
    return (
      events
        .map(parsePublicEvent)
        .filter((e) => e.start > 0)
        .slice()
        // eslint-disable-next-line unicorn/no-array-sort
        .sort((a, b) => a.start - b.start)
    );
  }, [events]);

  useEffect(
    function saveCachedEventsEffect() {
      if (!USE_FIXTURES && parsed.length > 0) {
        saveCachedEvents(city, parsed);
      }
    },
    [parsed, city]
  );

  const refresh = useCallback(
    function refreshSubscription() {
      if (USE_FIXTURES) return;
      setAttemptCount(0);
      startSubscription();
    },
    [startSubscription]
  );

  if (USE_FIXTURES) {
    return { events: FIXTURE_EVENTS, loading: false, error: null, refresh: noop };
  }

  return { events: parsed, loading, error, refresh };
}
