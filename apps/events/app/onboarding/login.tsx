import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { getOrCreateIdentity } from "@klk/infrastructure";
import { completeOnboarding } from "@klk/infrastructure";
import { useOnboarding } from "@/features";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setOnboardingComplete } = useOnboarding();

  async function skipWithAnonymousKey() {
    setLoading(true);
    await getOrCreateIdentity();
    await completeOnboarding();
    setOnboardingComplete(true);
    router.dismissAll();
    router.replace("/");
  }

  return (
    <View className="flex-1 bg-slate-950 px-8">
      <View className="absolute top-0 left-0 right-0 h-[500px] bg-indigo-950/30 rounded-b-[100px]" />
      <View className="absolute top-32 left-8 w-56 h-56 bg-indigo-600/10 rounded-full" />
      <View className="absolute top-48 right-8 w-40 h-40 bg-violet-600/10 rounded-full" />

      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className="items-center mb-10">
          <View className="w-24 h-24 bg-indigo-500/15 rounded-3xl items-center justify-center mb-6 border border-indigo-500/20">
            <Ionicons name="key-outline" size={48} color="#6366f1" />
          </View>

          <Text className="text-4xl font-bold text-white text-center mb-3 tracking-tight leading-tight">
            Get Started
          </Text>
          <Text className="text-base text-slate-400 text-center leading-relaxed max-w-xs">
            Sign in with an existing account or continue anonymously with a Nostr keypair.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(800).delay(400)}
          className="w-full max-w-sm gap-3 mb-8"
        >
          <Pressable className="flex-row items-center justify-center bg-white rounded-2xl px-6 py-5 active:opacity-90">
            <Ionicons name="logo-apple" size={22} color="#000" />
            <Text className="text-slate-900 text-base font-semibold ml-3">Continue with Apple</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-center bg-slate-900 rounded-2xl px-6 py-5 border border-slate-700 active:opacity-90">
            <Ionicons name="logo-google" size={22} color="#fff" />
            <Text className="text-white text-base font-semibold ml-3">Continue with Google</Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(800).delay(500)}
          className="flex-row items-center w-full max-w-sm mb-8"
        >
          <View className="flex-1 h-px bg-slate-800" />
          <Text className="px-4 text-sm text-slate-500">or</Text>
          <View className="flex-1 h-px bg-slate-800" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(600)} className="w-full max-w-sm">
          <Pressable
            className="bg-indigo-500 rounded-2xl px-8 py-5 w-full mb-8 active:opacity-90"
            onPress={skipWithAnonymousKey}
            disabled={loading}
          >
            <Text className="text-white text-center text-lg font-semibold">
              {loading ? "Generating Keypair..." : "Continue Anonymously"}
            </Text>
          </Pressable>

          <View className="flex-row justify-center">
            <Pressable onPress={() => router.push("/legal/terms")}>
              <Text className="text-sm text-indigo-400">Terms of Service</Text>
            </Pressable>
            <Text className="text-sm text-slate-600 mx-2">&middot;</Text>
            <Pressable onPress={() => router.push("/legal/privacy")}>
              <Text className="text-sm text-indigo-400">Privacy Policy</Text>
            </Pressable>
          </View>

          <View className="flex-row justify-center mt-6 gap-2">
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-2 h-1.5 bg-white/30 rounded-full" />
            <View className="w-8 h-1.5 bg-white rounded-full" />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
