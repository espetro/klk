import { CircleCard, HostedFab } from '@/components';
import { GuestBarrier } from '@/components/GuestBarrier';
import { $lastActiveTab, $circlesSearch } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { getAllCircles, CircleRecord } from '@klk/infrastructure';
import { useStore } from '@nanostores/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useCallback, useContext } from 'react';
import { FlatList, Text, View } from 'react-native';

function filterCircles(circles: CircleRecord[], searchQuery: string) {
  if (!searchQuery.trim()) {
    return circles;
  }

  const query = searchQuery.toLowerCase();
  return circles.filter((circle) => {
    const name = circle.name?.toLowerCase() || '';
    return name.includes(query);
  });
}

export default function CirclesScreen() {
  const router = useRouter();
  const { signer } = useContext(NDKContext);
  const [circles, setCircles] = useState<CircleRecord[]>([]);
  const search = useStore($circlesSearch);
  const [showBarrier, setShowBarrier] = useState(false);

  useFocusEffect(
    useCallback(function loadAllCircles() {
      $lastActiveTab.set('circles');
      getAllCircles().then(setCircles);
      return () => {
        $circlesSearch.set('');
      };
    }, [])
  );

  const handleFabPress = useCallback(() => {
    if (!signer) {
      setShowBarrier(true);
      return;
    }
    router.push('/circle/new');
  }, [signer, router]);

  const filteredCircles = filterCircles(circles, search);

  return (
    <View className='flex-1 bg-bg-default'>
      <FlatList
        data={filteredCircles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CircleCard circle={item} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: process.env.EXPO_OS !== 'ios' ? 80 : 16,
        }}
        ListEmptyComponent={
          <View className='items-center mt-20'>
            <Text className='text-text-secondary text-center text-lg'>○</Text>
            <Text className='text-text-primary font-semibold text-base mt-2'>No circles yet</Text>
            {!search && (
              <Text className='text-text-secondary text-sm mt-1'>
                Create a circle to share private events with friends
              </Text>
            )}
          </View>
        }
      />

      {process.env.EXPO_OS !== 'ios' && <HostedFab onPress={handleFabPress} />}

      <GuestBarrier
        visible={showBarrier}
        title='Create a circle'
        description='Circles are private groups. You need an identity to create one and invite others.'
        ctaLabel='Create Identity'
        onGetStarted={() => {
          setShowBarrier(false);
          router.push('/identity');
        }}
        onDismiss={() => setShowBarrier(false)}
      />
    </View>
  );
}
