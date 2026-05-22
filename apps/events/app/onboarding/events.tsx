import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

export default function EventsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 px-8">
      <View className="absolute top-0 left-0 right-0 h-[500px] bg-indigo-950/30 rounded-b-[100px]" />
      <View className="absolute top-32 left-8 w-56 h-56 bg-indigo-600/10 rounded-full" />
      <View className="absolute top-48 right-8 w-40 h-40 bg-violet-600/10 rounded-full" />

      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className="items-center mb-10">
          <View className="w-24 h-24 bg-indigo-500/15 rounded-3xl items-center justify-center mb-6 border border-indigo-500/20">
            <Ionicons name="compass-outline" size={48} color="#6366f1" />
          </View>

          <Text className="text-4xl font-bold text-white text-center mb-4 tracking-tight leading-tight">
            Browse &{"\n"}Create Events
          </Text>
          <Text className="text-base text-slate-400 text-center leading-relaxed max-w-xs">
            See what's happening around you. From meetups and concerts to workshops and community
            gatherings.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(800).delay(400)}
          className="w-full max-w-sm mb-12 gap-3"
        >
          <View className="flex-row items-center bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <View className="w-12 h-12 bg-emerald-500/15 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="eye-outline" size={24} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white mb-0.5">Discover</Text>
              <Text className="text-sm text-slate-400">Browse public events filtered by city</Text>
            </View>
          </View>

          <View className="flex-row items-center bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <View className="w-12 h-12 bg-blue-500/15 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="create-outline" size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white mb-0.5">Create</Text>
              <Text className="text-sm text-slate-400">
                Publish events with time, location, and details
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <View className="w-12 h-12 bg-violet-500/15 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="checkmark-circle-outline" size={24} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white mb-0.5">RSVP</Text>
              <Text className="text-sm text-slate-400">One-tap RSVP with live guest count</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(600)} className="w-full max-w-sm">
          <Pressable
            className="bg-indigo-500 rounded-2xl px-8 py-5 w-full active:opacity-90"
            onPress={() => router.push("/onboarding/location")}
          >
            <Text className="text-white text-center text-lg font-semibold">Next</Text>
          </Pressable>

          <View className="flex-row justify-center mt-6 gap-2">
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-8 h-1.5 bg-white rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
