// Invite intake: /join#<payload>. Secrets live in the fragment — never sent
// to the server. Joins the circle then redirects to it.
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useRouter } from "one";
import { Button, Spinner, Text, YStack } from "tamagui";
import { $identity, joinCircle } from "@klk/core";
import { palette, useMountEffect } from "@klk/ui";
import { createAndConnect } from "../src/boot.ts";
import { notify } from "../src/notify.ts";

export default function Join() {
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const me = useStore($identity);
  const router = useRouter();

  useMountEffect(function consumeInvite() {
    const frag = location.hash.slice(1);
    if (frag === "") {
      setErr("This invite link is missing its payload.");
      return;
    }
    // guests hold at the CTA until identity exists — join fires the
    // moment one is created (or was already stored).
    let done = false;
    const stop = $identity.subscribe((id) => {
      if (id === null || done) return;
      done = true;
      joinCircle(`#${frag}`)
        .then((c) => {
          notify("You're in — welcome to the circle");
          router.replace(`/circle/${encodeURIComponent(c.coord)}` as never);
        })
        .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
    });
    return () => {
      done = true;
      stop();
    };
  });

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
      ) : me === null ? (
        <>
          <Text fontSize={20} fontWeight="600" color={palette.ink}>
            You're invited
          </Text>
          <Text fontSize={14} color={palette.muted} textAlign="center" maxWidth={320}>
            Create an identity on this device to join — your device will ask to save a passkey.
          </Text>
          <Button backgroundColor={palette.ink} color="white" disabled={busy} onPress={create}>
            {busy ? "Creating…" : "Create identity"}
          </Button>
        </>
      ) : (
        <>
          <Spinner size="large" color={palette.muted} />
          <Text fontSize={14} color={palette.muted}>
            Joining circle…
          </Text>
        </>
      )}
    </YStack>
  );
}
