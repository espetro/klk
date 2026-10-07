import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Button, Text, XStack, YStack } from "tamagui";
import { $connected, $identity, storedUnlockMode } from "@klk/core";
import { npubEncode } from "@klk/proto";
import { Field, palette } from "@klk/ui";
import { signOut } from "../src/boot.ts";
import { RELAY_URL } from "../src/config.ts";
import { notify } from "../src/notify.ts";

export default function Profile() {
  const identity = useStore($identity);
  const connected = useStore($connected);
  // PWA notifications probe: OS-level push needs a push service we don't
  // run yet — this captures the permission state honestly.
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

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
      <Field label="Unlocked by">
        <Text fontSize={14} color={palette.ink}>
          {storedUnlockMode() === "passkey"
            ? "Your passkey"
            : "This device only — no passkey saved"}
        </Text>
      </Field>
      <Field label="Notifications">
        {perm === "unsupported" ? (
          <Text fontSize={13} color={palette.muted}>
            This browser can't do push notifications yet.
          </Text>
        ) : perm === "granted" ? (
          <Text fontSize={13} color={palette.pastelGreenInk}>
            On — you'll hear about new events here.
          </Text>
        ) : (
          <YStack gap="$2">
            <Text fontSize={13} color={palette.muted}>
              {perm === "denied"
                ? "Blocked — enable them in your browser's site settings."
                : "Get a nudge when circles you follow post events."}
            </Text>
            {perm === "default" ? (
              <Button
                size="$3"
                borderRadius={6}
                borderWidth={1}
                borderColor={palette.border}
                backgroundColor={palette.surface}
                color={palette.ink}
                onPress={() => {
                  void Notification.requestPermission().then((p) => {
                    setPerm(p);
                    if (p === "granted") notify("Notifications on");
                  });
                }}
              >
                Enable notifications
              </Button>
            ) : null}
          </YStack>
        )}
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
