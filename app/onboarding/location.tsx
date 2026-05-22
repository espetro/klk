import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function LocationScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState(false);

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      setGranted(true);
    }
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-8">
        <Ionicons name="location-outline" size={40} color="#4f46e5" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
        Enable Location
      </Text>
      <Text className="text-base text-gray-500 text-center mb-6 leading-relaxed">
        Klk uses your location to show events near you and suggest your city.
        Your location never leaves your device.
      </Text>

      <Pressable
        className={`rounded-xl px-8 py-4 w-full max-w-sm mb-4 ${granted ? "bg-green-100" : "bg-indigo-600"}`}
        onPress={requestPermission}
      >
        <Text
          className={`text-center text-lg font-semibold ${granted ? "text-green-700" : "text-white"}`}
        >
          {granted ? "Location Enabled" : "Allow Location"}
        </Text>
      </Pressable>

      <Pressable
        className="bg-indigo-600 rounded-xl px-8 py-4 w-full max-w-sm"
        onPress={() => router.push("/onboarding/login")}
      >
        <Text className="text-white text-center text-lg font-semibold">
          Next
        </Text>
      </Pressable>
    </View>
  );
}
