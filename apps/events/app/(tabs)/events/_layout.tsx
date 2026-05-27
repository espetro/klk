import { Stack } from "expo-router";
import { useStore } from "@nanostores/react";
import { $eventsSearch } from "@/features";
import { Input } from "@klk/ui";
import { View } from "react-native";

function SearchHeader() {
  const search = useStore($eventsSearch);

  return (
    <View style={{ flex: 1, paddingRight: process.env.EXPO_OS === 'ios' ? 52 : 0 }}>
      <Input
        placeholder='Search events...'
        value={search}
        onChangeText={(text) => $eventsSearch.set(text)}
        className='flex-1 border-transparent bg-black/5 dark:bg-white/10'
      />
    </View>
  );
}

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <SearchHeader />,
        }}
      >
        <Stack.Header style={{ shadowColor: "transparent" }} />
      </Stack.Screen>
    </Stack>
  );
}
