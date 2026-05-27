import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';

import { cn } from '../lib/utils';
import { Text } from './rnr/text';

export interface Attendee {
  pubkey: string;
  name?: string | undefined;
  picture?: string | undefined;
  rsvpStatus: 'going' | 'not-going';
}

export interface AttendeeListProps {
  attendees: Attendee[];
  className?: string;
}

const AVATAR_SIZE = 36;
const AVATAR_OVERLAP = 10;
const MAX_VISIBLE_AVATARS = 5;

function truncateNpub(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 8)}…${npub.slice(-4)}`;
}

function AttendeeAvatar({
  attendee,
  size = AVATAR_SIZE,
  className,
}: {
  attendee: Attendee;
  size?: number;
  className?: string;
}) {
  const initials = (attendee.name ?? 'A').slice(0, 1).toUpperCase();

  if (attendee.picture) {
    return (
      <Image
        source={{ uri: attendee.picture }}
        className={cn('rounded-full', className)}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      className={cn('rounded-full items-center justify-center bg-bg-elevated', className)}
      style={{ width: size, height: size }}
    >
      <Text className='text-sm font-semibold text-text-secondary'>{initials}</Text>
    </View>
  );
}

function RsvpStatusBadge({ status }: { status: Attendee['rsvpStatus'] }) {
  if (status === 'going') {
    return (
      <View className='rounded-full bg-state-highlight/15 px-2.5 py-0.5'>
        <Text className='text-xs font-medium text-state-highlight'>Going</Text>
      </View>
    );
  }

  return (
    <View className='rounded-full bg-bg-elevated px-2.5 py-0.5'>
      <Text className='text-xs font-medium text-text-secondary'>Not Going</Text>
    </View>
  );
}

function AttendeeListItem({ attendee }: { attendee: Attendee }) {
  return (
    <View className='flex-row items-center gap-3 py-3'>
      <AttendeeAvatar attendee={attendee} size={40} />
      <View className='flex-1 gap-0.5'>
        <Text className='text-sm font-semibold text-text-primary' numberOfLines={1}>
          {attendee.name ?? 'Anonymous'}
        </Text>
        <Text className='text-xs text-text-secondary' numberOfLines={1}>
          {truncateNpub(attendee.pubkey)}
        </Text>
      </View>
      <RsvpStatusBadge status={attendee.rsvpStatus} />
    </View>
  );
}

export function AttendeeList({ attendees, className }: AttendeeListProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const visibleAttendees = attendees.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = attendees.length - MAX_VISIBLE_AVATARS;

  if (attendees.length === 0) {
    return (
      <View className={cn('py-2', className)}>
        <Text className='text-sm text-text-secondary'>No RSVPs yet</Text>
      </View>
    );
  }

  return (
    <>
      {/* Avatar Stack */}
      <Pressable
        onPress={() => setModalVisible(true)}
        className={cn('flex-row items-center', className)}
        accessibilityRole='button'
        accessibilityLabel={`${attendees.length} attendees, tap to view full list`}
      >
        <View className='flex-row'>
          {visibleAttendees.map((attendee, index) => (
            <View
              key={attendee.pubkey}
              style={{
                marginLeft: index > 0 ? -AVATAR_OVERLAP : 0,
                zIndex: visibleAttendees.length - index,
              }}
            >
              <AttendeeAvatar attendee={attendee} className='border-2 border-bg-default' />
            </View>
          ))}
          {overflowCount > 0 && (
            <View
              style={{
                marginLeft: -AVATAR_OVERLAP,
                zIndex: 0,
              }}
              className='h-9 items-center justify-center rounded-full bg-bg-elevated px-2.5 border-2 border-bg-default'
            >
              <Text className='text-xs font-semibold text-text-secondary'>+{overflowCount}</Text>
            </View>
          )}
        </View>
        <Text className='ml-3 text-sm text-text-secondary'>
          {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
        </Text>
      </Pressable>

      {/* Full List Modal */}
      <Modal
        animationType='slide'
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable className='flex-1 bg-black/40' onPress={() => setModalVisible(false)}>
          <View className='mt-auto rounded-t-3xl bg-bg-default max-h-[80%]'>
            {/* Handle */}
            <View className='items-center pt-3 pb-1'>
              <View className='h-1 w-10 rounded-full bg-bg-elevated' />
            </View>

            {/* Header */}
            <View className='px-5 pb-3 pt-1 flex-row items-center justify-between'>
              <Text className='text-lg font-semibold text-text-primary'>
                Attendees ({attendees.length})
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                className='rounded-full bg-bg-elevated px-3 py-1.5'
                accessibilityRole='button'
                accessibilityLabel='Close attendee list'
              >
                <Text className='text-sm font-medium text-text-secondary'>Close</Text>
              </Pressable>
            </View>

            {/* List */}
            <ScrollView
              className='px-5'
              contentInsetAdjustmentBehavior='automatic'
              showsVerticalScrollIndicator={false}
            >
              {attendees.map((attendee) => (
                <AttendeeListItem key={attendee.pubkey} attendee={attendee} />
              ))}
              <View className='h-6' />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
