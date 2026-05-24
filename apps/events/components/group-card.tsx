import { GroupRecord } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

interface Props {
  group: GroupRecord;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/group/${group.id}`)}>
      <View className='mb-3 flex flex-col rounded-xl border border-gray-200 bg-white py-4 shadow-sm shadow-black/5'>
        <View className='px-4'>
          <Text className='text-lg font-semibold text-gray-900'>{group.name}</Text>
          <Text className='mt-1 text-sm text-gray-500'>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
