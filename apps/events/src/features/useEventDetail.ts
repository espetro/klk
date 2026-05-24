import { User, rsvpEvent } from '@klk/core';
import { NostrEventRepository } from '@klk/infrastructure';
import { useCallback, useEffect, useState } from 'react';

const repository = new NostrEventRepository();

export interface EventDetailData {
  id: string;
  title: string;
  pubkey: string;
  start: number;
  end?: number;
  location?: string;
  summary?: string;
}

export interface UseEventDetailResult {
  event: EventDetailData | null;
  loading: boolean;
  error: string | null;
  rsvp: () => Promise<void>;
  rsvping: boolean;
  hasRsvpd: boolean;
  rsvpError: string | null;
}

export function useEventDetail(eventId: string, user: User | null): UseEventDetailResult {
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvping, setRsvping] = useState(false);
  const [hasRsvpd, setHasRsvpd] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    repository.findById(eventId).then((result) => {
      if (result.isErr()) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      const found = result.value;
      if (!found) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent({
        id: found.id,
        title: found.title,
        pubkey: found.id,
        start: found.startTime.getTime() / 1000,
        ...(found.location && { location: found.location }),
      });
      setLoading(false);
    });
  }, [eventId]);

  const rsvp = useCallback(async () => {
    if (!user || !eventId || hasRsvpd) return;
    setRsvping(true);
    setRsvpError(null);

    const result = await rsvpEvent(repository, eventId, user, 1);
    if (result.isErr()) {
      setRsvpError(result.error.message);
      setRsvping(false);
      return;
    }

    setHasRsvpd(true);
    setRsvping(false);
  }, [eventId, user, hasRsvpd]);

  return {
    event,
    loading,
    error,
    rsvp,
    rsvping,
    hasRsvpd,
    rsvpError,
  };
}
