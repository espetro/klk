import { CityPicker, EventCard } from '@/components';
import { $city, useCity, usePublicEvents } from '@/features';
import { FlatList, Text, View } from 'react-native';

function handleCityChange(newCity: string) {
  $city.set({ ...$city.get(), name: newCity });
}

export default function EventsScreen() {
  const city = useCity();
  const { events } = usePublicEvents();

  return (
    <View className='flex-1 bg-gray-50'>
      <View className='px-4 pt-4 pb-2'>
        <CityPicker current={city} onChange={handleCityChange} />
      </View>

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
    </View>
  );
}
