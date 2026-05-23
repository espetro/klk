import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-mobile";
import { NDKContext } from "@/app/_layout";
import { useCity } from "@/features";
import {
  cityTagValue,
  parsePublicEvent,
  PublicEventData,
  KlkKind,
  getSecure,
  setSecure,
} from "@klk/infrastructure";

export interface PublicEvent extends PublicEventData {
  id: string;
  pubkey: string;
}

export interface UsePublicEventsResult {
  events: PublicEvent[];
  loading: boolean;
  error: string | null;
  retry: () => void;
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

export function usePublicEvents(): UsePublicEventsResult {
  const { ndk } = useContext(NDKContext);
  const city = useCity();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_attemptCount, setAttemptCount] = useState(0);

  const startSubscription = useCallback(async () => {
    if (!ndk || !city) return;
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
          { kinds: [KlkKind.PublicEvent as number], "#t": [cityTagValue(city)] },
          { closeOnEose: false },
        );
        sub.on("event", (e: NDKEvent) => {
          setEvents((prev) => {
            const exists = prev.find((x) => x.id === e.id);
            return exists ? prev : [...prev, e];
          });
        });
        sub.on("eose", () => {
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

    setError(lastError?.message ?? "Failed to load events after retries");
    setLoading(false);
  }, [ndk, city]);

  useEffect(() => {
    const run = async () => {
      await startSubscription();
    };
    run();
  }, [ndk, city, startSubscription]);

  const parsed: PublicEvent[] = useMemo(() => {
    return events
      .map(parsePublicEvent)
      .filter((e) => e.start > 0)
      .toSorted((a, b) => a.start - b.start);
  }, [events]);

  useEffect(() => {
    if (parsed.length > 0) {
      saveCachedEvents(city, parsed);
    }
  }, [parsed, city]);

  const retry = useCallback(() => {
    setAttemptCount(0);
    startSubscription();
  }, [startSubscription]);

  return { events: parsed, loading, error, retry };
}
