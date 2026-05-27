import { GroupRecord } from '@klk/infrastructure';
import { Card, CardDescription, CardHeader, CardTitle } from '@klk/ui';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

interface Props {
  group: GroupRecord;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/group/${group.id}`)}>
      <Card className='mb-3 py-4'>
        <CardHeader className='px-4'>
          <CardTitle>{group.name}</CardTitle>
          <CardDescription>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>
    </Pressable>
  );
}
