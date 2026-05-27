import { BottomSheetSectionList } from '@gorhom/bottom-sheet';
import { PublicEventData } from '@klk/infrastructure';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, SectionListRenderItem } from 'react-native';
import { CalendarProvider, ExpandableCalendar } from 'react-native-calendars';

import { EventCard } from './event-card';

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

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      title: date,
      data: items,
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function EventCalendarSheet({ events }: EventCalendarSheetProps) {
  const todayStr = new Date().toISOString().split('T')[0] || '';
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const sectionListRef = useRef<SectionList>(null);

  const sections = useMemo(() => groupEventsByDate(events), [events]);
  const markedDates = useMemo(() => buildMarkedDates(events), [events]);

  const handleDateSelect = useCallback(
    (day: string) => {
      setSelectedDate(day);
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

  const renderSectionHeader = ({ section }: any) => (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
        {formatDateHeader(section.title)}
      </Text>
    </View>
  );

  const renderEvent: SectionListRenderItem<EventWithId> = ({ item }) => (
    <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
      <EventCard event={item} />
    </View>
  );

  return (
    <CalendarProvider date={selectedDate} onDateChanged={handleDateSelect}>
      <View style={{ flex: 1 }}>
        <ExpandableCalendar markedDates={markedDates} firstDay={1} showWeekNumbers disablePan />

        <BottomSheetSectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderEvent}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </CalendarProvider>
  );
}
