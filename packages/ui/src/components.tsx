// Shared domain components — the single implementation of each concept
// (AGENTS.md: exactly one EventForm in v0). Visual language: warm
// monochrome, hairline borders, muted pastel badges, charcoal CTAs.
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Card, Input, Text, TextArea, XStack, YStack } from "tamagui";
import type { CalendarEvent, Circle, RSVP } from "@klk/core";

export const palette = {
  canvas: "#FBFBFA",
  surface: "#FFFFFF",
  border: "#EAEAEA",
  ink: "#111111",
  muted: "#787774",
  pastelBlue: "#E1F3FE",
  pastelBlueInk: "#1F6C9F",
  pastelGreen: "#EDF3EC",
  pastelGreenInk: "#346538",
};

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
      <Badge label={circle.tier} tone={circle.tier === "sealed" ? "blue" : "green"} />
    </XStack>
    <Text fontSize={13} color={palette.muted}>
      {circle.members.length} member{circle.members.length === 1 ? "" : "s"}
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
  onPress,
}: {
  event: CalendarEvent;
  going?: number;
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
  >
    <Text fontSize={12} color={palette.muted} textTransform="uppercase" letterSpacing={0.6}>
      {dayLabel(event.starts)} · {timeLabel(event.starts)}
    </Text>
    <Text fontSize={17} fontWeight="600" color={palette.ink}>
      {event.title}
    </Text>
    {event.location !== undefined ? (
      <Text fontSize={13} color={palette.muted}>
        {event.location}
      </Text>
    ) : null}
    {going !== undefined && going > 0 ? (
      <Text fontSize={12} color={palette.muted}>
        {going} going
      </Text>
    ) : null}
  </Card>
);

export interface EventFormValues {
  title: string;
  starts: number;
  ends?: number;
  location?: string;
  summary?: string;
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
  onSubmit,
}: {
  initial?: Partial<EventFormValues>;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
}) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [starts, setStarts] = useState(() => toLocalInput(initial?.starts ?? defaultStart()));
  const [ends, setEnds] = useState(initial?.ends !== undefined ? toLocalInput(initial.ends) : "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
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
        ...(summary.trim() !== "" ? { summary: summary.trim() } : {}),
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
          <input
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.currentTarget.value)}
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 14,
              background: palette.surface,
              color: palette.ink,
              width: "100%",
            }}
          />
        </YStack>
        <YStack gap="$1.5" flex={1}>
          <Text fontSize={13} color={palette.muted}>
            Ends
          </Text>
          <input
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.currentTarget.value)}
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 14,
              background: palette.surface,
              color: palette.ink,
              width: "100%",
            }}
          />
        </YStack>
      </XStack>
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Location
        </Text>
        <Input
          value={location}
          onChangeText={setLocation}
          placeholder="Café Nord, Gracia"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </YStack>
      <YStack gap="$1.5">
        <Text fontSize={13} color={palette.muted}>
          Details
        </Text>
        <TextArea
          value={summary}
          onChangeText={setSummary}
          placeholder="What should people know?"
          borderColor={palette.border}
          backgroundColor={palette.surface}
          rows={4}
        />
      </YStack>
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
