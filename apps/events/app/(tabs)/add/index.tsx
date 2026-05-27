import { EventForm, EventFormValues, HostedInput } from '@/components';
import { GuestBarrier } from '@/components/GuestBarrier';
import { HostedButton } from '@/components/hosted-button';
import { $lastActiveTab, useCity } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { createCircle, publishPublicEvent } from '@klk/infrastructure';
import { useStore } from '@nanostores/react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

export default function AddTab() {
  const router = useRouter();
  const lastActiveTab = useStore($lastActiveTab);
  const { ndk, currentUser, signer } = useContext(NDKContext);
  const city = useCity();

  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [submittingCircle, setSubmittingCircle] = useState(false);
  const [showBarrier, setShowBarrier] = useState(false);

  useFocusEffect(useCallback(() => {}, []));

  useEffect(
    function checkGuestOnFocus() {
      if (!signer) {
        setShowBarrier(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isCircle = lastActiveTab === 'circles';
  const barrierTitle = isCircle ? 'Create a circle' : 'Host your own event';
  const barrierDescription = isCircle
    ? 'Circles are private groups. You need an identity to create and invite others.'
    : 'Publish events to your city feed. You need an identity to host.';

  const handleEventSubmit = async (values: EventFormValues) => {
    if (!ndk || !signer) return;
    setSubmittingEvent(true);
    try {
      await publishPublicEvent(ndk, {
        title: values.title,
        start: Math.floor(values.start.getTime() / 1000),
        end: Math.floor(values.end.getTime() / 1000),
        location: values.location,
        summary: values.summary,
        image: values.image || undefined,
        city,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to publish event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleCircleCreate = async () => {
    if (!circleName.trim() || !currentUser) return;
    setSubmittingCircle(true);
    try {
      await createCircle(circleName.trim(), currentUser.pubkey);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create circle');
    } finally {
      setSubmittingCircle(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isCircle ? 'New Circle' : 'New Event',
          headerLargeTitle: false,
        }}
      />
      <ScrollView
        className='flex-1 bg-white p-4'
        contentInsetAdjustmentBehavior='automatic'
        keyboardShouldPersistTaps='handled'
      >
        {isCircle ? (
          <>
            <Text className='text-sm font-medium text-gray-700 mb-1'>Circle Name *</Text>
            <HostedInput
              value={circleName}
              onChangeText={setCircleName}
              placeholder='e.g. Family, Book Club…'
              maxLength={32}
              autoFocus
            />
            <HostedButton
              label={submittingCircle ? 'Creating…' : 'Create Circle'}
              variant='filled'
              onPress={handleCircleCreate}
              disabled={submittingCircle || !circleName.trim()}
            />
          </>
        ) : (
          <EventForm
            onSubmit={handleEventSubmit}
            submitting={submittingEvent}
            submitLabel='Publish Event'
          />
        )}
      </ScrollView>

      <GuestBarrier
        visible={showBarrier}
        title={barrierTitle}
        description={barrierDescription}
        ctaLabel='Create Identity'
        onGetStarted={() => {
          setShowBarrier(false);
          router.push('/identity');
        }}
        onDismiss={() => {
          setShowBarrier(false);
          router.back();
        }}
      />
    </>
  );
}
