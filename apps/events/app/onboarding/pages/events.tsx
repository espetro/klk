import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

type PageProps = {
  onProceed: () => void;
  onSkip: () => void;
  isLast?: boolean;
};

export default function EventsPage({ onProceed, onSkip }: PageProps) {
  return (
    <View className="flex-1 bg-gray-50 px-8">
      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className="items-center mb-10">
          <View className="w-24 h-24 bg-gray-100 rounded-2xl items-center justify-center mb-6">
            <Ionicons name="compass-outline" size={48} color="#374151" />
          </View>

          <Text className="text-4xl font-bold text-gray-900 text-center mb-4 tracking-tight leading-tight">
            Browse &{"\n"}Create Events
          </Text>
          <Text className="text-base text-gray-500 text-center leading-relaxed max-w-xs">
            See what's happening around you. From meetups and concerts to workshops and community
            gatherings.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(800).delay(400)}
          className="w-full max-w-sm mb-12 gap-3"
        >
          <View className="flex-row items-center bg-white rounded-2xl p-4 border border-gray-100">
            <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="eye-outline" size={24} color="#374151" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 mb-0.5">Discover</Text>
              <Text className="text-sm text-gray-500">Browse public events filtered by city</Text>
            </View>
          </View>

          <View className="flex-row items-center bg-white rounded-2xl p-4 border border-gray-100">
            <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="create-outline" size={24} color="#374151" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 mb-0.5">Create</Text>
              <Text className="text-sm text-gray-500">
                Publish events with time, location, and details
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-white rounded-2xl p-4 border border-gray-100">
            <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="checkmark-circle-outline" size={24} color="#374151" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 mb-0.5">RSVP</Text>
              <Text className="text-sm text-gray-500">One-tap RSVP with live guest count</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(600)} className="w-full max-w-sm">
          <Pressable
            className="bg-gray-900 rounded-xl px-8 py-5 w-full active:opacity-90"
            onPress={onProceed}
          >
            <Text className="text-white text-center text-base font-medium">Proceed</Text>
          </Pressable>

          <View className="flex-row justify-center mt-4">
            <Pressable onPress={onSkip}>
              <Text className="text-gray-400 text-sm">Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <View className="pb-8" />
    </View>
  );
}
