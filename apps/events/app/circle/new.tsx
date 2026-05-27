import { NDKContext } from '@/lib/context/ndk-context';
import { createCircle } from '@klk/infrastructure';
import { CircleForm } from '@klk/ui';
import { Stack, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Alert, ScrollView } from 'react-native';

export default function NewCircleScreen() {
  const { currentUser } = useContext(NDKContext);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (data: { name: string }) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const newCircle = await createCircle(data.name.trim(), currentUser.pubkey);
      router.replace(`/circle/${newCircle.id}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create circle');
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
        className='flex-1 bg-bg-default p-4'
        contentInsetAdjustmentBehavior='automatic'
        keyboardShouldPersistTaps='handled'
      >
        <CircleForm onSubmit={handleCreate} isLoading={loading} submitLabel='Create Circle' />
      </ScrollView>
    </>
  );
}
