import { View } from 'react-native';

import { Skeleton } from './skeleton';

export function CircleDetailSkeleton() {
  return (
    <View className='flex-1 bg-bg-default'>
      {/* Header: avatar + name + member count */}
      <View className='flex-row items-center gap-4 px-5 py-5'>
        <Skeleton width={64} height={64} borderRadius={16} />
        <View className='flex-1 gap-2'>
          <Skeleton width={140} height={20} borderRadius={8} />
          <Skeleton width={80} height={14} borderRadius={6} />
        </View>
        <Skeleton width={80} height={36} borderRadius={18} />
      </View>

      {/* Tab bar */}
      <View className='flex-row gap-2 px-5 pb-4'>
        <Skeleton width={80} height={34} borderRadius={17} />
        <Skeleton width={80} height={34} borderRadius={17} />
        <Skeleton width={80} height={34} borderRadius={17} />
      </View>

      {/* Event rows */}
      {[0, 1, 2].map((i) => (
        <View key={i} className='flex-row items-center gap-3 px-5 py-3'>
          <Skeleton width={48} height={48} borderRadius={10} />
          <View className='flex-1 gap-2'>
            <Skeleton width='70%' height={16} borderRadius={6} />
            <Skeleton width={100} height={12} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}
