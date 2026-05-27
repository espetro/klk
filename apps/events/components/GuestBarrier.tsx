import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

interface GuestBarrierProps {
  visible: boolean;
  title: string;
  description: string;
  ctaLabel?: string;
  onGetStarted: () => void;
  onDismiss: () => void;
}

export function GuestBarrier({
  visible,
  title,
  description,
  ctaLabel = 'Get Started',
  onGetStarted,
  onDismiss,
}: GuestBarrierProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View className='flex-1 justify-end bg-black/40'>
        <Pressable className='flex-1' onPress={onDismiss} />
        <View className='bg-white rounded-t-3xl px-6 pt-5 pb-10'>
          <View className='w-10 h-1 bg-gray-300 rounded-full self-center mb-6' />

          <View className='items-center mb-8'>
            <View className='w-16 h-16 bg-indigo-50 rounded-2xl items-center justify-center mb-4'>
              <Ionicons name='key-outline' size={32} color='#4f46e5' />
            </View>
            <Text className='text-xl font-bold text-gray-900 text-center mb-2'>{title}</Text>
            <Text className='text-base text-gray-500 text-center leading-relaxed max-w-xs'>
              {description}
            </Text>
          </View>

          <Pressable
            onPress={onGetStarted}
            className='bg-gray-900 rounded-xl py-4 mb-3 active:opacity-90'
          >
            <Text className='text-white text-center text-base font-semibold'>{ctaLabel}</Text>
          </Pressable>

          <Pressable onPress={onDismiss} className='py-3'>
            <Text className='text-gray-500 text-center text-base'>Not Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
