import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useRouter } from "one";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { $connected, $identity, createCircle } from "@klk/core";
import { Field, palette } from "@klk/ui";
import type { CircleTier } from "@klk/proto";
import { createAndConnect } from "../../src/boot.ts";
import { notify } from "../../src/notify.ts";

export default function NewCircle() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<CircleTier>("hosted");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const connected = useStore($connected);
  const me = useStore($identity);
  const router = useRouter();

  if (me === null) {
    return (
      <YStack gap="$4" paddingTop="$6">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          New circle
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          Circles live on your identity — create one to organize plans. Your device will offer to
          save a passkey; that's the whole signup.
        </Text>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => void createAndConnect()}
        >
          Create identity
        </Button>
      </YStack>
    );
  }

  const submit = async () => {
    if (name.trim() === "") return;
    setBusy(true);
    setErr(undefined);
    try {
      const c = await createCircle(name.trim(), tier);
      notify("Circle created — share the invite link");
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
                {t === "hosted" ? "Connected" : "Sealed"}
              </Button>
            );
          })}
        </XStack>
      </Field>
      <Text fontSize={13} color={palette.muted} lineHeight={19}>
        {tier === "sealed"
          ? "Locked end-to-end — only users' devices can read what's inside. Agents and calendar sync can't help here."
          : "The relay can read this circle — that's what lets agents and calendar sync work."}
      </Text>
      <Button
        backgroundColor={palette.ink}
        color="#FFFFFF"
        borderRadius={6}
        disabled={busy || name.trim() === "" || !connected}
        opacity={busy || name.trim() === "" || !connected ? 0.6 : 1}
        onPress={() => void submit()}
      >
        {connected ? "Create circle" : "Connecting…"}
      </Button>
      {err !== undefined ? (
        <Text fontSize={13} color="#9F2F2D">
          {err}
        </Text>
      ) : null}
    </YStack>
  );
}
