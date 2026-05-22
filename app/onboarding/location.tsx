import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

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
    <View className="flex-1 bg-slate-950 px-8">
      <View className="absolute top-0 left-0 right-0 h-[500px] bg-indigo-950/30 rounded-b-[100px]" />
      <View className="absolute top-24 right-8 w-56 h-56 bg-indigo-600/10 rounded-full" />
      <View className="absolute top-44 left-8 w-40 h-40 bg-violet-600/10 rounded-full" />

      <View className="flex-1 items-center justify-center">
        <Animated.View
          entering={FadeInUp.duration(800).delay(200)}
          className="items-center mb-10"
        >
          <View className="w-24 h-24 bg-indigo-500/15 rounded-3xl items-center justify-center mb-6 border border-indigo-500/20">
            <Ionicons name="location-outline" size={48} color="#6366f1" />
          </View>

          <Text className="text-4xl font-bold text-white text-center mb-4 tracking-tight leading-tight">
            Enable{"\n"}Location
          </Text>
          <Text className="text-base text-slate-400 text-center leading-relaxed max-w-xs">
            Klk uses your location to show events near you and suggest your city.
            Your location never leaves your device.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(800).delay(400)}
          className="w-full max-w-sm"
        >
          <Pressable
            className={`rounded-2xl px-8 py-5 w-full mb-4 active:opacity-90 ${
              granted
                ? "bg-emerald-500/15 border border-emerald-500/25"
                : "bg-indigo-500"
            }`}
            onPress={requestPermission}
          >
            <View className="flex-row items-center justify-center">
              {granted && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#10b981"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                className={`text-center text-lg font-semibold ${
                  granted ? "text-emerald-400" : "text-white"
                }`}
              >
                {granted ? "Location Enabled" : "Allow Location"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            className="bg-slate-800 rounded-2xl px-8 py-5 w-full active:opacity-90 border border-slate-700"
            onPress={() => router.push("/onboarding/login")}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Next
            </Text>
          </Pressable>

          <View className="flex-row justify-center mt-6 gap-2">
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-8 h-1.5 bg-white rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
