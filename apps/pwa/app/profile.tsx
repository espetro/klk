import { useStore } from "@nanostores/react";
import { Button, Text, XStack, YStack } from "tamagui";
import { $connected, $identity } from "@klk/core";
import { npubEncode } from "@klk/proto";
import { Field, palette } from "@klk/ui";
import { signOut } from "../src/boot.ts";
import { RELAY_URL } from "../src/config.ts";

export default function Profile() {
  const identity = useStore($identity);
  const connected = useStore($connected);

  return (
    <YStack gap="$5" paddingTop="$6">
      <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
        Profile
      </Text>
      <Field label="Identity (npub)">
        <Text fontSize={13} color={palette.ink} fontFamily="$mono" selectable>
          {identity !== null ? npubEncode(identity.pubkey) : "not signed in"}
        </Text>
      </Field>
      <XStack gap="$2" alignItems="center">
        <YStack
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={connected ? "#346538" : "#9F2F2D"}
        />
        <Text fontSize={13} color={palette.muted}>
          {connected ? "Connected" : "Disconnected"} · {RELAY_URL}
        </Text>
      </XStack>
      <Button
        borderRadius={6}
        borderWidth={1}
        borderColor={palette.border}
        backgroundColor={palette.surface}
        color={palette.ink}
        onPress={() => {
          void signOut().then(() => location.reload());
        }}
      >
        Sign out of this device
      </Button>
    </YStack>
  );
}
