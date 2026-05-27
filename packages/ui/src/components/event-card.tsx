import { Image, Pressable, View } from 'react-native';

import { cn } from '../lib/utils';
import { Text } from './rnr/text';

export type RsvpStatus = 'going' | 'maybe' | 'not_going' | null;

export interface EventCardData {
  id: string;
  title: string;
  description?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  location?: string | undefined;
  imageUrl?: string | undefined;
  attendeeCount: number;
  rsvpStatus?: RsvpStatus | undefined;
  hostName?: string | undefined;
  hostAvatarUrl?: string | undefined;
}

export interface EventCardProps {
  event: EventCardData;
  onPress?: ((event: EventCardData) => void) | undefined;
  className?: string | undefined;
}

function formatTime(startTs: number, endTs?: number): string {
  const start = new Date(startTs * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (!endTs) return start;
  const end = new Date(endTs * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${start} – ${end}`;
}

function RsvpBadge({ status }: { status: RsvpStatus }) {
  if (!status) return null;

  const config: Record<Exclude<RsvpStatus, null>, { label: string; className: string }> = {
    going: { label: 'Going', className: 'bg-state-highlight/15 text-state-highlight' },
    maybe: { label: 'Maybe', className: 'bg-action-secondary/15 text-action-secondary' },
    not_going: { label: 'Not going', className: 'bg-bg-elevated text-text-secondary' },
  };

  const { label, className } = config[status];
  return (
    <View className={cn('rounded-full px-2.5 py-0.5', className)}>
      <Text className='text-xs font-medium'>{label}</Text>
    </View>
  );
}

export function EventCard({ event, onPress, className }: EventCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(event)}
      className={cn(
        'flex-row items-start gap-3 bg-bg-default px-4 py-3',
        'active:bg-bg-elevated/50',
        className
      )}
      accessibilityRole='button'
      accessibilityLabel={event.title}
    >
      {/* Thumbnail — 80×80 */}
      {event.imageUrl ? (
        <View className='h-20 w-20 overflow-hidden rounded-xl'>
          <Image
            source={{ uri: event.imageUrl }}
            className='h-20 w-20'
            resizeMode='cover'
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : (
        <View className='h-20 w-20 items-center justify-center rounded-xl bg-bg-elevated'>
          <Text className='text-2xl'>📅</Text>
        </View>
      )}

      {/* Content */}
      <View className='flex-1 gap-1.5'>
        {/* Host row */}
        {event.hostName ? (
          <View className='flex-row items-center gap-1.5'>
            {event.hostAvatarUrl ? (
              <Image
                source={{ uri: event.hostAvatarUrl }}
                className='h-4 w-4 rounded-full'
                resizeMode='cover'
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className='h-4 w-4 items-center justify-center rounded-full bg-action-primary/15'>
                <Text className='text-[8px] font-semibold text-action-primary'>
                  {event.hostName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text className='text-xs text-text-secondary' numberOfLines={1}>
              {event.hostName}
            </Text>
          </View>
        ) : null}

        {/* Title + RSVP badge */}
        <View className='flex-row items-start justify-between gap-2'>
          <Text
            className='flex-1 text-sm font-semibold leading-snug text-text-primary'
            numberOfLines={2}
          >
            {event.title}
          </Text>
          {event.rsvpStatus ? <RsvpBadge status={event.rsvpStatus} /> : null}
        </View>

        {/* Time */}
        <Text className='text-xs text-text-secondary'>
          {formatTime(event.startTime, event.endTime)}
        </Text>

        {/* Location — hidden when absent */}
        {event.location ? (
          <Text className='text-xs text-text-secondary' numberOfLines={1}>
            {event.location}
          </Text>
        ) : null}

        {/* Attendee count — hidden when zero */}
        {event.attendeeCount > 0 ? (
          <View className='h-5 self-start flex-row items-center rounded-full bg-bg-elevated px-2'>
            <Text className='text-xs font-medium text-text-secondary'>
              {event.attendeeCount} {event.attendeeCount === 1 ? 'going' : 'going'}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
