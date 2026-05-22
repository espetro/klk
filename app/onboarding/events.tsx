import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EventsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-8">
        <Ionicons name="compass-outline" size={40} color="#4f46e5" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
        Browse & Create Events
      </Text>
      <Text className="text-base text-gray-500 text-center mb-6 leading-relaxed">
        See what's happening around you. From meetups and concerts to workshops
        and community gatherings.
      </Text>

      <View className="w-full max-w-sm mb-12">
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name="eye-outline" size={20} color="#16a34a" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">
              Discover
            </Text>
            <Text className="text-xs text-gray-500">
              Browse public events filtered by city
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">
              Create
            </Text>
            <Text className="text-xs text-gray-500">
              Publish events with time, location, and details
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name="checkmark-circle-outline" size={20} color="#7c3aed" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">RSVP</Text>
            <Text className="text-xs text-gray-500">
              One-tap RSVP with live guest count
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        className="bg-indigo-600 rounded-xl px-8 py-4 w-full max-w-sm"
        onPress={() => router.push("/onboarding/location")}
      >
        <Text className="text-white text-center text-lg font-semibold">
          Next
        </Text>
      </Pressable>
    </View>
  );
}
