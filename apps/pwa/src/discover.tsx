// Discovery home — full-bleed map of upcoming events across circles, a
// bottom drawer with the calendar filter (week strip collapsed, month
// grid expanded), circle filter popover, and the event list.
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useRouter } from "one";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";
import { $circles, $events, $identity, $rsvps, circleColor } from "@klk/core";
import { createAndConnect } from "./boot.ts";
import type { CalendarEvent } from "@klk/core";
import { DiscoveryMap, EmptyState, EventCard, RangeCalendar, dayKey, palette } from "@klk/ui";
import type { DayRange, DiscoveryPin } from "@klk/ui";
import { MAX_RANGE_DAYS } from "./config.ts";

const TAB_BAR = 56;

export const Discover = () => {
  const circles = useStore($circles);
  const eventsByCircle = useStore($events);
  const rsvps = useStore($rsvps);
  const identity = useStore($identity);
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState(() => dayKey(new Date()));
  const [range, setRange] = useState<DayRange | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  // flatten all watched circles' events → apply circle + range filters
  const all: CalendarEvent[] = Object.values(eventsByCircle)
    .flat()
    .filter((e) => !hidden.has(e.coord))
    .filter((e) => {
      if (range === null) return true;
      const k = dayKey(new Date(e.starts * 1000));
      return k >= range.from && k <= range.to;
    })
    .sort((a, b) => a.starts - b.starts);

  // day → circle accents for the calendar dots
  const dots = new Map<string, string[]>();
  for (const e of all) {
    const k = dayKey(new Date(e.starts * 1000));
    const list = dots.get(k) ?? [];
    const c = circleColor(e.coord);
    if (!list.includes(c)) list.push(c);
    dots.set(k, list);
  }

  const pins: DiscoveryPin[] = all
    .filter((e) => e.geo !== undefined)
    .map((e) => ({
      event: e,
      circleName: circles[e.coord]?.name || circles[e.coord]?.slug || "circle",
    }));

  const myRsvp = (e: CalendarEvent) =>
    identity === null
      ? undefined
      : rsvps[`${e.coord}:${e.id}`]?.find((r) => r.pubkey === identity.pubkey)?.status;

  const openEvent = (e: CalendarEvent) =>
    router.replace(
      `/event/${encodeURIComponent(e.id)}?coord=${encodeURIComponent(e.coord)}` as never,
    );

  const circleList = Object.values(circles);
  const toggleCircle = (coord: string) => {
    const next = new Set(hidden);
    if (next.has(coord)) next.delete(coord);
    else next.add(coord);
    setHidden(next);
  };

  return (
    <YStack position="fixed" top={0} left={0} right={0} bottom={TAB_BAR}>
      <DiscoveryMap pins={pins} onOpen={(e) => openEvent(e)} />

      {/* filter popover */}
      {filterOpen ? (
        <YStack
          position="absolute"
          top={56}
          right={12}
          zIndex={30}
          backgroundColor={palette.surface}
          borderWidth={1}
          borderColor={palette.border}
          borderRadius={10}
          padding="$3"
          gap="$2"
          minWidth={180}
          shadowColor="#000"
          shadowOpacity={0.1}
          shadowRadius={16}
        >
          <Text fontSize={12} color={palette.muted} textTransform="uppercase" letterSpacing={0.6}>
            Circles
          </Text>
          {circleList.map((c) => {
            const on = !hidden.has(c.coord);
            return (
              <XStack
                key={c.coord}
                gap="$2"
                alignItems="center"
                cursor="pointer"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => toggleCircle(c.coord)}
              >
                <YStack
                  width={10}
                  height={10}
                  borderRadius={5}
                  backgroundColor={on ? circleColor(c.coord) : "transparent"}
                  borderWidth={1}
                  borderColor={circleColor(c.coord)}
                />
                <Text fontSize={14} color={on ? palette.ink : palette.muted}>
                  {c.name || c.slug}
                </Text>
              </XStack>
            );
          })}
          {circleList.length === 0 ? (
            <Text fontSize={13} color={palette.muted}>
              No circles yet
            </Text>
          ) : null}
        </YStack>
      ) : null}

      {/* drawer */}
      <YStack
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        height={expanded ? "88%" : "52%"}
        backgroundColor={palette.surface}
        borderTopWidth={1}
        borderColor={palette.border}
        borderTopLeftRadius={16}
        borderTopRightRadius={16}
        shadowColor="#000"
        shadowOpacity={0.12}
        shadowRadius={20}
      >
        {/* handle + actions */}
        <YStack
          alignItems="center"
          paddingTop={8}
          cursor="grab"
          onPress={() => setExpanded(!expanded)}
        >
          <YStack width={36} height={4} borderRadius={2} backgroundColor={palette.border} />
        </YStack>
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingTop="$2"
          paddingBottom="$2"
        >
          <Text fontSize={16} fontWeight="700" color={palette.ink} letterSpacing={-0.3}>
            Upcoming
          </Text>
          <XStack gap="$3">
            {range !== null ? (
              <Text
                fontSize={13}
                color={palette.muted}
                cursor="pointer"
                onPress={() => setRange(null)}
                userSelect="none"
              >
                Clear range
              </Text>
            ) : null}
            <Text
              fontSize={13}
              fontWeight="600"
              color={filterOpen ? "#FFF" : palette.ink}
              backgroundColor={filterOpen ? palette.ink : "transparent"}
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={6}
              borderWidth={1}
              borderColor={filterOpen ? palette.ink : palette.border}
              cursor="pointer"
              onPress={() => setFilterOpen(!filterOpen)}
              userSelect="none"
            >
              Filter
            </Text>
          </XStack>
        </XStack>

        <ScrollView flex={1}>
          <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$3">
            {identity === null ? (
              <YStack
                gap="$2"
                padding="$3"
                borderRadius={10}
                borderWidth={1}
                borderColor={palette.border}
                backgroundColor={palette.canvas}
              >
                <Text fontSize={14} fontWeight="600" color={palette.ink}>
                  Just looking around?
                </Text>
                <Text fontSize={13} color={palette.muted} lineHeight={18}>
                  Klk works without an account — open an invite link or poke around. Create an
                  identity only when you want to make circles, RSVP, or save contacts.
                </Text>
                <Button
                  size="$3"
                  borderRadius={6}
                  backgroundColor={palette.ink}
                  color="#FFFFFF"
                  onPress={() => void createAndConnect()}
                >
                  Create identity
                </Button>
              </YStack>
            ) : null}
            <RangeCalendar
              mode={expanded ? "month" : "week"}
              anchor={anchor}
              selected={range}
              maxRangeDays={MAX_RANGE_DAYS}
              dots={dots}
              onSelect={setRange}
              onNavigate={setAnchor}
            />
            {all.length === 0 ? (
              <EmptyState
                title="Nothing on the map yet"
                hint={
                  identity === null
                    ? "Events appear here once you join a circle — open an invite link someone's sent you."
                    : "Create an event in a circle and it'll show up here — and on the map above."
                }
              />
            ) : (
              all.map((e) => (
                <EventCard
                  key={`${e.coord}:${e.id}`}
                  event={e}
                  accent={circleColor(e.coord)}
                  circleName={circles[e.coord]?.name || circles[e.coord]?.slug}
                  myStatus={myRsvp(e)}
                  going={rsvps[`${e.coord}:${e.id}`]?.filter((r) => r.status === "yes").length ?? 0}
                  onPress={() => openEvent(e)}
                />
              ))
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
};
