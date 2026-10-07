import { useStore } from "@nanostores/react";
import { Link, useRouter } from "one";
import { Text, YStack, XStack } from "tamagui";
import { $circles } from "@klk/core";
import { CircleCard, EmptyState, palette } from "@klk/ui";

export default function Circles() {
  const circles = useStore($circles);
  const router = useRouter();
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
