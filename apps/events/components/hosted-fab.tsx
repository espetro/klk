import { Pressable, Text, View } from 'react-native';

interface HostedFabProps {
  onPress: () => void;
}

export function HostedFab({ onPress }: HostedFabProps) {
  return (
    <View style={{ position: 'absolute', bottom: 24, right: 24 }}>
      <Pressable
        onPress={onPress}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#c45b3a',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#1a1612',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fdfbf7', fontSize: 28, fontWeight: '600', lineHeight: 28 }}>+</Text>
      </Pressable>
    </View>
  );
}
