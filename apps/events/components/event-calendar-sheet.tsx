import { BottomSheetSectionList } from '@gorhom/bottom-sheet';
import { PublicEventData } from '@klk/infrastructure';
import { EventCard, EventCardData, EventCardSkeleton } from '@klk/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  SectionList,
  SectionListRenderItem,
  SectionListData,
} from 'react-native';
import { CalendarProvider, ExpandableCalendar } from 'react-native-calendars';

interface EventWithId extends PublicEventData {
  id: string;
  pubkey: string;
}

interface DaySection {
  title: string;
  data: EventWithId[];
}

interface EventCalendarSheetProps {
  events: EventWithId[];
  loading?: boolean | undefined;
  error?: string | null | undefined;
  onRefresh?: (() => void) | undefined;
  onEventPress?: ((event: EventWithId) => void) | undefined;
}

function groupEventsByDate(events: EventWithId[]): DaySection[] {
  const grouped = new Map<string, EventWithId[]>();

  events.forEach((event) => {
    const dateKey = new Date(event.start * 1000).toISOString().split('T')[0] || '';
    if (dateKey) {
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    }
  });

  const entries = Array.from(grouped.entries()) as [string, EventWithId[]][];
  entries.sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]));
  return entries.map((entry) => ({
    title: entry[0],
    data: entry[1],
  }));
}

function buildMarkedDates(events: EventWithId[]) {
  const marked: Record<string, { marked: boolean }> = {};

  events.forEach((event) => {
    const dateKey = new Date(event.start * 1000).toISOString().split('T')[0];
    if (dateKey) {
      marked[dateKey] = { marked: true };
    }
  });

  return marked;
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day} ${month} / ${weekday}`;
}

function mapToEventCardData(event: EventWithId): EventCardData {
  return {
    id: event.id,
    title: event.title || 'Untitled',
    description: event.summary,
    startTime: event.start,
    endTime: event.end || undefined,
    location: event.location,
    ...(event.image ? { imageUrl: event.image } : {}),
    attendeeCount: 0,
    rsvpStatus: null,
  };
}

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4'] as const;

export default function EventCalendarSheet({
  events,
  loading,
  error,
  onRefresh,
  onEventPress,
}: EventCalendarSheetProps) {
  const todayStr = new Date().toISOString().split('T')[0] || '';
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sectionListRef = useRef<SectionList>(null);

  const allSections = useMemo(() => groupEventsByDate(events), [events]);
  const sections = useMemo(() => {
    if (!filteredDate) return allSections;
    return allSections.filter((s) => s.title === filteredDate);
  }, [allSections, filteredDate]);
  const markedDates = useMemo(() => buildMarkedDates(events), [events]);

  const handleDateSelect = useCallback(
    (day: string) => {
      setSelectedDate(day);
      setFilteredDate(day);
      const sectionIndex = sections.findIndex((s) => s.title === day);
      if (sectionIndex !== -1) {
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          animated: true,
        });
      }
    },
    [sections]
  );

  const handleRefresh = useCallback(() => {
    if (!onRefresh) {
      return;
    }
    setRefreshing(true);
    onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const renderSectionHeader = (info: { section: SectionListData<EventWithId, DaySection> }) => (
    <View className='bg-bg-default px-4 pt-4 pb-2'>
      <Text className='text-xs font-semibold uppercase tracking-widest text-text-secondary'>
        {formatDateHeader(info.section.title)}
      </Text>
    </View>
  );

  const renderEvent: SectionListRenderItem<EventWithId> = ({ item }) => {
    const cardData = mapToEventCardData(item);
    return (
      <EventCard
        event={cardData}
        {...(onEventPress ? { onPress: () => onEventPress(item) } : {})}
      />
    );
  };

  if (loading && events.length === 0) {
    return (
      <View className='flex-1 bg-bg-default'>
        {SKELETON_KEYS.map((key) => (
          <EventCardSkeleton key={key} />
        ))}
      </View>
    );
  }

  if (error && events.length === 0) {
    return (
      <View className='flex-1 items-center justify-center gap-4 bg-bg-default'>
        <Text className='text-center text-sm text-text-secondary'>{error}</Text>
        {onRefresh ? (
          <Pressable
            onPress={onRefresh}
            className='rounded-full bg-action-primary px-5 py-2.5'
            accessibilityRole='button'
          >
            <Text className='text-sm font-semibold text-text-inverse'>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <CalendarProvider date={selectedDate} onDateChanged={handleDateSelect}>
      <View style={{ flex: 1 }}>
        <ExpandableCalendar markedDates={markedDates} firstDay={1} showWeekNumbers disablePan />

        {filteredDate && (
          <View className='px-4 py-2'>
            <Pressable
              onPress={() => setFilteredDate(null)}
              className='self-start rounded-full bg-bg-elevated px-3 py-1 flex-row items-center gap-1'
              accessibilityRole='button'
              accessibilityLabel='Clear date filter'
            >
              <Text className='text-text-secondary'>✕</Text>
              <Text className='text-sm font-medium text-text-secondary'>All dates</Text>
            </Pressable>
          </View>
        )}

        <BottomSheetSectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderEvent}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            ) : undefined
          }
        />
      </View>
    </CalendarProvider>
  );
}
