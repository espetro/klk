import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name='welcome' />
      <Stack.Screen name='events' />
      <Stack.Screen name='location' />
      <Stack.Screen name='login' />
    </Stack>
  );
}
