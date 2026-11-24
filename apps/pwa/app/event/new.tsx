import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams, useRouter } from "one";
import { Button, Text, YStack } from "tamagui";
import { draftEvent } from "@klk/ai";
import { $circles, $connected, $identity, postEvent } from "@klk/core";
import { AiAssistBox, EventForm, palette } from "@klk/ui";
import type { EventFormValues } from "@klk/ui";
import { assistState } from "../../src/assist.ts";
import { createAndConnect } from "../../src/boot.ts";
import { notify } from "../../src/notify";

export default function NewEvent() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const router = useRouter();
  const connected = useStore($connected);
  const me = useStore($identity);
  const circle = useStore($circles)[coord];
  const [err, setErr] = useState<string>();
  // a landed draft re-keys the form so its fields pick up the new values
  const [draft, setDraft] = useState<Partial<EventFormValues>>({});
  const [draftNonce, setDraftNonce] = useState(0);

  const tier = circle?.tier ?? "hosted";
  const assist = assistState(me, coord, tier);

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
        <>
          <AiAssistBox
            available={assist.transport !== null}
            sealedNotice={assist.sealedNotice}
            placeholder="climbing saturday morning at the usual crag, bring ropes"
            submitLabel="Fill the form"
            onRun={async (text) => {
              if (assist.transport === null) return;
              const result = await draftEvent(assist.transport, text);
              if (result === null) {
                throw new Error("Couldn't make sense of that — try adding a day or a place");
              }
              setDraft(result);
              setDraftNonce((n) => n + 1);
              notify("Draft filled — check it before posting");
            }}
          />
          <EventForm
            key={draftNonce}
            initial={draft}
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
        </>
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
