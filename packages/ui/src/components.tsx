// Shared domain components — the single implementation of each concept
// (AGENTS.md: exactly one EventForm in v0). Visual language: warm
// monochrome, hairline borders, muted pastel badges, charcoal CTAs.
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Card, Image, Input, Text, TextArea, XStack, YStack } from "tamagui";
import type { CalendarEvent, Circle, RSVP } from "@klk/core";
import { DateTimeField } from "./datetime-field";
import { LocationInput } from "./location-input.tsx";
import { palette } from "./palette.ts";

export { palette };

export const Badge = ({ label, tone }: { label: string; tone: "blue" | "green" }) => (
  <XStack
    backgroundColor={tone === "blue" ? palette.pastelBlue : palette.pastelGreen}
    borderRadius={999}
    paddingHorizontal={8}
    paddingVertical={2}
  >
    <Text
      fontSize={11}
      letterSpacing={0.5}
      textTransform="uppercase"
      color={tone === "blue" ? palette.pastelBlueInk : palette.pastelGreenInk}
    >
      {label}
    </Text>
  </XStack>
);

export const CircleCard = ({ circle, onPress }: { circle: Circle; onPress?: () => void }) => (
  <Card
    borderWidth={1}
    borderColor={palette.border}
    backgroundColor={palette.surface}
    borderRadius={10}
    padding="$4"
    gap="$2"
    pressStyle={{ scale: 0.99 }}
    onPress={onPress}
  >
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize={17} fontWeight="600" color={palette.ink}>
        {circle.name !== "" ? circle.name : circle.slug}
      </Text>
      <Badge
        label={circle.tier === "sealed" ? "Sealed" : "Connected"}
        tone={circle.tier === "sealed" ? "blue" : "green"}
      />
    </XStack>
    <Text fontSize={13} color={palette.muted}>
      {circle.members.length} user{circle.members.length === 1 ? "" : "s"}
    </Text>
  </Card>
);

const dayLabel = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const timeLabel = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const EventCard = ({
  event,
  going,
  accent,
  circleName,
  myStatus,
  onPress,
}: {
  event: CalendarEvent;
  going?: number;
  /** circle accent — left strip + label color */
  accent?: string;
  circleName?: string;
  /** the viewer's own RSVP, if any */
  myStatus?: RSVP["status"];
  onPress?: () => void;
}) => (
  <Card
    borderWidth={1}
    borderColor={palette.border}
    backgroundColor={palette.surface}
    borderRadius={10}
    padding="$4"
    gap="$1.5"
    pressStyle={{ scale: 0.99 }}
    onPress={onPress}
    overflow="hidden"
  >
    {accent !== undefined ? (
      <YStack position="absolute" left={0} top={0} bottom={0} width={3} backgroundColor={accent} />
    ) : null}
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize={12} color={palette.muted} textTransform="uppercase" letterSpacing={0.6}>
        {dayLabel(event.starts)} · {timeLabel(event.starts)}
      </Text>
      {myStatus !== undefined && myStatus !== "no" ? (
        <Text fontSize={11} fontWeight="600" color={accent ?? palette.pastelGreenInk}>
          {myStatus === "yes" ? "Going" : "Maybe"}
        </Text>
      ) : null}
    </XStack>
    <Text fontSize={17} fontWeight="600" color={palette.ink}>
      {event.title}
    </Text>
    <XStack gap="$2" alignItems="center">
      {circleName !== undefined ? (
        <Text fontSize={12} fontWeight="500" color={accent ?? palette.muted}>
          {circleName}
        </Text>
      ) : null}
      {event.location !== undefined ? (
        <Text fontSize={13} color={palette.muted} numberOfLines={1}>
          {event.location}
        </Text>
      ) : null}
    </XStack>
    {going !== undefined && going > 0 ? (
      <Text fontSize={12} color={palette.muted}>
        {going} going
      </Text>
    ) : null}
    {event.image !== undefined ? (
      <Image
        source={{ uri: event.image }}
        width="100%"
        height={96}
        borderRadius={8}
        marginTop={4}
        objectFit="cover"
      />
    ) : null}
  </Card>
);

export interface EventFormValues {
  title: string;
  starts: number;
  ends?: number;
  location?: string;
  geo?: readonly [number, number];
  summary?: string;
  image?: string;
  suggestable?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => Math.floor(new Date(v).getTime() / 1000);
const defaultStart = () => Math.floor(Date.now() / 1000) + 86400;

// THE EventForm — one implementation, used by create + edit surfaces.
export const EventForm = ({
  initial,
  submitLabel,
  hideSuggestable,
  onSubmit,
}: {
  initial?: Partial<EventFormValues>;
  submitLabel: string;
  /** suggestion flow proposes edits — the toggle belongs to the creator */
  hideSuggestable?: boolean;
  onSubmit: (values: EventFormValues) => void;
}) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [starts, setStarts] = useState(() => toLocalInput(initial?.starts ?? defaultStart()));
  const [ends, setEnds] = useState(initial?.ends !== undefined ? toLocalInput(initial.ends) : "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [geo, setGeo] = useState<readonly [number, number] | undefined>(initial?.geo);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [suggestable, setSuggestable] = useState(initial?.suggestable ?? false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim() === "" || starts === "") return;
    setBusy(true);
    try {
      onSubmit({
        title: title.trim(),
        starts: fromLocalInput(starts),
        ...(ends !== "" ? { ends: fromLocalInput(ends) } : {}),
        ...(location.trim() !== "" ? { location: location.trim() } : {}),
        ...(geo !== undefined ? { geo } : {}),
        ...(summary.trim() !== "" ? { summary: summary.trim() } : {}),
        ...(image.trim() !== "" ? { image: image.trim() } : {}),
        suggestable,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack gap="$4">
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Title
        </Text>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="Saturday run"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </YStack>
      <XStack gap="$3">
        <YStack gap="$1.5" flex={1}>
          <Text fontSize={13} color={palette.muted}>
            Starts
          </Text>
          <DateTimeField value={starts} onChange={setStarts} />
        </YStack>
        <YStack gap="$1.5" flex={1}>
          <Text fontSize={13} color={palette.muted}>
            Ends
          </Text>
          <DateTimeField value={ends} onChange={setEnds} />
        </YStack>
      </XStack>
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Location
        </Text>
        <LocationInput
          value={location}
          geo={geo}
          onChange={setLocation}
          onPick={(label, g) => {
            setLocation(label);
            setGeo(g);
          }}
        />
      </YStack>
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Details
        </Text>
        <TextArea
          value={summary}
          onChangeText={setSummary}
          placeholder="What should everyone know?"
          borderColor={palette.border}
          backgroundColor={palette.surface}
          rows={4}
        />
      </YStack>
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Cover photo URL <Text color={palette.border}>(optional)</Text>
        </Text>
        <Input
          value={image}
          onChangeText={setImage}
          placeholder="https://…"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </YStack>
      {hideSuggestable !== true ? (
        <XStack
          justifyContent="space-between"
          alignItems="center"
          borderWidth={1}
          borderColor={palette.border}
          borderRadius={8}
          padding="$3"
          cursor="pointer"
          pressStyle={{ opacity: 0.8 }}
          onPress={() => setSuggestable(!suggestable)}
        >
          <YStack gap={2} flex={1}>
            <Text fontSize={14} fontWeight="500" color={palette.ink}>
              Let others suggest changes
            </Text>
            <Text fontSize={12} color={palette.muted}>
              They can propose a new time, place or name — you approve.
            </Text>
          </YStack>
          <YStack
            width={20}
            height={20}
            borderRadius={4}
            borderWidth={1}
            borderColor={suggestable ? palette.ink : palette.border}
            backgroundColor={suggestable ? palette.ink : "transparent"}
            alignItems="center"
            justifyContent="center"
          >
            {suggestable ? (
              <Text fontSize={12} color="#FFF">
                ✓
              </Text>
            ) : null}
          </YStack>
        </XStack>
      ) : null}
      <Button
        backgroundColor={palette.ink}
        color="#FFFFFF"
        borderRadius={6}
        disabled={busy || title.trim() === ""}
        opacity={busy || title.trim() === "" ? 0.6 : 1}
        onPress={submit}
      >
        {submitLabel}
      </Button>
    </YStack>
  );
};

export const RsvpButtons = ({
  current,
  onSelect,
}: {
  current?: RSVP["status"];
  onSelect: (status: RSVP["status"]) => void;
}) => {
  const options: { status: RSVP["status"]; label: string }[] = [
    { status: "yes", label: "Going" },
    { status: "maybe", label: "Maybe" },
    { status: "no", label: "Can't go" },
  ];
  return (
    <XStack gap="$2">
      {options.map((o) => {
        const active = current === o.status;
        return (
          <Button
            key={o.status}
            flex={1}
            borderRadius={6}
            backgroundColor={active ? palette.ink : palette.surface}
            borderWidth={1}
            borderColor={active ? palette.ink : palette.border}
            color={active ? "#FFFFFF" : palette.ink}
            onPress={() => onSelect(o.status)}
          >
            {o.label}
          </Button>
        );
      })}
    </XStack>
  );
};

export const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
  <YStack gap="$2" paddingVertical="$8" alignItems="center">
    <Text fontSize={16} fontWeight="600" color={palette.ink}>
      {title}
    </Text>
    <Text fontSize={13} color={palette.muted} textAlign="center">
      {hint}
    </Text>
  </YStack>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <YStack gap="$1.5">
    <Text fontSize={13} color={palette.muted}>
      {label}
    </Text>
    {children}
  </YStack>
);
