import { EventMapScreen, GuestBarrier, HostedFab } from '@/components';
import {
  $lastActiveTab,
  $eventsSearch,
  useCity,
  useAllEvents,
  useCityCoordinates,
} from '@/features';
import { AllEvent } from '@/features/use-all-events';
import { NDKContext } from '@/lib/context/ndk-context';
import { useStore } from '@nanostores/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';

function filterEvents(events: AllEvent[], searchQuery: string): AllEvent[] {
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
  const [showBarrier, setShowBarrier] = useState(false);

  const router = useRouter();
  const search = useStore($eventsSearch);

  const city = useCity();
  const { signer } = useContext(NDKContext);
  const coordinates = useCityCoordinates();
  const { events, loading, error, refresh } = useAllEvents();

  const filteredEvents = filterEvents(events, search);

  const handleFabPress = useCallback(() => {
    if (!signer) {
      setShowBarrier(true);
      return;
    }
    router.push('/circle/new');
  }, [signer, router]);

  useFocusEffect(
    useCallback(() => {
      $lastActiveTab.set('events');
      return () => {
        $eventsSearch.set('');
      };
    }, [])
  );

  return (
    <View className='flex-1'>
      <EventMapScreen
        events={filteredEvents}
        city={city}
        selectedCity={coordinates}
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {process.env.EXPO_OS !== 'ios' && <HostedFab onPress={handleFabPress} />}
        <GuestBarrier
          visible={showBarrier}
          title='Create an event'
          description='You need an identity to create an event and invite others.'
          ctaLabel='Create Identity'
          onGetStarted={() => {
            setShowBarrier(false);
            router.push('/identity');
          }}
          onDismiss={() => setShowBarrier(false)}
        />
      </EventMapScreen>
    </View>
  );
}
