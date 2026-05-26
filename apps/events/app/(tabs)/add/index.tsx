import { $lastActiveTab } from '@/features';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

export default function AddTab() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const dest = $lastActiveTab.get() === 'circles' ? '/group/new' : '/event/new';
      router.push(dest);
    }, [router])
  );

  return <View className='flex-1' />;
}
