import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ToastMessage {
  id: string;
  message: string;
}

export function Toast({ toastMessage }: { toastMessage: ToastMessage | null }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toastMessage) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  if (!toastMessage || !visible) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 16),
        left: 16,
        right: 16,
        backgroundColor: '#000',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        zIndex: 1000,
      }}
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
    </View>
  );
}
