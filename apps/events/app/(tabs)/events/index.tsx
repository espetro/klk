import { EventCard } from '@/components';
import { $lastActiveTab, $eventsSearch, useCity, usePublicEvents } from '@/features';
import { useStore } from '@nanostores/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

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
  const router = useRouter();
  const city = useCity();
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
    <View className='flex-1 bg-gray-50 pb-2'>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: process.env.EXPO_OS !== 'ios' ? 80 : 16,
        }}
        ListEmptyComponent={
          <View className='items-center mt-20'>
            <Text className='text-gray-400 text-base'>
              {search ? `No events found for "${search}"` : `No upcoming events in ${city}`}
            </Text>
            {!search && (
              <Text className='text-gray-400 text-sm mt-1'>Be the first to create one!</Text>
            )}
          </View>
        }
      />

      {process.env.EXPO_OS !== 'ios' && (
        <Pressable
          onPress={() => router.push('/event/new')}
          className='absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-black/20'
        >
          <Text className='text-white text-2xl font-bold'>+</Text>
        </Pressable>
      )}
    </View>
  );
}
