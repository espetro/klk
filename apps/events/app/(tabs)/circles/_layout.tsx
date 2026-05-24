import { Stack, router } from 'expo-router';

const handleClickProfile = () => router.push('/profile');

export default function CirclesLayout() {
  return (
    <Stack>
      <Stack.Screen name='index'>
        <Stack.Header style={{ shadowColor: 'transparent' }} />
        <Stack.Title>Circles</Stack.Title>

        {/* Profile header button */}
        <Stack.Toolbar placement='right'>
          <Stack.Toolbar.Button icon='person' onPress={handleClickProfile} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
