import { useCircleEvent, useCircleRsvps } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import CalendarTodayIcon from '@expo/material-symbols/calendar_today.xml';
import EditIcon from '@expo/material-symbols/edit.xml';
import IosShareIcon from '@expo/material-symbols/ios_share.xml';
import LocationOnIcon from '@expo/material-symbols/location_on.xml';
import MoreHorizIcon from '@expo/material-symbols/more_horiz.xml';
import { User } from '@klk/core';
import {
  getCircle,
  CircleRecord,
  PublicEventData,
  publishPrivateRsvp,
} from '@klk/infrastructure';
import { theme, AttendeeList, RSVPButton, EventDetailSkeleton } from '@klk/ui';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDateRange(startTs: number, endTs?: number) {
  if (!startTs) {
    return 'TBD';
  }
  const start = new Date(startTs * 1000);
  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === start.toDateString();

  let dateStr: string;
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (!endTs) {
    return `${dateStr}, ${startTime}`;
  }

  const endTime = new Date(endTs * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${startTime} – ${endTime}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className='mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary'>
      {title}
    </Text>
  );
}

function HeroCard({
  imageUrl,
  title,
  startTs,
}: {
  imageUrl?: string;
  title: string;
  startTs: number;
}) {
  if (imageUrl) {
    return (
      <View className='mx-4 mt-4 overflow-hidden rounded-2xl' style={{ height: 240 }}>
        <Image
          source={{ uri: imageUrl }}
          className='h-full w-full'
          resizeMode='cover'
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  const dateStr = new Date(startTs * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View
      className='mx-4 mt-4 items-center justify-center overflow-hidden rounded-2xl bg-bg-elevated'
      style={{ height: 240 }}
    >
      <Image
        source={CalendarTodayIcon}
        style={{ width: 48, height: 48, tintColor: theme.textSecondary, marginBottom: 12 }}
      />
      <Text className='text-base font-bold text-text-primary text-center px-6' numberOfLines={3}>
        {title}
      </Text>
      <Text className='text-sm text-text-secondary mt-2'>{dateStr}</Text>
    </View>
  );
}

function EventDetailContent({
  event,
  rsvps,
  hasRsvpd,
  rsvping,
  onRsvpToggle,
  onShare,
  currentUser,
}: {
  event: PublicEventData & { id: string; pubkey: string };
  rsvps: { pubkey: string; name?: string; picture?: string }[];
  hasRsvpd: boolean;
  rsvping: boolean;
  onRsvpToggle: () => Promise<void>;
  onShare: () => void;
  currentUser: User | null;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const attendees = rsvps.map((r) => ({
    pubkey: r.pubkey,
    name: r.name,
    picture: r.picture,
    rsvpStatus: 'going' as const,
  }));

  return (
    <View className='flex-1 bg-bg-default'>
      <ScrollView
        className='flex-1'
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero card */}
        <HeroCard
          {...(event.image ? { imageUrl: event.image } : {})}
          title={event.title}
          startTs={event.start}
        />

        {/* Title + datetime */}
        <View className='px-5 pt-5 pb-4'>
          <Text className='text-2xl font-bold leading-tight text-text-primary'>{event.title}</Text>
          <Text className='mt-2 text-sm text-text-secondary'>
            {formatDateRange(event.start, event.end || undefined)}
          </Text>
        </View>

        {/* Action buttons */}
        <View className='flex-row items-center gap-3 px-5 pb-5'>
          {event.pubkey === currentUser?.npub ? (
            <Pressable
              onPress={() => router.push(`/event/edit/${event.id}`)}
              className='h-12 w-12 items-center justify-center rounded-full bg-bg-elevated'
              accessibilityRole='button'
              accessibilityLabel='Edit event'
            >
              <Image
                source={EditIcon}
                style={{ width: 24, height: 24, tintColor: theme.textSecondary }}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onShare}
            className='h-12 w-12 items-center justify-center rounded-full bg-bg-elevated'
            accessibilityRole='button'
            accessibilityLabel='Share event'
          >
            <Image
              source={IosShareIcon}
              style={{ width: 24, height: 24, tintColor: theme.textSecondary }}
            />
          </Pressable>
          <Pressable
            className='h-12 w-12 items-center justify-center rounded-full bg-bg-elevated'
            accessibilityRole='button'
            accessibilityLabel='More options'
          >
            <Image
              source={MoreHorizIcon}
              style={{ width: 24, height: 24, tintColor: theme.textSecondary }}
            />
          </Pressable>
        </View>

        {/* Location — only when non-empty */}
        {event.location ? (
          <View className='mx-4 mb-4 rounded-2xl bg-bg-elevated/50 p-4'>
            <SectionHeader title='Location' />
            <View className='flex-row items-center gap-2'>
              <Image
                source={LocationOnIcon}
                style={{ width: 20, height: 20, tintColor: theme.textSecondary }}
              />
              <Text className='flex-1 text-sm text-text-primary'>{event.location}</Text>
            </View>
          </View>
        ) : null}

        {/* Host */}
        <View className='mx-4 mb-4 rounded-2xl bg-bg-elevated/50 p-4'>
          <SectionHeader title='Host' />
          <View className='flex-row items-center gap-3'>
            <View className='h-10 w-10 items-center justify-center rounded-full bg-action-primary/15'>
              <Text className='text-sm font-semibold text-action-primary'>
                {event.pubkey.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className='flex-1'>
              <Text className='text-sm font-semibold text-text-primary' numberOfLines={1}>
                {event.pubkey.slice(0, 16)}…
              </Text>
              <Text className='text-xs text-text-secondary'>Event organizer</Text>
            </View>
          </View>
        </View>

        {/* Attendees — only when non-empty */}
        {attendees.length > 0 ? (
          <View className='mx-4 mb-4 rounded-2xl bg-bg-elevated/50 p-4'>
            <SectionHeader title={`${attendees.length} Going`} />
            <AttendeeList attendees={attendees} />
          </View>
        ) : null}

        {/* About — only when non-empty */}
        {event.summary ? (
          <View className='mx-4 mb-4 rounded-2xl bg-bg-elevated/50 p-4'>
            <SectionHeader title='About' />
            <Text className='text-sm leading-relaxed text-text-primary'>{event.summary}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky RSVP CTA */}
      <View
        className='border-t border-bg-elevated bg-bg-default px-4 pt-3'
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <RSVPButton isGoing={hasRsvpd} onToggle={onRsvpToggle} loading={rsvping} />
      </View>
    </View>
  );
}

export default function CircleEventDetailScreen() {
  const { eventId, circleId } = useLocalSearchParams<{ eventId: string; circleId: string }>();
  const { ndk, currentUser, signer } = useContext(NDKContext);

  const [circle, setCircle] = useState<CircleRecord | null>(null);
  const [rsvping, setRsvping] = useState(false);
  const decryptedEvent = useCircleEvent(circle, eventId ?? null);
  const rsvps = useCircleRsvps(circle, eventId ?? null);

  useEffect(
    function loadCircle() {
      if (circleId) {
        getCircle(circleId).then(setCircle);
      }
    },
    [circleId]
  );

  const rsvpsFormatted = rsvps.map((r) => ({ pubkey: r.pubkey }));
  const hasRsvpd = rsvps.some((r) => r.pubkey === currentUser?.pubkey);

  const handleRsvpToggle = async () => {
    if (!signer) {
      return;
    }
    if (!ndk || !decryptedEvent || !circle || !eventId) {
      return;
    }
    setRsvping(true);
    try {
      await publishPrivateRsvp(ndk, circle, eventId);
    } catch (error) {
      if (error instanceof Error) {
        return Alert.alert('Error', error?.message ?? 'Failed to RSVP');
      }
      Alert.alert('Error', 'Unknown error');
    } finally {
      setRsvping(false);
    }
  };

  const handleShare = useCallback(async () => {
    if (!decryptedEvent) {
      return;
    }
    try {
      await Share.share({
        message: `Join "${decryptedEvent.title}" at ${decryptedEvent.location || 'TBD'}`,
      });
    } catch {
      // Ignore share cancellation
    }
  }, [decryptedEvent]);

  if (!circle || !decryptedEvent) {
    return <EventDetailSkeleton />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EventDetailContent
        event={decryptedEvent}
        rsvps={rsvpsFormatted}
        hasRsvpd={hasRsvpd}
        rsvping={rsvping}
        onRsvpToggle={handleRsvpToggle}
        onShare={handleShare}
        currentUser={currentUser}
      />
    </>
  );
}
