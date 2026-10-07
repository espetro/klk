import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams, useRouter } from "one";
import { Button, Text, XStack, YStack } from "tamagui";
import {
  $circles,
  $events,
  $identity,
  $rsvps,
  circleColor,
  displayName,
  inviteLinkFor,
} from "@klk/core";
import { Badge, EmptyState, EventCard, EventMap, ShareActions, palette } from "@klk/ui";
import { $bootState } from "../../src/boot.ts";
import { API_ORIGIN, APP_ORIGIN } from "../../src/config.ts";
import { notify } from "../../src/notify.ts";

export default function CircleDetail() {
  const params = useParams<{ coord: string }>();
  const coord = decodeURIComponent(String(params.coord ?? ""));
  const circle = useStore($circles)[coord];
  const events = useStore($events)[coord] ?? [];
  const rsvps = useStore($rsvps);
  const me = useStore($identity);
  const bootState = useStore($bootState);
  const router = useRouter();
  // agent-capability intro — shown once after the user's first successful
  // flow (join/create lands here), then dismissed for good
  const [showAgentHint, setShowAgentHint] = useState(() => {
    try {
      return localStorage.getItem("klk.seen.agenthint") !== "1";
    } catch {
      return false;
    }
  });
  const dismissAgentHint = () => {
    try {
      localStorage.setItem("klk.seen.agenthint", "1");
    } catch {
      /* private mode */
    }
    setShowAgentHint(false);
  };

  if (circle === undefined) {
    return (
      <YStack paddingTop="$6">
        <EmptyState
          title={bootState === "ready" ? "Circle not found" : "Syncing…"}
          hint={
            bootState === "ready"
              ? "It may still be syncing, or the invite didn't complete."
              : "Restoring your circles."
          }
        />
      </YStack>
    );
  }

  // hosted circles expose a calendar feed the relay can render — the
  // invite secret is the feed's read capability, same trust as the link.
  // webcal:// asks the OS to subscribe the default calendar app.
  const copyFeed = async () => {
    const url = `${API_ORIGIN}/ics/${circle.owner}/${circle.slug}?invite=${encodeURIComponent(circle.inviteSecret)}`;
    await navigator.clipboard.writeText(url.replace(/^https?/, "webcal"));
    notify("Calendar feed copied — paste it in your calendar app");
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
            {circle.members.length === 1
              ? "Just you — share the invite to connect"
              : `${circle.members.length} users`}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {circle.members.map((m) => (
              <Text
                key={m}
                fontSize={12}
                color={palette.muted}
                backgroundColor={palette.canvas}
                borderWidth={1}
                borderColor={palette.border}
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={10}
              >
                {m === me?.pubkey ? "you" : displayName(m)}
              </Text>
            ))}
          </XStack>
        </YStack>
        <Badge
          label={circle.tier === "sealed" ? "Sealed" : "Connected"}
          tone={circle.tier === "sealed" ? "blue" : "green"}
        />
      </XStack>

      {showAgentHint ? (
        <YStack
          borderWidth={1}
          borderColor={palette.border}
          borderRadius={10}
          padding="$3"
          gap="$1"
          backgroundColor={palette.canvas}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={13} fontWeight="600" color={palette.ink}>
              Bring your agent
            </Text>
            <Text fontSize={12} color={palette.muted} cursor="pointer" onPress={dismissAgentHint}>
              Dismiss
            </Text>
          </XStack>
          <Text fontSize={12} color={palette.muted} lineHeight={17}>
            Pinya is built for agents too — yours can RSVP, post events and keep plans updated on
            your behalf. Scoped permissions only; you approve what it can do.
          </Text>
        </YStack>
      ) : null}

      <ShareActions
        url={inviteLinkFor(circle, APP_ORIGIN)}
        title={`Join ${circle.name !== "" ? circle.name : circle.slug} on Pinya`}
        text="You're invited to my circle — tap to join"
        onCopied={notify}
      />
      {circle.tier === "hosted" ? (
        <Button
          borderRadius={6}
          borderWidth={1}
          borderColor={palette.border}
          backgroundColor={palette.surface}
          color={palette.ink}
          onPress={() => void copyFeed()}
        >
          Add to your calendar
        </Button>
      ) : null}

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
              key={e.id}
              event={e}
              accent={circleColor(e.coord)}
              myStatus={
                me === null
                  ? undefined
                  : (rsvps[`${coord}:${e.id}`] ?? []).find((r) => r.pubkey === me.pubkey)?.status
              }
              going={(rsvps[`${coord}:${e.id}`] ?? []).filter((r) => r.status === "yes").length}
              onPress={() =>
                router.push(
                  `/event/${encodeURIComponent(e.id)}?coord=${encodeURIComponent(coord)}` as never,
                )
              }
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
