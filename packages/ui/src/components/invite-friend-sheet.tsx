import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import NDK from "@nostr-dev-kit/ndk-mobile";
import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-mobile";
import { GroupRecord } from "@klk/infrastructure";
import { inviteToGroup } from "@klk/infrastructure";

interface Props {
  visible: boolean;
  onClose: () => void;
  ndk: NDK;
  signer: NDKPrivateKeySigner;
  group: GroupRecord;
  onGroupUpdated: (g: GroupRecord) => void;
}

export function InviteFriendSheet({ visible, onClose, ndk, signer, group, onGroupUpdated }: Props) {
  const [npub, setNpub] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!npub.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let pubkey = npub.trim();
      if (pubkey.startsWith("npub")) {
        const { nip19 } = await import("nostr-tools");
        pubkey = (nip19.decode(pubkey) as any).data as string;
      }
      await inviteToGroup(ndk, signer, group, pubkey);
      const updated: GroupRecord = {
        ...group,
        members: [...new Set([...group.members, pubkey])],
      };
      onGroupUpdated(updated);
      setNpub("");
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
      >
        <View className="bg-white rounded-t-2xl p-6 shadow-xl">
          <Text className="text-lg font-bold text-gray-900 mb-4">Invite a Friend</Text>
          <TextInput
            className="border border-gray-200 rounded-lg p-3 mb-2 text-gray-900"
            value={npub}
            onChangeText={setNpub}
            placeholder="npub1… or hex pubkey"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text className="text-red-500 text-sm mb-2">{error}</Text> : null}
          <Pressable
            className={`rounded-xl p-4 items-center mt-2 ${loading || !npub.trim() ? "bg-gray-300" : "bg-indigo-600"}`}
            onPress={handleInvite}
            disabled={loading || !npub.trim()}
          >
            <Text className="text-white font-semibold">{loading ? "Sending…" : "Send Invite"}</Text>
          </Pressable>
          <Pressable className="items-center mt-3 p-2" onPress={onClose}>
            <Text className="text-gray-500">Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
