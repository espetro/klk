import { GuestBarrier } from '@/components/GuestBarrier';
import { GroupCard, HostedFab } from '@/components';
import { $lastActiveTab, $circlesSearch } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { getAllGroups, GroupRecord } from '@klk/infrastructure';
import { useStore } from '@nanostores/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useCallback, useContext } from 'react';
import { FlatList, Text, View } from 'react-native';

function filterGroups(groups: GroupRecord[], searchQuery: string) {
  if (!searchQuery.trim()) return groups;

  const query = searchQuery.toLowerCase();
  return groups.filter((group) => {
    const name = group.name?.toLowerCase() || '';
    return name.includes(query);
  });
}

export default function CirclesScreen() {
  const router = useRouter();
  const { signer } = useContext(NDKContext);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const search = useStore($circlesSearch);
  const [showBarrier, setShowBarrier] = useState(false);

  useFocusEffect(
    useCallback(function loadAllGroups() {
      $lastActiveTab.set('circles');
      getAllGroups().then(setGroups);
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
    router.push('/group/new');
  }, [signer, router]);

  const filteredGroups = filterGroups(groups, search);

  return (
    <View className='flex-1 bg-gray-50'>
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: process.env.EXPO_OS !== 'ios' ? 80 : 16,
        }}
        ListEmptyComponent={
          <View className='items-center mt-20'>
            <Text className='text-gray-400 text-base'>
              {search ? `No circles found for "${search}"` : 'No circles yet'}
            </Text>
            {!search && (
              <Text className='text-gray-400 text-sm mt-1'>Create one to invite friends</Text>
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
