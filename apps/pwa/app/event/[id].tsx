import { useStore } from "@nanostores/react";
import { useLocalSearchParams, useParams } from "one";
import { Text, YStack } from "tamagui";
import { $circles, $events, $identity, $rsvps, setRsvp } from "@klk/core";
import { EmptyState, EventMap, RsvpButtons, palette } from "@klk/ui";

const fmt = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const search = useLocalSearchParams<{ coord: string }>();
  const eventId = decodeURIComponent(String(params.id ?? ""));
  const coord = decodeURIComponent(String(search.coord ?? ""));
  const event = (useStore($events)[coord] ?? []).find((e) => e.eventId === eventId);
  const circle = useStore($circles)[coord];
  const me = useStore($identity);
  const rsvps = useStore($rsvps)[`${coord}:${eventId}`] ?? [];

  if (event === undefined) {
    return (
      <YStack paddingTop="$6">
        <EmptyState title="Event not found" hint="It may still be syncing." />
      </YStack>
    );
  }

  const mine = rsvps.find((r) => r.pubkey === me?.pubkey);
  const going = rsvps.filter((r) => r.status === "yes").length;

  return (
    <YStack gap="$4" paddingTop="$6">
      <YStack gap="$1">
        <Text fontSize={13} color={palette.muted} textTransform="uppercase" letterSpacing={0.6}>
          {circle?.name ?? coord.split(":")[2] ?? ""}
        </Text>
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          {event.title}
        </Text>
      </YStack>
      <YStack gap="$1.5">
        <Text fontSize={15} color={palette.ink}>
          {fmt(event.starts)}
          {event.ends !== undefined ? ` — ${fmt(event.ends)}` : ""}
        </Text>
        {event.location !== undefined ? (
          <Text fontSize={15} color={palette.muted}>
            {event.location}
          </Text>
        ) : null}
        <Text fontSize={13} color={palette.muted}>
          {going} going
        </Text>
      </YStack>
      {event.geo !== undefined ? <EventMap events={[event]} /> : null}
      {event.summary !== "" ? (
        <Text fontSize={15} color={palette.ink} lineHeight={22}>
          {event.summary}
        </Text>
      ) : null}
      <YStack gap="$2" paddingTop="$2">
        <Text fontSize={13} color={palette.muted}>
          Your RSVP
        </Text>
        <RsvpButtons
          {...(mine !== undefined ? { current: mine.status } : {})}
          onSelect={(s) => void setRsvp(coord, event.eventId, s)}
        />
      </YStack>
    </YStack>
  );
}
