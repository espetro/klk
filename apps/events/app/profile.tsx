import { CityPicker } from '@/components';
import { HostedButton as Button } from '@/components/hosted-button';
import { saveCity, useCity } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { wipeIdentity, resetOnboarding, RELAY_URL } from '@klk/infrastructure';
import { router as expoRouter, Stack } from 'expo-router';
import { useContext } from 'react';
import { Alert, Clipboard, Pressable, ScrollView, Text, View } from 'react-native';

function handleCityChange(newCity: string) {
  saveCity(newCity).catch(() => {});
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
        expoRouter.replace('/onboarding');
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
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView className='flex-1 bg-bg-default px-4 py-6'>
        {/* Npub Section */}
        <View className='mb-8'>
          <Text className='text-sm font-medium text-text-secondary mb-2'>Your npub</Text>
          <Pressable
            onPress={copyNpub}
            className='bg-bg-elevated rounded-2xl p-4 border border-text-secondary/10 active:bg-bg-elevated/80'
          >
            <Text className='text-xs text-text-primary font-mono' numberOfLines={2}>
              {npub}
            </Text>
            <Text className='text-xs text-action-primary mt-2 font-medium'>Tap to copy</Text>
          </Pressable>
        </View>

        {/* City Section */}
        <View className='mb-8'>
          <Text className='text-sm font-medium text-text-secondary mb-2'>City</Text>
          <CityPicker current={city} onChange={handleCityChange} />
        </View>

        {/* Relay Section */}
        <View className='mb-8'>
          <Text className='text-sm font-medium text-text-secondary mb-2'>Relay</Text>
          <View className='bg-bg-elevated rounded-2xl p-4 border border-text-secondary/10'>
            <Text className='text-sm text-text-primary font-mono'>{RELAY_URL}</Text>
          </View>
        </View>

        {/* Dev Actions Section */}
        <View className='mt-4 gap-4'>
          <Button label='Wipe Identity (Dev Only)' variant='filled' onPress={handleWipe} />
          <Button label='Reset Onboarding' variant='outlined' onPress={handleResetOnboarding} />
        </View>
      </ScrollView>
    </>
  );
}
