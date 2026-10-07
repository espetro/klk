import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams, useRouter } from "one";
import { Text, YStack } from "tamagui";
import { $connected, postEvent } from "@klk/core";
import { EventForm, palette } from "@klk/ui";

export default function NewEvent() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const router = useRouter();
  const connected = useStore($connected);
  const [err, setErr] = useState<string>();

  return (
    <YStack gap="$5" paddingTop="$6">
      <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
        New event
      </Text>
      {connected ? (
        <EventForm
          submitLabel="Post event"
          onSubmit={(v) => {
            postEvent({ coord, ...v })
              .then(() => router.back())
              .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
          }}
        />
      ) : (
        <Text fontSize={14} color={palette.muted}>
          Connecting…
        </Text>
      )}
      {err !== undefined ? (
        <Text fontSize={13} color="#9F2F2D">
          {err}
        </Text>
      ) : null}
    </YStack>
  );
}
