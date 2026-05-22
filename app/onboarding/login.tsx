import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { getOrCreateIdentity } from "@/lib/nostr/identity";
import { completeOnboarding } from "@/lib/auth/complete-login";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function skipWithAnonymousKey() {
    setLoading(true);
    await getOrCreateIdentity();
    await completeOnboarding();
    router.replace("/(tabs)/feed");
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
        Get Started
      </Text>
      <Text className="text-base text-gray-500 text-center mb-10 leading-relaxed">
        Sign in with an existing account or continue anonymously with a
        Nostr keypair.
      </Text>

      <View className="w-full max-w-sm gap-3 mb-8">
        <Pressable className="flex-row items-center justify-center bg-black rounded-xl px-6 py-4">
          <Ionicons name="logo-apple" size={20} color="white" />
          <Text className="text-white text-base font-semibold ml-2">
            Continue with Apple
          </Text>
        </Pressable>

        <Pressable className="flex-row items-center justify-center bg-white border border-gray-300 rounded-xl px-6 py-4">
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text className="text-gray-700 text-base font-semibold ml-2">
            Continue with Google
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center w-full max-w-sm mb-8">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="px-4 text-sm text-gray-400">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      <Pressable
        className="bg-indigo-600 rounded-xl px-8 py-4 w-full max-w-sm mb-6"
        onPress={skipWithAnonymousKey}
        disabled={loading}
      >
        <Text className="text-white text-center text-lg font-semibold">
          {loading ? "Generating Keypair..." : "Continue Anonymously"}
        </Text>
      </Pressable>

      <View className="flex-row justify-center">
        <Pressable onPress={() => router.push("/legal/terms")}>
          <Text className="text-sm text-indigo-600">Terms of Service</Text>
        </Pressable>
        <Text className="text-sm text-gray-400 mx-2">&middot;</Text>
        <Pressable onPress={() => router.push("/legal/privacy")}>
          <Text className="text-sm text-indigo-600">Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}
