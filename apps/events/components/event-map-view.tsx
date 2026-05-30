import { PublicEventData, Coordinates } from '@klk/infrastructure';
import React, { useRef, useCallback, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type EventWithId = PublicEventData & { id: string; pubkey: string };

const DEFAULT_CENTER: Coordinates = { latitude: 41.3874, longitude: 2.1686 };

interface EventMapProps {
  events: EventWithId[];
  selectedCity?: Coordinates | null;
  onEventPress?: (event: EventWithId) => void;
  selectedEventId?: string | undefined;
  style?: ViewStyle;
}

export const EventMapView = React.memo(function EventMapView({
  events,
  selectedCity,
  onEventPress,
  selectedEventId,
  style,
}: EventMapProps) {
  const mapRef = useRef<MapView>(null);
  const center = selectedCity ?? DEFAULT_CENTER;

  const handleMarkerPress = useCallback(
    function handleMarkerPress(event: EventWithId) {
      onEventPress?.(event);
    },
    [onEventPress]
  );

  const markers = useMemo(() => {
    return events
      .filter(
        (e): e is EventWithId & { location: string } => !!e.location && e.location.includes(',')
      )
      .map((event) => {
        const location = event.location;
        const parts = location.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length < 2 || parts.some((_) => isNaN(_))) {
          return null;
        }
        const longitude = parts[0]!;
        const latitude = parts[1]!;
        const isSelected = selectedEventId === event.id;

        return (
          <Marker
            key={event.id}
            coordinate={{ latitude, longitude }}
            onPress={() => handleMarkerPress(event)}
          >
            <View
              className={`rounded-full items-center justify-center shadow-sm ${
                isSelected ? 'bg-indigo-600 w-9 h-9 border-4 border-white' : 'bg-indigo-600 w-7 h-7'
              }`}
            >
              <View className='bg-white w-2.5 h-2.5 rounded-full' />
            </View>
          </Marker>
        );
      });
  }, [events, handleMarkerPress, selectedEventId]);

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          ...center,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {markers}
      </MapView>
    </View>
  );
});
