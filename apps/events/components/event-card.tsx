import { PublicEventData } from '@klk/infrastructure';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@klk/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

interface Props {
  event: PublicEventData & { id: string };
}

function formatDate(ts: number) {
  if (!ts) {
    return 'TBD';
  }
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventCard({ event }: Props) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/event/${event.id}`)}>
      <Card className='mb-3 py-4'>
        <CardHeader className='px-4'>
          <CardTitle>{event.title || 'Untitled'}</CardTitle>
          <CardDescription className='text-primary'>{formatDate(event.start)}</CardDescription>
          {event.location ? <CardDescription>{event.location}</CardDescription> : null}
        </CardHeader>
        {event.summary ? (
          <CardContent className='px-4 pt-0'>
            <Text className='text-sm text-muted-foreground' numberOfLines={2}>
              {event.summary}
            </Text>
          </CardContent>
        ) : null}
      </Card>
    </Pressable>
  );
}
