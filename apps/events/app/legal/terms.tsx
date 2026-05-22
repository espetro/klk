import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-gray-900 mb-6">Terms of Service</Text>
          <Text className="text-base text-gray-700 leading-relaxed">
            This is a placeholder. The full Terms of Service will be added before production
            release. By using Klk, you agree to our terms.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
