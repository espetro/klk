// Assistant surfaces — visual shells only; the caller wires transports
// and prompt logic from @klk/ai. Two pieces: AiAssistBox (free text →
// structured draft) and RecapCard (circle recap). Copy follows spec §4:
// on sealed circles AI only runs against the member's own endpoint, and
// the UI says so instead of hiding the constraint.
import { useState } from "react";
import { Button, Text, TextArea, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

export interface AiAssistBoxProps {
  /** false when no transport can serve this circle right now */
  available: boolean;
  /** true on sealed circles without a custom endpoint — renders the
   * honest-copy notice instead of the input */
  sealedNotice: boolean;
  /** run the assist; throw Error with a member-facing message on failure */
  onRun: (text: string) => Promise<void>;
  placeholder: string;
  submitLabel: string;
}

export const AiAssistBox = ({
  available,
  sealedNotice,
  onRun,
  placeholder,
  submitLabel,
}: AiAssistBoxProps) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  if (sealedNotice) {
    return (
      <YStack
        borderWidth={1}
        borderColor={palette.border}
        borderRadius={10}
        padding="$3"
        backgroundColor={palette.canvas}
      >
        <Text fontSize={12} color={palette.muted} lineHeight={17}>
          AI on sealed circles uses your own endpoint — nothing leaves your device. Set one up in
          Profile → AI helper.
        </Text>
      </YStack>
    );
  }
  if (!available) return null;

  const run = () => {
    if (text.trim() === "" || busy) return;
    setBusy(true);
    setErr(undefined);
    onRun(text.trim())
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <YStack
      gap="$2"
      borderWidth={1}
      borderColor={palette.border}
      borderRadius={10}
      padding="$3"
      backgroundColor={palette.canvas}
    >
      <Text fontSize={13} fontWeight="600" color={palette.ink}>
        Describe it — AI fills the form
      </Text>
      <TextArea
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        numberOfLines={2}
        borderColor={palette.border}
        backgroundColor={palette.surface}
        fontSize={14}
      />
      <XStack justifyContent="flex-end">
        <Button
          size="$3"
          borderRadius={6}
          backgroundColor={palette.ink}
          color="#FFFFFF"
          disabled={busy || text.trim() === ""}
          opacity={busy || text.trim() === "" ? 0.5 : 1}
          onPress={run}
        >
          {busy ? "Thinking…" : submitLabel}
        </Button>
      </XStack>
      {err !== undefined ? (
        <Text fontSize={12} color="#9F2F2D">
          {err}
        </Text>
      ) : null}
    </YStack>
  );
};

export interface RecapCardProps {
  available: boolean;
  sealedNotice: boolean;
  /** produce the recap prose; throw Error with a member-facing message */
  onGenerate: () => Promise<string>;
}

export const RecapCard = ({ available, sealedNotice, onGenerate }: RecapCardProps) => {
  const [busy, setBusy] = useState(false);
  const [recap, setRecap] = useState<string>();
  const [err, setErr] = useState<string>();

  if (sealedNotice) {
    return (
      <YStack
        borderWidth={1}
        borderColor={palette.border}
        borderRadius={10}
        padding="$3"
        backgroundColor={palette.canvas}
      >
        <Text fontSize={12} color={palette.muted} lineHeight={17}>
          Circle recaps use AI — on sealed circles that means your own endpoint, so nothing leaves
          your device. Set one up in Profile → AI helper.
        </Text>
      </YStack>
    );
  }
  if (!available) return null;

  const generate = () => {
    if (busy) return;
    setBusy(true);
    setErr(undefined);
    onGenerate()
      .then(setRecap)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <YStack
      gap="$2"
      borderWidth={1}
      borderColor={palette.border}
      borderRadius={10}
      padding="$3"
      backgroundColor={palette.canvas}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} fontWeight="600" color={palette.ink}>
          What's on
        </Text>
        <Button
          size="$2"
          chromeless
          color={palette.ink}
          disabled={busy}
          opacity={busy ? 0.5 : 1}
          onPress={generate}
        >
          {busy ? "Thinking…" : recap === undefined ? "Recap for me" : "Refresh"}
        </Button>
      </XStack>
      {recap !== undefined ? (
        <Text fontSize={14} color={palette.ink} lineHeight={20}>
          {recap}
        </Text>
      ) : null}
      {err !== undefined ? (
        <Text fontSize={12} color="#9F2F2D">
          {err}
        </Text>
      ) : null}
    </YStack>
  );
};
