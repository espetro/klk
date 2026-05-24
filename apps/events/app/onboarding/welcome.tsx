import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className='flex-1 bg-slate-950 px-8'>
      <View className='absolute top-0 left-0 right-0 h-[500px] bg-indigo-950/30 rounded-b-[100px]' />
      <View className='absolute top-20 right-8 w-64 h-64 bg-indigo-600/10 rounded-full' />
      <View className='absolute top-40 left-8 w-48 h-48 bg-violet-600/10 rounded-full' />

      <View className='flex-1 items-center justify-center'>
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className='items-center mb-12'>
          <View className='w-28 h-28 bg-indigo-500/15 rounded-3xl items-center justify-center mb-8 border border-indigo-500/20'>
            <Ionicons name='calendar' size={56} color='#6366f1' />
          </View>
          <Text className='text-5xl font-bold text-white text-center tracking-tight'>Klk</Text>
          <Text className='text-lg text-slate-400 mt-2 font-medium'>qué lo qué</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(400)} className='items-center mb-16'>
          <Text className='text-4xl font-bold text-white text-center mb-4 tracking-tight leading-tight'>
            Discover Local{'\n'}Events
          </Text>
          <Text className='text-base text-slate-400 text-center leading-relaxed max-w-xs'>
            Find events happening in your city, create your own, and connect with your community. No
            accounts, no tracking.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(600)} className='w-full max-w-sm'>
          <Pressable
            className='bg-indigo-500 rounded-2xl px-8 py-5 w-full active:opacity-90'
            onPress={() => router.push('/onboarding/events')}
          >
            <Text className='text-white text-center text-lg font-semibold'>Get Started</Text>
          </Pressable>

          <View className='flex-row justify-center mt-6 gap-2'>
            <View className='w-8 h-1.5 bg-white rounded-full' />
            <View className='w-2 h-1.5 bg-white/30 rounded-full' />
            <View className='w-2 h-1.5 bg-white/30 rounded-full' />
            <View className='w-2 h-1.5 bg-white/30 rounded-full' />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
