import { HostedButton as Button } from '@/components/hosted-button';
import { MemberAvatar } from '@/components/member-avatar';
import { NDKContext } from '@/lib/context/ndk-context';
import { CircleRecord, deleteCircle, getCircle, saveCircle } from '@klk/infrastructure';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View, FlatList, Pressable } from 'react-native';

export default function CircleManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useContext(NDKContext);
  const router = useRouter();

  const [circle, setCircle] = useState<CircleRecord | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      getCircle(id).then((c) => {
        if (c) {
          setCircle(c);
          setName(c.name);
        }
      });
    }
  }, [id]);

  const isOwner = circle && currentUser && circle.members[0] === currentUser.pubkey;

  const handleSaveName = async () => {
    if (!circle || !name.trim()) return;
    setLoading(true);
    try {
      const updated: CircleRecord = { ...circle, name: name.trim() };
      await saveCircle(updated);
      setCircle(updated);
      Alert.alert('Success', 'Circle name updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save circle');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (pubkey: string) => {
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

  const handleLeaveOrDelete = async () => {
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
        <Text className='text-gray-400'>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView className='flex-1 bg-white p-4' keyboardShouldPersistTaps='handled'>
      <Text className='text-base font-semibold text-gray-900 mb-3'>Edit Name</Text>
      <TextInput
        className='border border-gray-200 rounded-xl p-3 text-base text-gray-900 bg-white mb-3'
        value={name}
        onChangeText={setName}
        maxLength={32}
        editable={!loading}
      />
      <Button
        label={loading ? 'Saving…' : 'Save Name'}
        variant='outlined'
        onPress={handleSaveName}
        disabled={loading || name === circle.name || !name.trim()}
      />

      <Text className='text-base font-semibold text-gray-900 mt-6 mb-3'>Members</Text>
      <FlatList
        scrollEnabled={false}
        data={circle.members}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => (
          <View className='flex-row items-center justify-between py-3 border-b border-gray-100'>
            <View className='flex-row items-center flex-1'>
              <MemberAvatar pubkey={item} size={32} />
              <Text className='text-xs font-mono text-gray-600 ml-3 flex-1' numberOfLines={1}>
                {item.slice(0, 8)}…{item.slice(-4)}
              </Text>
              {index === 0 && (
                <Text className='text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-1 ml-2'>
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
                <Text className='text-gray-400 text-lg'>✕</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      <View className='mt-6 pt-6 border-t border-gray-200'>
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
