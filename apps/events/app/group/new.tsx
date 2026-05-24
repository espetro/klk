import { HostedButton as Button } from '@/components/hosted-button';
import { NDKContext } from '@/lib/context/ndk-context';
import { createGroup } from '@klk/infrastructure';
import { Stack, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Alert, ScrollView, Text, TextInput } from 'react-native';

export default function NewGroupScreen() {
  const { currentUser } = useContext(NDKContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim() || !currentUser) return;
    setLoading(true);
    try {
      await createGroup(name.trim(), currentUser.pubkey);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create group');
    } finally {
      setLoading(false);
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
      <ScrollView
        className='flex-1 bg-white p-4'
        contentInsetAdjustmentBehavior='automatic'
        keyboardShouldPersistTaps='handled'
      >
        <Text className='text-sm font-medium text-gray-700 mb-1'>Group Name *</Text>
        <TextInput
          className='border border-gray-200 rounded-lg p-3 mb-6 text-gray-900'
          value={name}
          onChangeText={setName}
          placeholder='e.g. Family, Book Club…'
          autoFocus
        />
        <Button
          label={loading ? 'Creating…' : 'Create Group'}
          variant='filled'
          onPress={handleCreate}
          disabled={loading || !name.trim()}
        />
      </ScrollView>
    </>
  );
}
