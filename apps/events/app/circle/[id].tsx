import CalendarMonthIcon from '@expo/material-symbols/calendar_month.xml';
import MoreHorizIcon from '@expo/material-symbols/more_horiz.xml';
import { theme } from '@klk/ui';
import { InviteFriendSheet, EventForm, EventFormValues } from '@/components';
import { HostedButton as Button } from '@/components/hosted-button';
import { MemberAvatar } from '@/components/member-avatar';
import { useCircleEvents } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { getCircle, CircleRecord, publishPrivateEvent } from '@klk/infrastructure';
import { CircleDetailSkeleton } from '@klk/ui';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useContext, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

type Tab = 'events' | 'members' | 'info';

function formatDateIcon(ts: number): { month: string; day: string } {
  const d = new Date(ts * 1000);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
  };
}

function formatRelativeTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff > 0) {
    const days = Math.floor(diff / 86400);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  }
  const days = Math.floor(-diff / 86400);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ndk, signer } = useContext(NDKContext);
  const router = useRouter();
  const [circle, setCircle] = useState<CircleRecord | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const privateEvents = useCircleEvents(circle);

  useFocusEffect(
    useCallback(
      function loadCircle() {
        if (id) getCircle(id).then(setCircle);
      },
      [id]
    )
  );

  const handlePublishPrivateEvent = async (values: EventFormValues) => {
    if (!ndk || !circle) return;
    setSubmitting(true);
    try {
      await publishPrivateEvent(ndk, circle, {
        title: values.title,
        start: Math.floor(values.start.getTime() / 1000),
        end: Math.floor(values.end.getTime() / 1000),
        location: values.location,
        summary: values.summary,
        image: values.image || undefined,
        city: '',
      });
      setNewEventVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to publish event');
    } finally {
      setSubmitting(false);
    }
  };

  if (!circle) {
    return <CircleDetailSkeleton />;
  }

  if (newEventVisible) {
    return (
      <View className='flex-1'>
        <EventForm
          onSubmit={handlePublishPrivateEvent}
          submitting={submitting}
          submitLabel='Publish to Circle'
        />
      </View>
    );
  }

  const initials = circle.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'members', label: 'Members' },
    { key: 'info', label: 'Info' },
  ];

  return (
    <ScrollView className='flex-1 bg-bg-default'>
      {/* Header */}
      <View className='flex-row items-center gap-4 px-5 pt-5 pb-4'>
        <View className='h-16 w-16 items-center justify-center rounded-2xl bg-action-primary/15'>
          <Text className='text-xl font-bold text-action-primary'>{initials || '○'}</Text>
        </View>
        <View className='flex-1'>
          <Text className='text-xl font-bold text-text-primary'>{circle.name}</Text>
          <Text className='mt-0.5 text-sm text-text-secondary'>
            {circle.members.length} member{circle.members.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {ndk && signer ? (
          <View className='flex-row items-center gap-2'>
            <Button label='Invite' variant='outlined' onPress={() => setInviteVisible(true)} />
            <Pressable
              onPress={() => router.push(`/circle/manage?id=${id}`)}
              className='h-12 w-12 items-center justify-center rounded-full bg-bg-elevated'
              accessibilityRole='button'
              accessibilityLabel='Manage circle'
            >
              <Image source={MoreHorizIcon} style={{ width: 24, height: 24, tintColor: theme.textSecondary }} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Tab bar */}
      <View className='flex-row gap-2 px-5 pb-4'>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 ${
              activeTab === tab.key ? 'bg-text-primary' : 'bg-bg-elevated'
            }`}
            accessibilityRole='tab'
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === tab.key ? 'text-text-inverse' : 'text-text-secondary'
              }`}
            >
              {tab.label}
              {tab.key === 'events' && privateEvents.length > 0 ? ` (${privateEvents.length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'events' ? (
        <View>
          {/* Section: Upcoming */}
          {privateEvents.filter((e) => e.start > Math.floor(Date.now() / 1000)).length > 0 ? (
            <View>
              <View className='px-5 py-2'>
                <Text className='text-xs font-semibold uppercase tracking-wider text-text-secondary'>
                  Upcoming
                </Text>
              </View>
              {privateEvents
                .filter((e) => e.start > Math.floor(Date.now() / 1000))
                .map((e) => {
                  const { month, day } = formatDateIcon(e.start);
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => router.push(`/event/${e.id}`)}
                      className='flex-row items-center gap-3 px-5 py-3 active:bg-bg-elevated/50'
                      accessibilityRole='button'
                    >
                      <View className='h-12 w-12 items-center justify-center rounded-xl bg-action-primary/15'>
                        <Text className='text-[9px] font-bold text-action-primary'>{month}</Text>
                        <Text className='text-base font-bold leading-tight text-action-primary'>
                          {day}
                        </Text>
                      </View>
                      <View className='flex-1'>
                        <Text className='text-sm font-semibold text-text-primary' numberOfLines={1}>
                          {e.title}
                        </Text>
                        <Text className='text-xs text-text-secondary'>
                          {formatRelativeTime(e.start)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          ) : null}

          {/* Section: Past */}
          {privateEvents.filter((e) => e.start <= Math.floor(Date.now() / 1000)).length > 0 ? (
            <View>
              <View className='px-5 py-2'>
                <Text className='text-xs font-semibold uppercase tracking-wider text-text-secondary'>
                  Past
                </Text>
              </View>
              {privateEvents
                .filter((e) => e.start <= Math.floor(Date.now() / 1000))
                .map((e) => {
                  const { month, day } = formatDateIcon(e.start);
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => router.push(`/event/${e.id}`)}
                      className='flex-row items-center gap-3 px-5 py-3 active:bg-bg-elevated/50'
                      accessibilityRole='button'
                    >
                      <View className='h-12 w-12 items-center justify-center rounded-xl bg-bg-elevated'>
                        <Text className='text-[9px] font-bold text-text-secondary'>{month}</Text>
                        <Text className='text-base font-bold leading-tight text-text-secondary'>
                          {day}
                        </Text>
                      </View>
                      <View className='flex-1'>
                        <Text
                          className='text-sm font-semibold text-text-secondary'
                          numberOfLines={1}
                        >
                          {e.title}
                        </Text>
                        <Text className='text-xs text-text-secondary'>
                          {formatRelativeTime(e.start)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          ) : null}

          {/* Empty state */}
          {privateEvents.length === 0 ? (
            <View className='items-center py-16 gap-3'>
              <Image source={CalendarMonthIcon} style={{ width: 48, height: 48, tintColor: '#5C554D' }} />
              <Text className='text-base font-semibold text-text-primary'>No events yet</Text>
              {ndk && signer ? (
                <Pressable
                  onPress={() => setNewEventVisible(true)}
                  className='mt-1 rounded-full bg-action-primary px-5 py-2.5'
                  accessibilityRole='button'
                >
                  <Text className='text-sm font-semibold text-text-inverse'>Create Event</Text>
                </Pressable>
              ) : null}
            </View>
          ) : ndk && signer ? (
            <View className='px-5 pt-3 pb-5'>
              <Button
                label='+ New Event'
                variant='filled'
                onPress={() => setNewEventVisible(true)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'members' ? (
        <View className='px-5 pb-5'>
          {circle.members.length === 0 ? (
            <View className='items-center py-16'>
              <Text className='text-text-secondary'>No members yet</Text>
            </View>
          ) : (
            <View className='flex-row flex-wrap gap-4'>
              {circle.members.map((m) => (
                <View key={m} className='items-center gap-1.5'>
                  <MemberAvatar pubkey={m} size={56} />
                  <Text className='text-[10px] font-mono text-text-secondary' numberOfLines={1}>
                    {m.slice(0, 8)}…{m.slice(-4)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {ndk && signer ? (
            <View className='mt-4'>
              <Button
                label='+ Invite Member'
                variant='outlined'
                onPress={() => setInviteVisible(true)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'info' ? (
        <View className='px-5 pb-5'>
          <Text className='text-sm text-text-secondary'>
            Private circle · {circle.members.length} member{circle.members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}

      {inviteVisible && ndk && signer ? (
        <InviteFriendSheet
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          ndk={ndk}
          signer={signer}
          circle={circle}
          onCircleUpdated={(c) => setCircle(c)}
        />
      ) : null}
    </ScrollView>
  );
}
