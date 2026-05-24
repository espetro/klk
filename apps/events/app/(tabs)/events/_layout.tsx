import { ViewModeToggle } from '@/components/view-mode-toggle';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen name='index'>
        <Stack.Header>
          <ViewModeToggle />
          <Pressable onPress={() => router.push('/event/new')} hitSlop={8}>
            <Ionicons name='add' size={28} color='#6366f1' />
          </Pressable>
        </Stack.Header>
      </Stack.Screen>
    </Stack>
  );
}
