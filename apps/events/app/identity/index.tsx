import { NDKContext } from '@/lib/context/ndk-context';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateIdentity } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Clipboard, Pressable, ScrollView, Text, View } from 'react-native';

export default function IdentityScreen() {
  const router = useRouter();
  const { attachIdentity } = useContext(NDKContext);

  const [npub, setNpub] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(function generateIdentity() {
    (async () => {
      try {
        const signer = await getOrCreateIdentity();
        const user = await signer.user();
        setNpub(user.npub);
        setPrivateKey(signer.privateKey ?? null);
      } catch {
        Alert.alert('Error', 'Failed to generate identity. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyPrivateKey = useCallback(() => {
    if (!privateKey) return;
    Clipboard.setString(privateKey);
    Alert.alert('Copied', 'Private key copied to clipboard. Store it somewhere safe.');
  }, [privateKey]);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      await attachIdentity();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to activate identity.');
    } finally {
      setSaving(false);
    }
  }, [attachIdentity, router]);

  if (loading) {
    return (
      <View className='flex-1 items-center justify-center bg-gray-50'>
        <Text className='text-gray-400'>Generating your identity…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className='flex-1 bg-gray-50'
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={{ padding: 24 }}
    >
      <View className='items-center mb-8 mt-4'>
        <View className='w-20 h-20 bg-indigo-50 rounded-2xl items-center justify-center mb-4'>
          <Ionicons name='key-outline' size={40} color='#4f46e5' />
        </View>
        <Text className='text-2xl font-bold text-gray-900 text-center mb-2'>Your Identity</Text>
        <Text className='text-base text-gray-500 text-center leading-relaxed'>
          Klk uses Nostr — your identity is a keypair that lives on your device.
        </Text>
      </View>

      <Text className='text-sm font-medium text-gray-500 mb-1'>Public Key (npub)</Text>
      <View className='bg-white rounded-xl p-4 mb-4 border border-gray-100'>
        <Text className='text-xs text-gray-700 font-mono' numberOfLines={2}>
          {npub}
        </Text>
      </View>

      <Text className='text-sm font-medium text-gray-500 mb-1'>Private Key</Text>
      <View className='bg-white rounded-xl p-4 mb-2 border border-gray-100'>
        <Text
          className='text-xs text-gray-700 font-mono'
          numberOfLines={keyVisible ? undefined : 1}
        >
          {keyVisible ? privateKey : '••••••••••••••••••••••••••••••••••••••••••••'}
        </Text>
        <Pressable onPress={() => setKeyVisible((v) => !v)} className='mt-2'>
          <Text className='text-xs text-indigo-600'>
            {keyVisible ? 'Hide private key' : 'Tap to reveal'}
          </Text>
        </Pressable>
      </View>

      <View className='flex-row items-start bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100'>
        <Ionicons name='warning-outline' size={20} color='#d97706' style={{ marginTop: 1 }} />
        <Text className='text-sm text-amber-800 ml-3 flex-1 leading-relaxed'>
          Save your private key somewhere safe. If you lose it, your identity cannot be recovered.
        </Text>
      </View>

      <Pressable
        onPress={copyPrivateKey}
        className='bg-gray-100 rounded-xl py-4 mb-3 active:opacity-80'
      >
        <Text className='text-gray-900 text-center text-base font-medium'>Copy Private Key</Text>
      </Pressable>

      <Pressable
        onPress={handleConfirm}
        disabled={saving}
        className='bg-gray-900 rounded-xl py-4 active:opacity-90'
      >
        <Text className='text-white text-center text-base font-semibold'>
          {saving ? 'Activating…' : "I've Saved It"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
