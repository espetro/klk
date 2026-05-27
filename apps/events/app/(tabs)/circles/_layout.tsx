import { $circlesSearch } from '@/features';
import PersonIcon from '@expo/material-symbols/person.xml';
import { Input } from '@klk/ui';
import { useStore } from '@nanostores/react';
import { Stack, router } from 'expo-router';
import { View } from 'react-native';

type IconType = Parameters<typeof Stack.Toolbar.Button>[number]['icon'];

const handleClickProfile = () => router.push('/profile');

function SearchHeader() {
  const search = useStore($circlesSearch);

  return (
    <View
      style={{
        flex: 1,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: process.env.EXPO_OS === 'ios' ? 52 : 0,
      }}
    >
      <Input
        placeholder='Search circles...'
        value={search}
        onChangeText={(text) => $circlesSearch.set(text)}
        className='flex-1 border-transparent bg-black/5 dark:bg-white/10'
      />
    </View>
  );
}

export default function CirclesLayout() {
  const icon = process.env.EXPO_OS === 'ios' ? ('person' satisfies IconType) : PersonIcon;

  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerTitle: () => <SearchHeader />,
        }}
      >
        <Stack.Header style={{ shadowColor: 'transparent' }} />

        {/* Profile header button */}
        <Stack.Toolbar placement='right'>
          <Stack.Toolbar.Button icon={icon} onPress={handleClickProfile} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
