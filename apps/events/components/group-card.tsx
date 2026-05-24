import { GroupRecord } from '@klk/infrastructure';
import { Card, CardContent } from '@klk/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

interface Props {
  group: GroupRecord;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/group/${group.id}`)}>
      <Card className='bg-white mb-3'>
        <CardContent className='p-4'>
          <Text className='text-lg font-semibold text-gray-900'>{group.name}</Text>
          <Text className='text-sm text-gray-500 mt-1'>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}
