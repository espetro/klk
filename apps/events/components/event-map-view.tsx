import { View, type ViewStyle } from "react-native";
import {
  Map,
  Camera,
  Marker,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import { PublicEventData } from "@/lib/nostr/events";
import { Coordinates } from "@/lib/nostr/geo";
import { useRef, useCallback } from "react";

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

type EventWithId = PublicEventData & { id: string; pubkey: string };

const DEFAULT_CENTER: Coordinates = { latitude: 41.3874, longitude: 2.1686 };

interface EventMapProps {
  events: EventWithId[];
  selectedCity?: Coordinates | null;
  onEventPress?: (event: EventWithId) => void;
  style?: ViewStyle;
}

export function EventMapView({
  events,
  selectedCity,
  onEventPress,
  style,
}: EventMapProps) {
  const mapRef = useRef<MapRef>(null);
  const center = selectedCity ?? DEFAULT_CENTER;

  const handleMarkerPress = useCallback(
    (event: EventWithId) => {
      onEventPress?.(event);
    },
    [onEventPress],
  );

  return (
    <View style={[{ flex: 1 }, style]}>
      <Map ref={mapRef} style={{ flex: 1 }} mapStyle={MAP_STYLE}>
        <Camera
          center={[center.longitude, center.latitude]}
          zoom={12}
          easing="fly"
          duration={600}
        />
        {events
          .filter((e) => e.location != null && e.location.includes(","))
          .map((event) => {
            const parts = event.location
              .split(",")
              .map((s) => parseFloat(s.trim()));
            if (parts.length < 2 || parts.some(isNaN)) return null;
            const [longitude, latitude] = parts;
            return (
              <Marker
                key={event.id}
                lngLat={[longitude, latitude]}
                onPress={() => handleMarkerPress(event)}
              >
                <View className="bg-indigo-600 rounded-full w-7 h-7 items-center justify-center shadow-sm">
                  <View className="bg-white w-2.5 h-2.5 rounded-full" />
                </View>
              </Marker>
            );
          })}
      </Map>
    </View>
  );
}
