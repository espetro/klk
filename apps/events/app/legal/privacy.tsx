import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  return (
    <SafeAreaView className='flex-1 bg-white'>
      <ScrollView contentInsetAdjustmentBehavior='automatic'>
        <View className='px-6 py-8'>
          <Text className='text-2xl font-bold text-gray-900 mb-6'>Privacy Policy</Text>
          <Text className='text-base text-gray-700 leading-relaxed'>
            This is a placeholder. The full Privacy Policy will be added before production release.
            We value your privacy and are committed to protecting your personal data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
