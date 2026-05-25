import { router, Stack, useLocalSearchParams } from "expo-router";
import MapIcon from "@expo/material-symbols/map.xml";
import ListIcon from "@expo/material-symbols/list.xml";

type IconType = Parameters<typeof Stack.Toolbar.Button>[number]["icon"];

const ViewModeIcon = (mapView: unknown, mapIcon: IconType, listIcon: IconType) =>
  mapView ? mapIcon : listIcon;

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
      <Stack.Screen name="index">
        <Stack.Header style={{ shadowColor: "transparent" }} />
        <Stack.Title>Events</Stack.Title>

        {/* View mode header button */}
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={icon} onPress={handleClickProfile} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
