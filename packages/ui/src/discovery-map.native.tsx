// DiscoveryMap — native v0 renders the pins as a plain list (AGENTS.md:
// no MapLibre on native). Same props, same concept — the map slot just
// carries a list of geo-tagged events instead of markers.
import type { CalendarEvent } from "@klk/core";
import { circleColor } from "@klk/core";
import { ScrollView, Text, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

export interface DiscoveryPin {
  event: CalendarEvent;
  circleName: string;
}

const when = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const DiscoveryMap = ({
  pins,
  onOpen,
}: {
  pins: DiscoveryPin[];
  onOpen: (event: CalendarEvent) => void;
}) => (
  <ScrollView flex={1} backgroundColor={palette.canvas}>
    <YStack padding="$4" gap="$2">
      {pins.map((pin) => (
        <YStack
          key={`${pin.event.coord}:${pin.event.id}`}
          gap={2}
          padding="$3"
          borderWidth={1}
          borderColor={palette.border}
          borderRadius={10}
          backgroundColor={palette.surface}
          pressStyle={{ opacity: 0.7 }}
          onPress={() => onOpen(pin.event)}
        >
          <Text
            fontSize={11}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={0.6}
            color={circleColor(pin.event.coord)}
          >
            {pin.circleName}
          </Text>
          <Text fontSize={15} fontWeight="600" color={palette.ink}>
            {pin.event.title}
          </Text>
          <XStack gap="$2">
            <Text fontSize={12} color={palette.muted}>
              {when(pin.event.starts)}
            </Text>
            {pin.event.location !== undefined ? (
              <Text fontSize={12} color={palette.muted} numberOfLines={1} flex={1}>
                {pin.event.location}
              </Text>
            ) : null}
          </XStack>
        </YStack>
      ))}
    </YStack>
  </ScrollView>
);
