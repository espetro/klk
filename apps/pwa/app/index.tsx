import { useStore } from "@nanostores/react";
import { Link, useRouter } from "one";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { $circles } from "@klk/core";
import { CircleCard, EmptyState, palette } from "@klk/ui";
import { $bootError, $bootState, createAndConnect } from "../src/boot.ts";

export default function Home() {
  const state = useStore($bootState);
  const err = useStore($bootError);
  const circles = useStore($circles);
  const router = useRouter();

  if (state === "onboarding") {
    return (
      <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
        <YStack gap="$2">
          <Text fontSize={32} fontWeight="700" color={palette.ink} letterSpacing={-0.5}>
            Klk
          </Text>
          <Text fontSize={15} color={palette.muted} lineHeight={22}>
            Private circles for the people around you. Create an identity to get started — it stays
            on this device.
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
            {state === "connecting" ? "Connecting to relay…" : "Restoring identity…"}
          </Text>
        )}
      </YStack>
    );
  }

  const list = Object.values(circles);
  return (
    <YStack gap="$4" paddingTop="$6">
      <XStack justifyContent="space-between" alignItems="baseline">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          Your circles
        </Text>
        <Link href="/circle/new">
          <Text fontSize={14} color={palette.ink} fontWeight="500">
            + New
          </Text>
        </Link>
      </XStack>
      {list.length === 0 ? (
        <EmptyState
          title="No circles yet"
          hint="Create one and share the invite link with friends or family."
        />
      ) : (
        <YStack gap="$3">
          {list.map((c) => (
            <CircleCard
              key={c.coord}
              circle={c}
              onPress={() => router.replace(`/circle/${encodeURIComponent(c.coord)}` as never)}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
