import { Stack } from 'expo-router';
{
  /* <Stack.Screen
  name='index'
  options={{
    title: 'Events',
    headerShadowVisible: false,
  }} */
}

export default function EventsLayout() {
  return (
    <Stack.Toolbar>
      <Stack.Title asChild>Events</Stack.Title>
    </Stack.Toolbar>
  );
}
