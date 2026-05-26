import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerLargeTitle: false }} />
    </Stack>
  );
}
