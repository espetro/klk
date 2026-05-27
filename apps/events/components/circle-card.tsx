import { CircleRecord } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

interface Props {
  circle: CircleRecord;
}

export function CircleCard({ circle }: Props) {
  const router = useRouter();

  const initials = circle.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      onPress={() => router.push(`/circle/${circle.id}`)}
      className='mb-2 flex-row items-center gap-3 rounded-2xl bg-bg-elevated/50 px-4 py-3 active:bg-bg-elevated'
      accessibilityRole='button'
    >
      {/* Avatar */}
      <View className='h-12 w-12 items-center justify-center rounded-xl bg-action-primary/15'>
        <Text className='text-base font-bold text-action-primary'>{initials || '○'}</Text>
      </View>

      {/* Info */}
      <View className='flex-1'>
        <Text className='text-sm font-semibold text-text-primary' numberOfLines={1}>
          {circle.name}
        </Text>
        <Text className='mt-0.5 text-xs text-text-secondary'>
          {circle.members.length} member{circle.members.length === 1 ? '' : 's'}
        </Text>
      </View>

      <Text className='text-text-secondary'>›</Text>
    </Pressable>
  );
}
