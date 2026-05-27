import { EventForm, EventFormValues, HostedInput } from '@/components';
import { HostedButton } from '@/components/hosted-button';
import { $lastActiveTab, useCity } from '@/features';
import { NDKContext } from '@/lib/context/ndk-context';
import { createGroup, publishPublicEvent } from '@klk/infrastructure';
import { useStore } from '@nanostores/react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useContext, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

export default function AddTab() {
  const router = useRouter();
  const lastActiveTab = useStore($lastActiveTab);
  const { ndk, currentUser } = useContext(NDKContext);
  const city = useCity();

  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [submittingGroup, setSubmittingGroup] = useState(false);

  useFocusEffect(useCallback(() => {}, []));

  const handleEventSubmit = async (values: EventFormValues) => {
    if (!ndk) return;
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

  const handleGroupCreate = async () => {
    if (!groupName.trim() || !currentUser) return;
    setSubmittingGroup(true);
    try {
      await createGroup(groupName.trim(), currentUser.pubkey);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create group');
    } finally {
      setSubmittingGroup(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: lastActiveTab === 'circles' ? 'New Circle' : 'New Event',
          headerLargeTitle: false,
        }}
      />
      <ScrollView
        className='flex-1 bg-white p-4'
        contentInsetAdjustmentBehavior='automatic'
        keyboardShouldPersistTaps='handled'
      >
        {lastActiveTab === 'circles' ? (
          <>
            <Text className='text-sm font-medium text-gray-700 mb-1'>Group Name *</Text>
            <HostedInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder='e.g. Family, Book Club…'
              autoFocus
            />
            <HostedButton
              label={submittingGroup ? 'Creating…' : 'Create Group'}
              variant='filled'
              onPress={handleGroupCreate}
              disabled={submittingGroup || !groupName.trim()}
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
    </>
  );
}
