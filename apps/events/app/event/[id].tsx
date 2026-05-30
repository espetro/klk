import { GuestBarrier } from '@/components/GuestBarrier';
import { useRsvps, useEventDetail, useFeatureFlag } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import CalendarTodayIcon from '@expo/material-symbols/calendar_today.xml';
import EditIcon from '@expo/material-symbols/edit.xml';
import IosShareIcon from '@expo/material-symbols/ios_share.xml';
import LocationOnIcon from '@expo/material-symbols/location_on.xml';
import MoreHorizIcon from '@expo/material-symbols/more_horiz.xml';
import { User } from '@klk/core';
import {
  parsePublicEvent,
  PublicEventData,
  buildEventCoordinate,
  publishRsvp,
} from '@klk/infrastructure';
import { theme, AttendeeList, RSVPButton, EventDetailSkeleton } from '@klk/ui';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
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

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ndk, currentUser, signer } = useContext(NDKContext);
  const { getFlag } = useFeatureFlag();
  const useNewArch = getFlag('useNewArchitecture');
  const router = useRouter();

  const [event, setEvent] = useState<(PublicEventData & { id: string; pubkey: string }) | null>(
    null
  );
  const [coordinate, setCoordinate] = useState('');
  const [rsvping, setRsvping] = useState(false);
  const [showBarrier, setShowBarrier] = useState(false);
  const rsvps = useRsvps(coordinate);

  useEffect(
    function loadEventDetail() {
      if (!ndk || !id) {
        return;
      }
      ndk.fetchEvent(id).then((e) => {
        if (!e) {
          return;
        }
        const parsed = parsePublicEvent(e);
        setEvent(parsed);
        setCoordinate(buildEventCoordinate(e));
      });
    },
    [ndk, id]
  );

  const hasRsvpd = rsvps.some((r) => r.pubkey === currentUser?.pubkey);

  const handleRsvpToggle = async () => {
    if (!signer) {
      setShowBarrier(true);
      return;
    }
    if (!ndk || !coordinate) {
      return;
    }

    // Only support RSVP-ing, no un-RSVP yet
    if (hasRsvpd) {
      return;
    }

    setRsvping(true);
    try {
      await publishRsvp(ndk, coordinate);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'RSVP failed';
      Alert.alert('Error', message);
      throw e;
    } finally {
      setRsvping(false);
    }
  };

  const handleShare = async () => {
    if (!event) {
      return;
    }
    try {
      await Share.share({
        message: `${event.title}\n${formatDateRange(event.start, event.end || undefined)}\n${event.location || ''}`,
      });
    } catch {
      // user cancelled
    }
  };

  if (useNewArch && id) {
    return <NewEventDetail eventId={id} />;
  }

  if (!event) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <EventDetailSkeleton />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <EventDetailContent
        event={event}
        rsvps={rsvps}
        hasRsvpd={hasRsvpd}
        rsvping={rsvping}
        onRsvpToggle={handleRsvpToggle}
        onShare={handleShare}
        currentUser={currentUser}
      />
      <GuestBarrier
        visible={showBarrier}
        title='RSVP to save your spot'
        description='Klk uses Nostr — your identity is a keypair that lives on your device. No email or password needed.'
        ctaLabel='Create Identity'
        onGetStarted={() => {
          setShowBarrier(false);
          router.push('/identity');
        }}
        onDismiss={() => setShowBarrier(false)}
      />
    </>
  );
}

function NewEventDetail({ eventId }: { eventId: string }) {
  const { currentUser, signer } = useContext(NDKContext);
  const router = useRouter();
  const [showBarrier, setShowBarrier] = useState(false);
  const { event, loading, error, rsvp, rsvping, hasRsvpd } = useEventDetail(
    eventId,
    currentUser ? ({ npub: currentUser.pubkey } as User) : null
  );

  const handleRsvpToggle = async () => {
    if (!signer) {
      setShowBarrier(true);
      return;
    }
    await rsvp();
  };

  const handleShare = async () => {
    if (!event) {
      return;
    }
    try {
      await Share.share({
        message: `${event.title}\n${formatDateRange(event.start, event.end || undefined)}\n${event.location || ''}`,
      });
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <EventDetailSkeleton />
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <View className='flex-1 items-center justify-center gap-4 bg-bg-default'>
          <Text className='text-center text-sm text-text-secondary'>
            {error ?? 'Event not found'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className='rounded-full bg-bg-elevated px-5 py-2.5'
            accessibilityRole='button'
          >
            <Text className='text-sm font-semibold text-text-primary'>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const legacyEvent: PublicEventData & { id: string; pubkey: string } = {
    id: event.id,
    pubkey: event.pubkey,
    title: event.title,
    start: event.start,
    end: event.end || 0,
    location: event.location || '',
    summary: event.summary || '',
    image: undefined,
    city: '',
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <EventDetailContent
        event={legacyEvent}
        rsvps={[]}
        hasRsvpd={hasRsvpd}
        rsvping={rsvping}
        onRsvpToggle={handleRsvpToggle}
        onShare={handleShare}
        currentUser={currentUser}
      />
      <GuestBarrier
        visible={showBarrier}
        title='RSVP to save your spot'
        description='Klk uses Nostr — your identity is a keypair that lives on your device. No email or password needed.'
        ctaLabel='Create Identity'
        onGetStarted={() => {
          setShowBarrier(false);
          router.push('/identity');
        }}
        onDismiss={() => setShowBarrier(false)}
      />
    </>
  );
}
