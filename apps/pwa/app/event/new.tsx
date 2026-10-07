import { useParams, useRouter } from "one";
import { Text, YStack } from "tamagui";
import { postEvent } from "@klk/core";
import { EventForm, palette } from "@klk/ui";

export default function NewEvent() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const router = useRouter();

  return (
    <YStack gap="$5" paddingTop="$6">
      <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
        New event
      </Text>
      <EventForm
        submitLabel="Post event"
        onSubmit={(v) => {
          void postEvent({ coord, ...v }).then(() => router.back());
        }}
      />
    </YStack>
  );
}
