// Invite intake on native: the fragment can't come from location.hash —
// deep links need a custom scheme + associated domains (residual), so v0
// checks the launch URL and otherwise asks you to paste the invite.
import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { useRouter } from "one";
import { Linking } from "react-native";
import { Button, Input, Spinner, Text, YStack } from "tamagui";
import { $identity, joinCircle } from "@klk/core";
import type { Keypair } from "@klk/proto";
import { palette, useMountEffect } from "@klk/ui";
import { createAndConnect } from "../src/boot.ts";
import { notify } from "../src/notify";

const fragOf = (raw: string): string => {
  const i = raw.indexOf("#");
  return i === -1 ? "" : raw.slice(i + 1);
};

export default function Join() {
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [hasFrag, setHasFrag] = useState(false);
  const fragRef = useRef("");
  const doneRef = useRef(false);
  const me = useStore($identity);
  const router = useRouter();

  const go = (id: Keypair | null) => {
    if (id === null || doneRef.current || fragRef.current === "") return;
    doneRef.current = true;
    joinCircle(`#${fragRef.current}`)
      .then((c) => {
        notify("You're in — welcome to the circle");
        router.replace(`/circle/${encodeURIComponent(c.coord)}` as never);
      })
      .catch((e) => {
        doneRef.current = false;
        setErr(e instanceof Error ? e.message : String(e));
      });
  };

  useMountEffect(function consumeInvite() {
    const stop = $identity.subscribe(go);
    // a deep link may already carry the fragment in the launch URL
    void Linking.getInitialURL().then((url) => {
      const f = url === null || url === undefined ? "" : fragOf(url);
      if (f !== "") {
        fragRef.current = f;
        setHasFrag(true);
        go($identity.get());
      }
    });
    return () => {
      doneRef.current = true;
      stop();
    };
  });

  const pasteJoin = () => {
    const f = fragOf(paste) || paste.trim();
    if (f === "") return;
    fragRef.current = f;
    setHasFrag(true);
    go($identity.get());
  };

  const create = () => {
    setBusy(true);
    createAndConnect().catch((e) => {
      setBusy(false);
      setErr(e instanceof Error ? e.message : String(e));
    });
  };

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingVertical="$8">
      {err !== undefined ? (
        <Text fontSize={14} color="#9F2F2D" textAlign="center">
          {err}
        </Text>
      ) : null}
      {me === null ? (
        <>
          <Text fontSize={20} fontWeight="600" color={palette.ink}>
            You're invited
          </Text>
          <Text fontSize={14} color={palette.muted} textAlign="center" maxWidth={320}>
            Create an identity on this device to join — it lives on this device only.
          </Text>
          <Button backgroundColor={palette.ink} color="white" disabled={busy} onPress={create}>
            {busy ? "Creating…" : "Create identity"}
          </Button>
        </>
      ) : hasFrag ? (
        <>
          <Spinner size="large" color={palette.muted} />
          <Text fontSize={14} color={palette.muted}>
            Joining circle…
          </Text>
        </>
      ) : null}
      {!hasFrag ? (
        <>
          <Text fontSize={14} color={palette.muted} textAlign="center" maxWidth={320}>
            Paste the invite link you were sent — it looks like{" "}
            <Text fontFamily="$mono">…/join#…</Text>
          </Text>
          <Input
            width={280}
            value={paste}
            onChangeText={setPaste}
            placeholder="Invite link or #payload"
            autoCapitalize="none"
            autoCorrect={false}
            borderColor={palette.border}
            backgroundColor={palette.surface}
          />
          <Button
            backgroundColor={palette.ink}
            color="white"
            disabled={paste.trim() === ""}
            onPress={pasteJoin}
          >
            Join circle
          </Button>
        </>
      ) : null}
    </YStack>
  );
}
