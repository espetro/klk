import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Link } from "one";
import { Button, Spinner, Text, YStack } from "tamagui";
import { palette } from "@klk/ui";
import { $bootError, $bootState, $unlockMode, createAndConnect, unlock } from "../src/boot.ts";
import { Discover } from "../src/discover.tsx";

const WELCOMED = "klk.welcomed";

export default function Home() {
  const state = useStore($bootState);
  const err = useStore($bootError);
  const unlockMode = useStore($unlockMode);
  // post-create welcome shows once, right after identity creation
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return localStorage.getItem(WELCOMED) === "1";
    } catch {
      return true;
    }
  });

  if (state === "onboarding") {
    return (
      <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
        <YStack gap="$2">
          <Text fontSize={32} fontWeight="700" color={palette.ink} letterSpacing={-0.5}>
            Klk
          </Text>
          <Text fontSize={15} color={palette.muted} lineHeight={22}>
            Plans with the people around you — private by default.
          </Text>
          <Text fontSize={15} color={palette.muted} lineHeight={22}>
            Create an identity to get started. Your device will ask to save a passkey — that's what
            unlocks you here, no passwords.
          </Text>
        </YStack>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => void createAndConnect()}
        >
          Create identity
        </Button>
        {err !== undefined ? (
          <Text fontSize={13} color="#9F2F2D">
            {err}
          </Text>
        ) : null}
      </YStack>
    );
  }

  if (state === "locked") {
    return (
      <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          Welcome back
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          Your identity is protected by the passkey on this device.
        </Text>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => void unlock()}
        >
          Unlock with passkey
        </Button>
        {err !== undefined ? (
          <Text fontSize={13} color="#9F2F2D">
            {err}
          </Text>
        ) : null}
      </YStack>
    );
  }

  if (state !== "ready") {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingVertical="$8">
        <Spinner size="large" color={palette.muted} />
        {state === "error" ? (
          <YStack gap="$2" alignItems="center">
            <Text fontSize={13} color="#9F2F2D" textAlign="center">
              {err ?? "Could not reach the relay."}
            </Text>
            <Link href="/profile">
              <Text fontSize={13} color={palette.ink} textDecorationLine="underline">
                Connection settings
              </Text>
            </Link>
          </YStack>
        ) : (
          <Text fontSize={13} color={palette.muted}>
            {state === "connecting" ? "Connecting…" : "Waking up…"}
          </Text>
        )}
      </YStack>
    );
  }

  if (!welcomed) {
    return (
      <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
        <Text fontSize={28} fontWeight="700" color={palette.ink} letterSpacing={-0.5}>
          You're in.
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          {unlockMode === "passkey"
            ? "Your identity is locked to your passkey — the same one your device asked about. No passwords, nothing to remember."
            : "Your identity lives on this device only. Sign in from somewhere else by joining through an invite link."}
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          Make a circle for your people, or open an invite link someone's sent you.
        </Text>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => {
            try {
              localStorage.setItem(WELCOMED, "1");
            } catch {
              /* private mode — just move on */
            }
            setWelcomed(true);
          }}
        >
          Start exploring
        </Button>
      </YStack>
    );
  }

  return <Discover />;
}
