import { CircleRecord } from '@klk/infrastructure';
import { theme } from '@klk/ui';
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
      className='mb-2 rounded-2xl bg-bg-elevated p-0.5 ring-1 ring-black/5'
      accessibilityRole='button'
    >
      <View className='flex-row items-center gap-3 rounded-[14px] bg-bg-default px-4 py-3 active:bg-bg-elevated/50'>
        {/* Avatar */}
        <View
          className='h-12 w-12 items-center justify-center rounded-xl'
          style={{ backgroundColor: 'rgba(196, 91, 58, 0.12)' }}
        >
          <Text className='text-base font-bold' style={{ color: theme.actionPrimary }}>
            {initials || '○'}
          </Text>
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
      </View>
    </Pressable>
  );
}
