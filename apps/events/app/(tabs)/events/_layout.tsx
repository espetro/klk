import { router, Stack, useLocalSearchParams } from "expo-router";
import { useStore } from "@nanostores/react";
import { $eventsSearch } from "@/features";
import { Input } from "@klk/ui";
import MapIcon from "@expo/material-symbols/map.xml";
import ListIcon from "@expo/material-symbols/list.xml";
import { View } from "react-native";

type IconType = Parameters<typeof Stack.Toolbar.Button>[number]["icon"];

const ViewModeIcon = (mapView: unknown, mapIcon: IconType, listIcon: IconType) =>
  mapView ? mapIcon : listIcon;

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
  const { mapView } = useLocalSearchParams();

  const icon =
    process.env.EXPO_OS === "ios"
      ? ViewModeIcon(mapView, "map", "list.bullet")
      : ViewModeIcon(mapView, MapIcon, ListIcon);

  const handleClickProfile = () => {
    const flip = mapView === "true" ? "false" : "true";

    router.setParams({ mapView: flip });
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <SearchHeader />,
        }}
      >
        <Stack.Header style={{ shadowColor: "transparent" }} />

        {/* View mode header button */}
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={icon} onPress={handleClickProfile} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
