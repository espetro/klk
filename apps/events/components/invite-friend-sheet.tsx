import { HostedButton as Button } from '@/components/hosted-button';
import { HostedInput as Input } from '@/components/hosted-input';
import { BottomSheet } from '@expo/ui';
import {
  CircleRecord,
  inviteToCircle,
  NDKMock as NDK,
  NDKPrivateKeySigner,
} from '@klk/infrastructure';
import { useState } from 'react';
import { Clipboard, Pressable, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  ndk: NDK;
  signer: NDKPrivateKeySigner;
  circle: CircleRecord;
  onCircleUpdated: (c: CircleRecord) => void;
}

function isValidNpub(str: string): boolean {
  if (str.startsWith('npub1') && str.length > 50) return true;
  if (/^[0-9a-f]{64}$/.test(str)) return true;
  return false;
}

export function InviteFriendSheet({
  visible,
  onClose,
  ndk,
  signer,
  circle,
  onCircleUpdated,
}: Props) {
  const [npub, setNpub] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!npub.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let pubkey = npub.trim();
      if (pubkey.startsWith('npub')) {
        const { nip19 } = await import('nostr-tools');
        pubkey = (nip19.decode(pubkey) as any).data as string;
      }
      await inviteToCircle(ndk, signer, circle, pubkey);
      const updated: CircleRecord = {
        ...circle,
        members: [...new Set([...circle.members, pubkey])],
      };
      onCircleUpdated(updated);
      setNpub('');
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCircleId = () => {
    Clipboard.setString(circle.id);
  };

  const isValidInput = isValidNpub(npub.trim());

  return (
    <BottomSheet isPresented={visible} onDismiss={onClose}>
      <Text className='text-lg font-bold text-gray-900 mb-4'>Invite a Member</Text>

      <Pressable
        onPress={handleCopyCircleId}
        className='bg-gray-50 rounded-lg p-3 mb-4 flex-row items-center justify-between'
      >
        <Text className='text-sm text-gray-600'>Copy Circle ID</Text>
        <Text className='text-xs text-gray-400 font-mono'>{circle.id.slice(0, 8)}…</Text>
      </Pressable>

      <Text className='text-sm font-medium text-gray-700 mb-2'>Member's npub or public key</Text>
      <Input
        value={npub}
        onChangeText={setNpub}
        placeholder='npub1… or hex pubkey'
        autoCapitalize='none'
        autoCorrect={false}
        editable={!loading}
      />
      {npub && !isValidInput && (
        <Text className='text-red-500 text-xs mt-1 mb-2'>Invalid npub or public key format</Text>
      )}
      {error && <Text className='text-red-500 text-sm mb-2'>{error}</Text>}

      <View className='mt-4'>
        <Button
          label={loading ? 'Sending…' : 'Send Invite'}
          variant={loading || !isValidInput ? 'outlined' : 'filled'}
          onPress={handleInvite}
          disabled={loading || !isValidInput}
        />
      </View>
      <View className='mt-3'>
        <Button label='Cancel' variant='text' onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
