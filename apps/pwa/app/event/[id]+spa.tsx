import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useLocalSearchParams, useParams } from "one";
import { Button, Text, XStack, YStack } from "tamagui";
import {
  $circles,
  $connected,
  $events,
  $identity,
  $rsvps,
  $suggestions,
  applySuggestion,
  displayName,
  inviteLinkFor,
  setRsvp,
  suggestChange,
} from "@klk/core";
import { EmptyState, EventForm, EventMap, RsvpButtons, ShareActions, palette } from "@klk/ui";
import { $bootState, createAndConnect } from "../../src/boot.ts";
import { APP_ORIGIN } from "../../src/config.ts";
import { notify } from "../../src/notify";

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
  const event = (useStore($events)[coord] ?? []).find((e) => e.id === eventId);
  const circle = useStore($circles)[coord];
  const me = useStore($identity);
  const connected = useStore($connected);
  const rsvps = useStore($rsvps)[`${coord}:${eventId}`] ?? [];
  const suggestions = useStore($suggestions)[`${coord}:${eventId}`] ?? [];
  const bootState = useStore($bootState);
  const [suggesting, setSuggesting] = useState(false);

  if (event === undefined) {
    return (
      <YStack paddingTop="$6">
        <EmptyState
          title={bootState === "ready" ? "Event not found" : "Syncing…"}
          hint={bootState === "ready" ? "It may still be syncing." : "Restoring circle data."}
        />
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
        {event.delegatedBy !== undefined ? (
          <Text fontSize={12} color={palette.muted}>
            agent · via {displayName(event.delegatedBy)}
          </Text>
        ) : null}
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
      {circle !== undefined ? (
        <ShareActions
          url={inviteLinkFor(circle, APP_ORIGIN)}
          title={event.title}
          text={`${event.title} — join the circle to see the plan and RSVP`}
          onCopied={notify}
        />
      ) : null}
      <YStack gap="$2" paddingTop="$2">
        <Text fontSize={13} color={palette.muted}>
          Your RSVP
        </Text>
        {me === null ? (
          <Button
            borderRadius={6}
            backgroundColor={palette.ink}
            color="#FFFFFF"
            onPress={() => void createAndConnect()}
          >
            Create identity to RSVP
          </Button>
        ) : connected ? (
          <RsvpButtons
            {...(mine !== undefined ? { current: mine.status } : {})}
            onSelect={(s) => {
              void setRsvp(coord, event.id, s).then(() =>
                notify(
                  s === "yes"
                    ? "You're in — see you there"
                    : s === "maybe"
                      ? "Marked maybe"
                      : "Marked as can't go",
                ),
              );
            }}
          />
        ) : (
          <Text fontSize={14} color={palette.muted}>
            Connecting…
          </Text>
        )}
      </YStack>

      {event.suggestable === true && connected && me !== null && me.pubkey !== event.pubkey ? (
        suggesting ? (
          <YStack gap="$2">
            <Text fontSize={15} fontWeight="600" color={palette.ink}>
              Suggest a change
            </Text>
            <EventForm
              hideSuggestable
              submitLabel="Send suggestion"
              initial={{
                title: event.title,
                starts: event.starts,
                ...(event.ends !== undefined ? { ends: event.ends } : {}),
                ...(event.location !== undefined ? { location: event.location } : {}),
                ...(event.geo !== undefined ? { geo: event.geo } : {}),
              }}
              onSubmit={(v) => {
                void suggestChange({
                  coord,
                  eventId: event.id,
                  title: v.title,
                  starts: v.starts,
                  ...(v.ends !== undefined ? { ends: v.ends } : {}),
                  ...(v.location !== undefined ? { location: v.location } : {}),
                  ...(v.geo !== undefined ? { geo: v.geo } : {}),
                  ...(v.summary !== undefined ? { note: v.summary } : {}),
                }).then(() => {
                  setSuggesting(false);
                  notify("Suggestion sent to the organizer");
                });
              }}
            />
          </YStack>
        ) : (
          <Button
            borderRadius={6}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.surface}
            color={palette.ink}
            onPress={() => setSuggesting(true)}
          >
            Suggest a change
          </Button>
        )
      ) : null}

      {me?.pubkey === event.pubkey && suggestions.length > 0 ? (
        <YStack gap="$2" paddingTop="$2">
          <Text fontSize={13} color={palette.muted}>
            Suggestions
          </Text>
          {suggestions.map((s) => (
            <XStack
              key={`${s.pubkey}:${s.suggestedAt}`}
              borderWidth={1}
              borderColor={palette.border}
              borderRadius={8}
              padding="$3"
              gap="$3"
              alignItems="center"
              backgroundColor={palette.surface}
            >
              <YStack flex={1} gap={2}>
                <Text fontSize={14} fontWeight="500" color={palette.ink}>
                  {s.title ?? event.title}
                </Text>
                <Text fontSize={12} color={palette.muted}>
                  {fmt(s.starts ?? event.starts)}
                  {s.location !== undefined ? ` · ${s.location}` : ""}
                </Text>
                {s.note !== undefined ? (
                  <Text fontSize={12} color={palette.muted}>
                    “{s.note}”
                  </Text>
                ) : null}
              </YStack>
              <Button
                size="$3"
                borderRadius={6}
                backgroundColor={palette.ink}
                color="#FFF"
                onPress={() => {
                  void applySuggestion(event, s).then(() => notify("Event updated"));
                }}
              >
                Apply
              </Button>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
