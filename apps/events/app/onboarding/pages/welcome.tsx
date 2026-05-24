import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

type PageProps = {
  onProceed: () => void;
  onSkip: () => void;
  isLast?: boolean;
};

export default function WelcomePage({ onProceed, onSkip }: PageProps) {
  return (
    <View className="flex-1 bg-gray-50 px-8">
      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className="items-center mb-12">
          <View className="w-28 h-28 bg-gray-100 rounded-2xl items-center justify-center mb-8">
            <Ionicons name="calendar" size={56} color="#374151" />
          </View>
          <Text className="text-5xl font-bold text-gray-900 text-center tracking-tight">Klk</Text>
          <Text className="text-lg text-gray-500 mt-2 font-medium">qué lo qué</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(400)} className="items-center mb-16">
          <Text className="text-4xl font-bold text-gray-900 text-center mb-4 tracking-tight leading-tight">
            Discover Local{"\n"}Events
          </Text>
          <Text className="text-base text-gray-500 text-center leading-relaxed max-w-xs">
            Find events happening in your city, create your own, and connect with your community. No
            accounts, no tracking.
          </Text>
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
