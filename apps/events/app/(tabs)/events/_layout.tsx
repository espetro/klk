import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen name='index'>
        <Stack.Header style={{ shadowColor: 'transparent' }} />
        <Stack.Title>Events</Stack.Title>
      </Stack.Screen>
    </Stack>
  );
}
