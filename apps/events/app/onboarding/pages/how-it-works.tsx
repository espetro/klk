import { Ionicons } from '@expo/vector-icons';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

type PageProps = {
  onProceed: () => void;
  onSkip: () => void;
  isLast?: boolean;
};

export default function HowItWorksPage({ onProceed, onSkip }: PageProps) {
  return (
    <View className='flex-1 bg-gray-50 px-8'>
      <View className='flex-1 items-center justify-center'>
        <Animated.View entering={FadeInUp.duration(800).delay(200)} className='items-center mb-8'>
          <Text className='text-4xl font-bold text-gray-900 text-center mb-3 tracking-tight leading-tight'>
            See what&apos;s{'\n'}possible
          </Text>
          <Text className='text-base text-gray-500 text-center leading-relaxed max-w-xs'>
            Browse freely. Join in when you&apos;re ready.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(800).delay(400)}
          className='w-full max-w-sm mb-12 gap-3'
        >
          <View className='flex-row items-center bg-white rounded-2xl p-4 border border-gray-100'>
            <View className='w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4'>
              <Ionicons name='map-outline' size={24} color='#4f46e5' />
            </View>
            <View className='flex-1'>
              <Text className='text-base font-semibold text-gray-900 mb-0.5'>
                See events near you
              </Text>
              <Text className='text-sm text-gray-500'>
                Map and calendar views, no signup needed
              </Text>
            </View>
          </View>

          <View className='flex-row items-center bg-white rounded-2xl p-4 border border-gray-100'>
            <View className='w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4'>
              <Ionicons name='checkmark-circle-outline' size={24} color='#4f46e5' />
            </View>
            <View className='flex-1'>
              <Text className='text-base font-semibold text-gray-900 mb-0.5'>RSVP in one tap</Text>
              <Text className='text-sm text-gray-500'>
                Save your spot when you find something great
              </Text>
            </View>
          </View>

          <View className='flex-row items-center bg-white rounded-2xl p-4 border border-gray-100'>
            <View className='w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4'>
              <Ionicons name='add-circle-outline' size={24} color='#4f46e5' />
            </View>
            <View className='flex-1'>
              <Text className='text-base font-semibold text-gray-900 mb-0.5'>Host your own</Text>
              <Text className='text-sm text-gray-500'>
                Publish events and invite your community
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(600)} className='w-full max-w-sm'>
          <Pressable
            className='bg-gray-900 rounded-xl px-8 py-5 w-full active:opacity-90'
            onPress={onProceed}
          >
            <Text className='text-white text-center text-base font-medium'>Continue</Text>
          </Pressable>

          <View className='flex-row justify-center mt-4'>
            <Pressable onPress={onSkip}>
              <Text className='text-gray-400 text-sm'>Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <View className='pb-8' />
    </View>
  );
}
