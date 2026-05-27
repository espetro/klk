import { View } from 'react-native';

import { Skeleton } from './skeleton';

export function EventDetailSkeleton() {
  return (
    <View className='flex-1 bg-bg-default'>
      <View className='flex-1 px-4' style={{ paddingBottom: 60 }}>
        {/* Hero card */}
        <Skeleton width='100%' height={240} borderRadius={12} className='mt-4' />

        {/* Title + datetime */}
        <View className='mt-5 gap-2'>
          <Skeleton width='85%' height={28} borderRadius={8} />
          <Skeleton width={160} height={16} borderRadius={6} />
          <Skeleton width={120} height={16} borderRadius={6} />
        </View>

        {/* Action buttons row */}
        <View className='flex-row gap-3 mt-5'>
          <Skeleton height={44} borderRadius={22} className='flex-1' />
          <Skeleton width={44} height={44} borderRadius={22} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>

        {/* Location section */}
        <View className='mt-5 gap-2'>
          <Skeleton width={80} height={12} borderRadius={6} />
          <Skeleton width='70%' height={14} borderRadius={6} />
          <Skeleton width='50%' height={14} borderRadius={6} />
        </View>

        {/* Attendees */}
        <View className='flex-row items-center gap-2 mt-5'>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={80} height={14} borderRadius={6} className='ml-1' />
        </View>

        {/* Description lines */}
        <View className='mt-5 gap-2'>
          <Skeleton width={60} height={12} borderRadius={6} />
          <Skeleton width='100%' height={14} borderRadius={6} />
          <Skeleton width='80%' height={14} borderRadius={6} />
          <Skeleton width='60%' height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}
