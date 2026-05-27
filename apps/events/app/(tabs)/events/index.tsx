import { EventMapScreen } from '@/components';
import { $lastActiveTab, $eventsSearch, useCity, usePublicEvents, useCityCoordinates } from '@/features';
import { useStore } from '@nanostores/react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

interface EventLike {
  title?: string;
  location?: string;
  summary?: string;
}

function filterEvents<T extends EventLike>(events: T[], searchQuery: string) {
  if (!searchQuery.trim()) {
    return events;
  }

  const query = searchQuery.toLowerCase();
  return events.filter((event) => {
    const title = event.title?.toLowerCase() || '';
    const location = event.location?.toLowerCase() || '';
    const summary = event.summary?.toLowerCase() || '';

    return title.includes(query) || location.includes(query) || summary.includes(query);
  });
}

export default function EventsScreen() {
  const city = useCity();
  const coordinates = useCityCoordinates();
  const { events } = usePublicEvents();
  const search = useStore($eventsSearch);

  useFocusEffect(
    useCallback(() => {
      $lastActiveTab.set('events');
      return () => {
        $eventsSearch.set('');
      };
    }, [])
  );

  const filteredEvents = filterEvents(events, search);

  return (
    <EventMapScreen
      events={filteredEvents}
      city={city}
      selectedCity={coordinates}
    />
  );
}
