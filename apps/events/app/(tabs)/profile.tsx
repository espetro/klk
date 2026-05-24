import { CityPicker } from '@/components';
import { HostedButton as Button } from '@/components/hosted-button';
import { $city, useCity } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { wipeIdentity, resetOnboarding, RELAY_URL } from '@klk/infrastructure';
import { router as expoRouter } from 'expo-router';
import { useContext } from 'react';
import { Alert, Clipboard, Pressable, ScrollView, Text, View } from 'react-native';

function handleCityChange(newCity: string) {
  $city.set({ ...$city.get(), name: newCity });
}

function handleWipe() {
  Alert.alert('Wipe Identity', 'This will delete your private key. Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Wipe',
      style: 'destructive',
      onPress: async () => {
        await wipeIdentity();
        Alert.alert('Done', 'Restart the app to generate a new identity.');
      },
    },
  ]);
}

function handleResetOnboarding() {
  Alert.alert('Reset Onboarding', 'Start the onboarding flow from the beginning?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Reset',
      style: 'destructive',
      onPress: async () => {
        await resetOnboarding();
        expoRouter.replace('/onboarding/welcome');
      },
    },
  ]);
}

export default function ProfileScreen() {
  const { currentUser } = useContext(NDKContext);
  const city = useCity();
  const npub = currentUser?.npub ?? 'Loading…';

  // eslint-disable-next-line consistent-function-scoping
  const copyNpub = () => {
    Clipboard.setString(npub);
    Alert.alert('Copied', 'npub copied to clipboard');
  };

  return (
    <ScrollView className='flex-1 bg-gray-50 p-4'>
      <Text className='text-2xl font-bold text-gray-900 mb-6'>Profile</Text>

      <Text className='text-sm font-medium text-gray-500 mb-1'>Your npub</Text>
      <Pressable onPress={copyNpub} className='bg-white rounded-xl p-4 mb-4 border border-gray-100'>
        <Text className='text-xs text-gray-700 font-mono' numberOfLines={2}>
          {npub}
        </Text>
        <Text className='text-xs text-indigo-600 mt-2'>Tap to copy</Text>
      </Pressable>

      <Text className='text-sm font-medium text-gray-500 mb-2'>City</Text>
      <View className='mb-6'>
        <CityPicker current={city} onChange={handleCityChange} />
      </View>

      <Text className='text-sm font-medium text-gray-500 mb-1'>Relay</Text>
      <View className='bg-white rounded-xl p-4 mb-6 border border-gray-100'>
        <Text className='text-sm text-gray-700 font-mono'>{RELAY_URL}</Text>
      </View>

      <View className='mb-4'>
        <Button label='Wipe Identity (Dev Only)' variant='filled' onPress={handleWipe} />
      </View>

      <Button label='Reset Onboarding' variant='outlined' onPress={handleResetOnboarding} />
    </ScrollView>
  );
}
