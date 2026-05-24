import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { router } from 'expo-router';

function ProfileHeaderButton() {
  return (
    <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
      <Ionicons name="person-circle-outline" size={28} color="#6366f1" />
    </Pressable>
  );
}

export default function CirclesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Circles',
          headerRight: () => <ProfileHeaderButton />,
        }}
      />
    </Stack>
  );
}
