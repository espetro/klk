import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { cn } from '../lib/utils';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height, borderRadius = 8, className }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={cn('bg-bg-elevated', className)}
      style={[{ width, height, borderRadius }, { opacity }]}
    />
  );
}
