import { HostedButton as Button } from "@/components/hosted-button";
import { HostedInput as Input } from "@/components/hosted-input";
import { BottomSheet } from "@expo/ui";
import { GroupRecord, inviteToGroup } from "@klk/infrastructure";
import NDK, { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-mobile";
import { useState } from "react";
import { Text, View } from "react-native";

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
    <BottomSheet isPresented={visible} onDismiss={onClose}>
      <Text className="text-lg font-bold text-gray-900 mb-4">Invite a Friend</Text>
      <Input
        value={npub}
        onChangeText={setNpub}
        placeholder="npub1… or hex pubkey"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text className="text-red-500 text-sm mb-2">{error}</Text> : null}
      <View className="mt-2">
        <Button
          label={loading ? "Sending…" : "Send Invite"}
          variant={loading || !npub.trim() ? "outlined" : "filled"}
          onPress={handleInvite}
          disabled={loading || !npub.trim()}
        />
      </View>
      <View className="mt-3">
        <Button label="Cancel" variant="text" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
