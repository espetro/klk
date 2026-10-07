import { useState } from "react";
import { useRouter } from "one";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { createCircle } from "@klk/core";
import { Field, palette } from "@klk/ui";
import type { CircleTier } from "@klk/proto";

export default function NewCircle() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<CircleTier>("hosted");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const router = useRouter();

  const submit = async () => {
    if (name.trim() === "") return;
    setBusy(true);
    setErr(undefined);
    try {
      const c = await createCircle(name.trim(), tier);
      router.replace(`/circle/${encodeURIComponent(c.coord)}` as never);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <YStack gap="$5" paddingTop="$6">
      <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
        New circle
      </Text>
      <Field label="Name">
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Weekend crew"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </Field>
      <Field label="Privacy">
        <XStack gap="$2">
          {(["hosted", "sealed"] as const).map((t) => {
            const active = tier === t;
            return (
              <Button
                key={t}
                flex={1}
                borderRadius={6}
                backgroundColor={active ? palette.ink : palette.surface}
                borderWidth={1}
                borderColor={active ? palette.ink : palette.border}
                color={active ? "#FFFFFF" : palette.ink}
                onPress={() => setTier(t)}
              >
                {t}
              </Button>
            );
          })}
        </XStack>
      </Field>
      <Text fontSize={13} color={palette.muted} lineHeight={19}>
        {tier === "sealed"
          ? "End-to-end encrypted. Our relay stores ciphertext — agents can't read circle content."
          : "Server-readable. Enables agent actions and future AI features."}
      </Text>
      <Button
        backgroundColor={palette.ink}
        color="#FFFFFF"
        borderRadius={6}
        disabled={busy || name.trim() === ""}
        opacity={busy || name.trim() === "" ? 0.6 : 1}
        onPress={() => void submit()}
      >
        Create circle
      </Button>
      {err !== undefined ? (
        <Text fontSize={13} color="#9F2F2D">
          {err}
        </Text>
      ) : null}
    </YStack>
  );
}
