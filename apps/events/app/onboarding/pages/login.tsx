import { useOnboarding } from '@/features';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateIdentity, completeOnboarding } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

type PageProps = {
  onProceed: () => void;
  onSkip: () => void;
  isLast?: boolean;
};

export default function LoginPage(_: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { setOnboardingComplete } = useOnboarding();

  async function skipWithAnonymousKey() {
    setLoading(true);
    await getOrCreateIdentity();
    await completeOnboarding();
    setOnboardingComplete(true);
    router.replace('/');
  }

  return (
    <View className='flex-1 bg-gray-50 px-8'>
      <View className='flex-1 items-center justify-center'>
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className='items-center mb-10'>
          <View className='w-24 h-24 bg-gray-100 rounded-2xl items-center justify-center mb-6'>
            <Ionicons name='key-outline' size={48} color='#374151' />
          </View>

          <Text className='text-4xl font-bold text-gray-900 text-center mb-3 tracking-tight leading-tight'>
            Get Started
          </Text>
          <Text className='text-base text-gray-500 text-center leading-relaxed max-w-xs'>
            Sign in with an existing account or continue anonymously with a Nostr keypair.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(800).delay(400)}
          className='w-full max-w-sm gap-3 mb-6'
        >
          <Pressable className='flex-row items-center justify-center bg-gray-900 rounded-xl px-6 py-5 active:opacity-90'>
            <Ionicons name='logo-apple' size={22} color='#fff' />
            <Text className='text-white text-base font-semibold ml-3'>Continue with Apple</Text>
          </Pressable>

          <Pressable className='flex-row items-center justify-center bg-white rounded-xl px-6 py-5 border border-gray-200 active:opacity-90'>
            <Ionicons name='logo-google' size={22} color='#374151' />
            <Text className='text-gray-900 text-base font-semibold ml-3'>Continue with Google</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(500)} className='w-full max-w-sm my-6'>
          <View className='flex-row items-center'>
            <View className='flex-1 h-px bg-gray-200' />
            <Text className='px-4 text-sm text-gray-400'>or</Text>
            <View className='flex-1 h-px bg-gray-200' />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(600)} className='w-full max-w-sm'>
          <Pressable
            className='bg-gray-900 rounded-xl px-8 py-5 w-full mb-8 active:opacity-90'
            onPress={skipWithAnonymousKey}
            disabled={loading}
          >
            <Text className='text-white text-center text-base font-medium'>
              {loading ? 'Generating Keypair...' : 'Proceed Anonymously'}
            </Text>
          </Pressable>

          <View className='flex-row items-center justify-center'>
            <Pressable onPress={() => router.push('/legal/terms')}>
              <Text className='text-sm text-gray-500'>Terms of Service</Text>
            </Pressable>
            <Text className='text-sm text-gray-400 mx-2'>&middot;</Text>
            <Pressable onPress={() => router.push('/legal/privacy')}>
              <Text className='text-sm text-gray-500'>Privacy Policy</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <View className='pb-8' />
    </View>
  );
}
