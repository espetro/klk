import { CircleRecord } from '@klk/infrastructure';
import { Card, CardDescription, CardHeader, CardTitle } from '@klk/ui';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

interface Props {
  circle: CircleRecord;
}

export function CircleCard({ circle }: Props) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/circle/${circle.id}`)}>
      <Card className='mb-3 py-4'>
        <CardHeader className='px-4'>
          <CardTitle>{circle.name}</CardTitle>
          <CardDescription>
            {circle.members.length} member{circle.members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>
    </Pressable>
  );
}
