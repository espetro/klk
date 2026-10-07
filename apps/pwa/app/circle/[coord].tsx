import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams, useRouter } from "one";
import { Button, Text, XStack, YStack } from "tamagui";
import { $circles, $events, $rsvps, inviteLinkFor } from "@klk/core";
import { Badge, EmptyState, EventCard, EventMap, palette } from "@klk/ui";

export default function CircleDetail() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const circle = useStore($circles)[coord];
  const events = useStore($events)[coord] ?? [];
  const rsvps = useStore($rsvps);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (circle === undefined) {
    return (
      <YStack paddingTop="$6">
        <EmptyState
          title="Circle not found"
          hint="It may still be syncing, or the invite didn't complete."
        />
      </YStack>
    );
  }

  const copyInvite = async () => {
    const link = inviteLinkFor(circle, location.origin);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // already sorted by start time (see core client ingest)
  const upcoming = events;

  return (
    <YStack gap="$4" paddingTop="$6">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap="$1">
          <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
            {circle.name !== "" ? circle.name : circle.slug}
          </Text>
          <Text fontSize={13} color={palette.muted}>
            {circle.members.length} member{circle.members.length === 1 ? "" : "s"}
          </Text>
        </YStack>
        <Badge label={circle.tier} tone={circle.tier === "sealed" ? "blue" : "green"} />
      </XStack>

      <Button
        borderRadius={6}
        borderWidth={1}
        borderColor={palette.border}
        backgroundColor={palette.surface}
        color={palette.ink}
        onPress={() => void copyInvite()}
      >
        {copied ? "Invite link copied" : "Copy invite link"}
      </Button>

      <XStack justifyContent="space-between" alignItems="baseline">
        <Text fontSize={17} fontWeight="600" color={palette.ink}>
          Events
        </Text>
        <Button
          size="$3"
          chromeless
          color={palette.ink}
          onPress={() => router.push(`/event/new?coord=${encodeURIComponent(coord)}` as never)}
        >
          + New event
        </Button>
      </XStack>

      {events.some((e) => e.geo !== undefined) ? <EventMap events={events} /> : null}

      {upcoming.length === 0 ? (
        <EmptyState title="No events yet" hint="Post the first one for this circle." />
      ) : (
        <YStack gap="$3">
          {upcoming.map((e) => (
            <EventCard
              key={e.eventId}
              event={e}
              going={
                (rsvps[`${coord}:${e.eventId}`] ?? []).filter((r) => r.status === "yes").length
              }
              onPress={() =>
                router.push(
                  `/event/${encodeURIComponent(e.eventId)}?coord=${encodeURIComponent(coord)}` as never,
                )
              }
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
