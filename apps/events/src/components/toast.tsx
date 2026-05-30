import { useEffect, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ToastMessage {
  id: string;
  message: string;
}

export function Toast({ toastMessage }: { toastMessage: ToastMessage | null }) {
  const [opacity] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toastMessage) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2700),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toastMessage, opacity]);

  if (!toastMessage) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          opacity,
          position: 'absolute',
          bottom: Math.max(insets.bottom, 16),
          left: 16,
          right: 16,
          backgroundColor: '#000',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          zIndex: 1000,
        },
      ]}
      pointerEvents='none'
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 14,
          fontWeight: '500',
          textAlign: 'center',
        }}
      >
        {toastMessage.message}
      </Text>
    </Animated.View>
  );
}
