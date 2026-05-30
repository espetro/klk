import { useCity } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { publishPublicEvent } from '@klk/infrastructure';
import { EventForm } from '@klk/ui';
import type { EventFormValues } from '@klk/ui';
import { Stack, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Alert } from 'react-native';

export default function NewEventScreen() {
  const { ndk } = useContext(NDKContext);
  const city = useCity();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: EventFormValues) => {
    if (!ndk) {
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
        city,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? (error.message ?? 'Failed to publish event') : 'Failed to publish event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <EventForm onSubmit={handleSubmit} isLoading={submitting} />
    </>
  );
}
