import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams, useRouter } from "one";
import { Button, Text, YStack } from "tamagui";
import { $connected, $identity, postEvent } from "@klk/core";
import { EventForm, palette } from "@klk/ui";
import { createAndConnect } from "../../src/boot.ts";
import { notify } from "../../src/notify";

export default function NewEvent() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const router = useRouter();
  const connected = useStore($connected);
  const me = useStore($identity);
  const [err, setErr] = useState<string>();

  return (
    <YStack gap="$5" paddingTop="$6">
      <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
        New event
      </Text>
      {me === null ? (
        <YStack gap="$3">
          <Text fontSize={15} color={palette.muted} lineHeight={22}>
            Posting needs an identity — create one and the event form is yours.
          </Text>
          <Button
            backgroundColor={palette.ink}
            color="#FFFFFF"
            borderRadius={6}
            onPress={() => void createAndConnect()}
          >
            Create identity
          </Button>
        </YStack>
      ) : connected ? (
        <EventForm
          submitLabel="Post event"
          onSubmit={(v) => {
            postEvent({ coord, ...v })
              .then(() => {
                notify("Event posted");
                router.back();
              })
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
