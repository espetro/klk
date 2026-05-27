import { View } from 'react-native';

import { Skeleton } from './skeleton';

export function EventCardSkeleton() {
  return (
    <View className='flex-row gap-3 px-4 py-3'>
      {/* Thumbnail */}
      <Skeleton width={80} height={80} borderRadius={12} />

      {/* Content */}
      <View className='flex-1 gap-2 justify-center'>
        {/* Host row */}
        <Skeleton width={120} height={12} borderRadius={6} />
        {/* Title */}
        <Skeleton width='100%' height={16} borderRadius={6} />
        {/* Time */}
        <Skeleton width={100} height={12} borderRadius={6} />
        {/* Location */}
        <Skeleton width={140} height={12} borderRadius={6} />
      </View>
    </View>
  );
}
