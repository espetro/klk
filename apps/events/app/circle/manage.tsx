import { HostedButton as Button } from '@/components/hosted-button';
import { MemberAvatar } from '@/components/member-avatar';
import { NDKContext } from '@/lib/context/ndk-context';
import { CircleRecord, deleteCircle, getCircle, saveCircle } from '@klk/infrastructure';
import { CircleForm } from '@klk/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';

export default function CircleManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useContext(NDKContext);
  const router = useRouter();

  const [circle, setCircle] = useState<CircleRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      getCircle(id).then((c) => {
        if (c) {
          setCircle(c);
        }
      });
    }
  }, [id]);

  const isOwner = circle && currentUser && circle.members[0] === currentUser.pubkey;

  const handleSaveName = async (data: { name: string }) => {
    if (!circle) return;
    setLoading(true);
    try {
      const updated: CircleRecord = { ...circle, name: data.name.trim() };
      await saveCircle(updated);
      setCircle(updated);
      Alert.alert('Success', 'Circle name updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save circle');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (pubkey: string) => {
    if (!circle) return;
    Alert.alert('Remove Member', 'Remove this member from the circle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const updated: CircleRecord = {
              ...circle,
              members: circle.members.filter((m) => m !== pubkey),
            };
            await saveCircle(updated);
            setCircle(updated);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to remove member');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleLeaveOrDelete = () => {
    if (!circle) return;
    const action = isOwner ? 'Delete' : 'Leave';
    const message = isOwner
      ? 'Delete this circle? This cannot be undone.'
      : 'Leave this circle? You will lose access to it.';

    Alert.alert(action + ' Circle', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteCircle(circle.id);
            router.replace('/(tabs)/circles');
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? `Failed to ${action.toLowerCase()} circle`);
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (!circle) {
    return (
      <View className='flex-1 items-center justify-center'>
        <Text className='text-text-secondary'>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView className='flex-1 bg-bg-default p-4' keyboardShouldPersistTaps='handled'>
      <CircleForm
        onSubmit={handleSaveName}
        defaultValues={{ name: circle.name }}
        isLoading={loading}
        submitLabel='Save Name'
      />

      <Text className='text-base font-semibold text-text-primary mt-6 mb-3'>Members</Text>
      <FlatList
        scrollEnabled={false}
        data={circle.members}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => (
          <View className='flex-row items-center justify-between py-3 border-b border-secondary/10'>
            <View className='flex-row items-center flex-1'>
              <MemberAvatar pubkey={item} size={32} />
              <Text className='text-xs font-mono text-text-secondary ml-3 flex-1' numberOfLines={1}>
                {item.slice(0, 8)}…{item.slice(-4)}
              </Text>
              {index === 0 && (
                <Text className='text-xs text-text-secondary bg-bg-elevated rounded-full px-2 py-1 ml-2'>
                  Owner
                </Text>
              )}
            </View>
            {index !== 0 && (
              <Pressable
                onPress={() => handleRemoveMember(item)}
                disabled={loading}
                className='ml-2'
              >
                <Text className='text-text-secondary text-lg'>✕</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      <View className='mt-6 pt-6 border-t border-secondary/20'>
        <Button
          label={isOwner ? 'Delete Circle' : 'Leave Circle'}
          variant='outlined'
          onPress={handleLeaveOrDelete}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}
