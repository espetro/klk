import { useContext } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { NDKContext } from "@/app/_layout";
import { CityPicker } from "@/components/city-picker";
import { EventCard } from "@/components/event-card";
import { usePublicEvents } from "@/lib/hooks/use-public-events";

export default function FeedScreen() {
  const { city, setCity } = useContext(NDKContext);
  const { events } = usePublicEvents();
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Events</Text>
          <Pressable
            className="bg-indigo-600 rounded-full px-4 py-2"
            onPress={() => router.push("/event/new")}
          >
            <Text className="text-white font-medium">+ New</Text>
          </Pressable>
        </View>
        <CityPicker current={city} onChange={setCity} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-gray-400 text-base">No upcoming events in {city}</Text>
            <Text className="text-gray-400 text-sm mt-1">Be the first to create one!</Text>
          </View>
        }
      />
    </View>
  );
}
