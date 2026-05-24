import { CityPicker, EventCard, EventMapView } from '@/components';
import { HostedButton as Button } from '@/components/hosted-button';
import { $city, useCity, useCityCoordinates, usePublicEvents } from '@/features';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

type ViewMode = 'list' | 'map';

function handleCityChange(newCity: string) {
  $city.set({ ...$city.get(), name: newCity });
}

export default function FeedScreen() {
  const city = useCity();
  const coordinates = useCityCoordinates();
  const { events } = usePublicEvents();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <View className='flex-1 bg-gray-50'>
      <View className='px-4 pt-4 pb-2'>
        <View className='flex-row items-center justify-between mb-3'>
          <Text className='text-2xl font-bold text-gray-900'>Events</Text>
          <View className='flex-row items-center gap-2'>
            <View className='flex-row bg-gray-200 rounded-lg p-0.5'>
              <Pressable
                className={`rounded-md px-3 py-1.5 ${viewMode === 'list' ? 'bg-white' : ''}`}
                onPress={() => setViewMode('list')}
              >
                <Text
                  className={`text-sm font-medium ${viewMode === 'list' ? 'text-indigo-600' : 'text-gray-500'}`}
                >
                  List
                </Text>
              </Pressable>
              <Pressable
                className={`rounded-md px-3 py-1.5 ${viewMode === 'map' ? 'bg-white' : ''}`}
                onPress={() => setViewMode('map')}
              >
                <Text
                  className={`text-sm font-medium ${viewMode === 'map' ? 'text-indigo-600' : 'text-gray-500'}`}
                >
                  Map
                </Text>
              </Pressable>
            </View>
            <Button label='+ New' variant='filled' onPress={() => router.push('/event/new')} />
          </View>
        </View>
        <CityPicker current={city} onChange={handleCityChange} />
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className='items-center mt-20'>
              <Text className='text-gray-400 text-base'>No upcoming events in {city}</Text>
              <Text className='text-gray-400 text-sm mt-1'>Be the first to create one!</Text>
            </View>
          }
        />
      ) : (
        <EventMapView events={events} selectedCity={coordinates} />
      )}
    </View>
  );
}
