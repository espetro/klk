import { GroupCard } from '@/components';
import { getAllGroups, GroupRecord } from '@klk/infrastructure';
import { Button } from '@klk/ui';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { FlatList, Text, View } from 'react-native';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getAllGroups().then(setGroups);
    }, [])
  );

  return (
    <View className='flex-1 bg-gray-50'>
      <View className='px-4 pt-4 pb-2 flex-row items-center justify-between'>
        <Text className='text-2xl font-bold text-gray-900'>Groups</Text>
        <Button variant='default' onPress={() => router.push('/group/new')}>
          <Text className='text-white font-medium'>+ New</Text>
        </Button>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className='items-center mt-20'>
            <Text className='text-gray-400 text-base'>No private groups yet</Text>
            <Text className='text-gray-400 text-sm mt-1'>Create one to invite friends</Text>
          </View>
        }
      />
    </View>
  );
}
