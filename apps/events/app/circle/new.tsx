import { HostedButton as Button } from '@/components/hosted-button';
import { NDKContext } from '@/lib/context/ndk-context';
import { createCircle } from '@klk/infrastructure';
import { Stack, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Alert, ScrollView, Text, TextInput } from 'react-native';

export default function NewCircleScreen() {
  const { currentUser } = useContext(NDKContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim() || !currentUser) return;
    setLoading(true);
    try {
      await createCircle(name.trim(), currentUser.pubkey);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create circle');
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
        <Text className='text-sm font-medium text-gray-700 mb-1'>Circle Name *</Text>
        <TextInput
          className='border border-gray-200 rounded-lg p-3 mb-1 text-gray-900'
          value={name}
          onChangeText={setName}
          placeholder='e.g. Family, Book Club…'
          maxLength={32}
          autoFocus
        />
        <Text className='text-xs text-gray-400 text-right mb-6'>{name.length}/32</Text>
        <Button
          label={loading ? 'Creating…' : 'Create Circle'}
          variant='filled'
          onPress={handleCreate}
          disabled={loading || !name.trim()}
        />
      </ScrollView>
    </>
  );
}
