import BottomSheet, { BottomSheetProps } from '@gorhom/bottom-sheet';
import { PublicEventData, Coordinates } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { PropsWithChildren, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EventCalendarSheet from './event-calendar-sheet';
import { EventMapView } from './event-map-view';

type EventWithId = PublicEventData & { id: string; pubkey: string };

type SnapPoints = NonNullable<BottomSheetProps['snapPoints']>;

const SNAP_POINTS: SnapPoints = ['15%', '60%', '90%'];

interface EventMapScreenProps extends PropsWithChildren {
  events: EventWithId[];
  city: string;
  selectedCity: Coordinates | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function EventMapScreen({
  events,
  city: _city,
  selectedCity,
  loading,
  error,
  onRefresh,
  children,
}: EventMapScreenProps) {
  const router = useRouter();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  const handleEventPress = useCallback(
    (event: EventWithId) => {
      router.push(`/event/${event.id}`);
    },
    [router]
  );

  const TAB_BAR_HEIGHT_IOS = 49;
  const bottomInset = Platform.OS === 'ios' ? safeAreaBottom + TAB_BAR_HEIGHT_IOS : safeAreaBottom;

  return (
    <>
      <EventMapView
        events={events}
        selectedCity={selectedCity}
        onEventPress={handleEventPress}
        style={{ flex: 1 }}
      />

      {children}

      <BottomSheet snapPoints={SNAP_POINTS} index={1} bottomInset={bottomInset}>
        <EventCalendarSheet
          events={events}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          onEventPress={handleEventPress}
        />
      </BottomSheet>
    </>
  );
}
