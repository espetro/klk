import PersonIcon from '@expo/material-symbols/person.xml';
import { Stack, router } from 'expo-router';

type IconType = Parameters<typeof Stack.Toolbar.Button>[number]['icon'];

const handleClickProfile = () => router.push('/profile');

export default function CirclesLayout() {
  const icon = process.env.EXPO_OS === 'ios' ? ('person' satisfies IconType) : PersonIcon;

  return (
    <Stack>
      <Stack.Screen name='index'>
        <Stack.Header style={{ shadowColor: 'transparent' }} />
        <Stack.Title>Circles</Stack.Title>

        {/* Profile header button */}
        <Stack.Toolbar placement='right'>
          <Stack.Toolbar.Button icon={icon} onPress={handleClickProfile} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
