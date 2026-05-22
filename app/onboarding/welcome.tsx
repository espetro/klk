import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="items-center mb-12">
        <View className="w-24 h-24 bg-indigo-600 rounded-3xl items-center justify-center mb-6">
          <Ionicons name="calendar" size={48} color="white" />
        </View>
        <Text className="text-3xl font-bold text-gray-900 text-center">
          Klk
        </Text>
        <Text className="text-lg text-gray-500 mt-1">qué lo qué</Text>
      </View>

      <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
        Discover Local Events
      </Text>
      <Text className="text-base text-gray-500 text-center mb-12 leading-relaxed">
        Find events happening in your city, create your own, and connect with
        your community. No accounts, no tracking.
      </Text>

      <Pressable
        className="bg-indigo-600 rounded-xl px-8 py-4 w-full max-w-sm"
        onPress={() => router.push("/onboarding/events")}
      >
        <Text className="text-white text-center text-lg font-semibold">
          Get Started
        </Text>
      </Pressable>
    </View>
  );
}
