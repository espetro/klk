import { NDKContext } from '@/lib/context/ndk-context';
import { parsePublicEvent, publishPublicEvent } from '@klk/infrastructure';
import { EventForm, EventDetailSkeleton } from '@klk/ui';
import type { EventFormValues } from '@klk/ui';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ndk } = useContext(NDKContext);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(
    function loadEvent() {
      if (!ndk || !id) {
        return;
      }
      setLoading(true);
      ndk.fetchEvent(id).then((e) => {
        if (!e) {
          setLoading(false);
          return;
        }
        const parsed = parsePublicEvent(e);
        setEvent({ ...parsed, id: e.id, pubkey: e.pubkey });
        setLoading(false);
      });
    },
    [ndk, id]
  );

  const handleSubmit = async (values: EventFormValues) => {
    if (!ndk || !event) {
      return;
    }
    setSubmitting(true);
    try {
      await publishPublicEvent(ndk, {
        title: values.title,
        start: Math.floor(values.startDate.getTime() / 1000),
        end: Math.floor(values.endDate.getTime() / 1000),
        location: values.location ?? undefined,
        summary: values.description ?? undefined,
        image: values.imageUrl ?? undefined,
        city: event.city || '',
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update event');
    } finally {
      setSubmitting(false);
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
      {event ? (
        <EventForm
          onSubmit={handleSubmit}
          isLoading={submitting}
          defaultValues={{
            title: event.title,
            startDate: new Date(event.start * 1000),
            endDate: new Date((event.end || event.start) * 1000),
            location: event.location,
            description: event.summary,
            imageUrl: event.image,
          }}
        />
      ) : null}
    </>
  );
}
