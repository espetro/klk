// EventMap — native v0: the same box, rendered as a compact list of the
// geo-tagged events (no MapLibre on native; AGENTS.md).
import type { CalendarEvent } from "@klk/core";
import { ScrollView, Text, YStack } from "tamagui";
import { palette } from "./palette.ts";

export const EventMap = ({
  events,
  height = 240,
}: {
  events: CalendarEvent[];
  height?: number;
}) => {
  const withGeo = events.filter((e) => e.geo !== undefined);
  if (withGeo.length === 0) return null;
  return (
    <YStack
      height={height}
      borderWidth={1}
      borderColor={palette.border}
      borderRadius={10}
      backgroundColor={palette.surface}
      overflow="hidden"
    >
      <ScrollView flex={1}>
        <YStack padding="$3" gap="$2">
          <Text
            fontSize={11}
            fontWeight="600"
            color={palette.muted}
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {withGeo.length === 1 ? "Location" : `${withGeo.length} locations`}
          </Text>
          {withGeo.map((ev) => (
            <YStack key={ev.id} gap={2}>
              <Text fontSize={14} fontWeight="500" color={palette.ink}>
                {ev.title}
              </Text>
              <Text fontSize={12} color={palette.muted}>
                {ev.location ?? ev.geo!.map((n) => n.toFixed(4)).join(", ")}
              </Text>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
};
