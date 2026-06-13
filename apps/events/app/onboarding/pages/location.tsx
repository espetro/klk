import { saveCity } from '@/features';
import { CITIES } from '@klk/infrastructure';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

type PageProps = {
  onProceed: () => void;
  onSkip: () => void;
  isLast?: boolean;
};

export default function LocationPage({ onProceed, onSkip }: PageProps) {
  const [step, setStep] = useState<'location' | 'city'>('location');
  const [granted, setGranted] = useState(false);
  const [selectedCity, setSelectedCity] = useState('barcelona');

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setGranted(true);
    }
  }

  function advanceToCity() {
    setStep('city');
  }

  async function handleConfirmCity() {
    await saveCity(selectedCity);
    onProceed();
  }

  if (step === 'city') {
    return (
      <View className='flex-1 bg-gray-50 px-8'>
        <View className='flex-1 items-center justify-center'>
          <Animated.View entering={FadeInUp.duration(800).delay(200)} className='items-center mb-10 w-full'>
            <View className='w-24 h-24 bg-gray-100 rounded-2xl items-center justify-center mb-6'>
              <Ionicons name='map-outline' size={48} color='#374151' />
            </View>

            <Text className='text-4xl font-bold text-gray-900 text-center mb-4 tracking-tight leading-tight'>
              Your city
            </Text>
            <Text className='text-base text-gray-500 text-center leading-relaxed max-w-xs mb-8'>
              Pick your city to see relevant events in your feed.
            </Text>

            <ScrollView className='w-full max-w-sm' showsVerticalScrollIndicator={false}>
              {CITIES.map((c) => (
                <Pressable
                  key={c.slug}
                  onPress={() => setSelectedCity(c.slug)}
                  className={`rounded-xl px-5 py-4 mb-2 w-full flex-row items-center justify-between active:opacity-80 ${
                    selectedCity === c.slug
                      ? 'bg-gray-900'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${
                      selectedCity === c.slug ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {c.label}
                  </Text>
                  {selectedCity === c.slug && (
                    <Ionicons name='checkmark' size={20} color='#fff' />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(600).delay(200)} className='pb-8 w-full'>
          <Pressable
            className='bg-gray-900 rounded-xl px-8 py-5 w-full active:opacity-90'
            onPress={handleConfirmCity}
          >
            <Text className='text-white text-center text-base font-medium'>Start Exploring</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className='flex-1 bg-gray-50 px-8'>
      <View className='flex-1 items-center justify-center'>
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className='items-center mb-10'>
          <View className='w-24 h-24 bg-gray-100 rounded-2xl items-center justify-center mb-6'>
            <Ionicons name='location-outline' size={48} color='#374151' />
          </View>

          <Text className='text-4xl font-bold text-gray-900 text-center mb-4 tracking-tight leading-tight'>
            Find events{'\n'}near you
          </Text>
          <Text className='text-base text-gray-500 text-center leading-relaxed max-w-xs'>
            Allow location to discover events in your city. You can also choose a city manually.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(400)} className='w-full max-w-sm'>
          <Pressable
            className={`rounded-xl px-8 py-5 w-full mb-4 active:opacity-90 ${
              granted ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-900'
            }`}
            onPress={requestPermission}
          >
            <View className='flex-row items-center justify-center'>
              {granted && (
                <Ionicons name='checkmark' size={20} color='#059669' style={{ marginRight: 8 }} />
              )}
              <Text
                className={`text-center text-base font-medium ${
                  granted ? 'text-emerald-700' : 'text-white'
                }`}
              >
                {granted ? 'Location Enabled' : 'Allow Location'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            className='bg-gray-900 rounded-xl px-8 py-5 w-full active:opacity-90'
            onPress={advanceToCity}
          >
            <Text className='text-white text-center text-base font-medium'>Continue</Text>
          </Pressable>

          <View className='flex-row justify-center mt-4'>
            <Pressable onPress={onSkip}>
              <Text className='text-gray-400 text-sm'>Skip for now</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <View className='pb-8' />
    </View>
  );
}
