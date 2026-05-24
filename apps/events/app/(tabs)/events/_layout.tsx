import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

function NewEventButton() {
  return (
    <Pressable onPress={() => router.push('/event/new')} hitSlop={8}>
      <Ionicons name='add' size={28} color='#6366f1' />
    </Pressable>
  );
}

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          title: 'Events',
          headerRight: () => <NewEventButton />,
        }}
      />
    </Stack>
  );
}
