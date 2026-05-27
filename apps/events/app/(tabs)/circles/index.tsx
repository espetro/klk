import { GroupCard, HostedFab } from '@/components';
import { $lastActiveTab, $circlesSearch } from '@/features';
import { getAllGroups, GroupRecord } from '@klk/infrastructure';
import { useStore } from '@nanostores/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
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
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const search = useStore($circlesSearch);

  useFocusEffect(
    useCallback(function loadAllGroups() {
      $lastActiveTab.set('circles');
      getAllGroups().then(setGroups);
      return () => {
        $circlesSearch.set('');
      };
    }, [])
  );

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

      {process.env.EXPO_OS !== 'ios' && (
        <HostedFab onPress={() => router.push('/group/new')} />
      )}
    </View>
  );
}
