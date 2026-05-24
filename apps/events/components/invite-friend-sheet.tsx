import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Text, View } from "react-native";
import { Button, Input } from "@klk/ui";
import NDK, { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-mobile";
import { GroupRecord, inviteToGroup } from "@klk/infrastructure";

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
          <Input
            className="mb-2"
            value={npub}
            onChangeText={setNpub}
            placeholder="npub1… or hex pubkey"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text className="text-red-500 text-sm mb-2">{error}</Text> : null}
          <Button
            className="mt-2"
            variant={loading || !npub.trim() ? "secondary" : "default"}
            onPress={handleInvite}
            disabled={loading || !npub.trim()}
          >
            <Text className="text-sm font-semibold">{loading ? "Sending…" : "Send Invite"}</Text>
          </Button>
          <Button className="mt-3" variant="ghost" onPress={onClose}>
            <Text className="text-gray-500 text-sm">Cancel</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
