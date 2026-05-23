import { useContext, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { NDKContext } from "@/app/_layout";
import { useCityContext } from "@/lib/context/city-context";
import { CityPicker, EventCard, EventMapView } from "@klk/ui";
import { usePublicEvents } from "@/features";

type ViewMode = "list" | "map";

export default function FeedScreen() {
  const { city, setCity, coordinates } = useCityContext();
  const { events } = usePublicEvents();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Events</Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row bg-gray-200 rounded-lg p-0.5">
              <Pressable
                className={`rounded-md px-3 py-1.5 ${viewMode === "list" ? "bg-white" : ""}`}
                onPress={() => setViewMode("list")}
              >
                <Text
                  className={`text-sm font-medium ${viewMode === "list" ? "text-indigo-600" : "text-gray-500"}`}
                >
                  List
                </Text>
              </Pressable>
              <Pressable
                className={`rounded-md px-3 py-1.5 ${viewMode === "map" ? "bg-white" : ""}`}
                onPress={() => setViewMode("map")}
              >
                <Text
                  className={`text-sm font-medium ${viewMode === "map" ? "text-indigo-600" : "text-gray-500"}`}
                >
                  Map
                </Text>
              </Pressable>
            </View>
            <Pressable
              className="bg-indigo-600 rounded-full px-4 py-2"
              onPress={() => router.push("/event/new")}
            >
              <Text className="text-white font-medium">+ New</Text>
            </Pressable>
          </View>
        </View>
        <CityPicker current={city} onChange={setCity} />
      </View>

      {viewMode === "list" ? (
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
      ) : (
        <EventMapView events={events} selectedCity={coordinates} />
      )}
    </View>
  );
}
