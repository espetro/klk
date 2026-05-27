import BottomSheet, { BottomSheetProps } from '@gorhom/bottom-sheet';
import { PublicEventData, Coordinates } from '@klk/infrastructure';
import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';

import EventCalendarSheet from './event-calendar-sheet';
import { EventMapView } from './event-map-view';

type EventWithId = PublicEventData & { id: string; pubkey: string };

type SheetContent = { kind: 'list' } | { kind: 'event'; event: EventWithId };

type SnapPoints = NonNullable<BottomSheetProps['snapPoints']>;

const SNAP_POINTS: SnapPoints = ['15%', '60%', '90%'];

interface EventMapScreenProps {
  events: EventWithId[];
  city: string;
  selectedCity: Coordinates | null;
}

export function EventMapScreen({ events, city, selectedCity }: EventMapScreenProps) {
  const [sheetContent, setSheetContent] = useState<SheetContent>({ kind: 'list' });

  const selectedEventId = sheetContent.kind === 'event' ? sheetContent.event.id : undefined;

  const handleEventPress = useCallback((event: EventWithId) => {
    setSheetContent({ kind: 'event', event });
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSheetContent({ kind: 'list' });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <EventMapView
        events={events}
        selectedCity={selectedCity}
        onEventPress={handleEventPress}
        selectedEventId={selectedEventId}
        style={{ flex: 1 }}
      />

      <BottomSheet snapPoints={SNAP_POINTS} index={1} style={{ flex: 1 }}>
        {sheetContent.kind === 'list' ? (
          <EventCalendarSheet events={events} />
        ) : (
          <EventDetailView event={sheetContent.event} onBack={handleBackFromDetail} />
        )}
      </BottomSheet>
    </View>
  );
}

function EventDetailView({ event, onBack }: { event: EventWithId; onBack: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <Text
        onPress={onBack}
        style={{
          fontSize: 16,
          color: '#666',
          marginBottom: 12,
        }}
      >
        ← Back
      </Text>

      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>{event.title}</Text>

      {event.location && (
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>📍 {event.location}</Text>
      )}

      {event.summary && (
        <Text style={{ fontSize: 14, color: '#666', marginTop: 12 }}>{event.summary}</Text>
      )}
    </View>
  );
}
