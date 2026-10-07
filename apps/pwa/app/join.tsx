// Invite intake: /join#<payload>. Secrets live in the fragment — never sent
// to the server. Joins the circle then redirects to it.
import { useState } from "react";
import { useRouter } from "one";
import { Spinner, Text, YStack } from "tamagui";
import { joinCircle } from "@klk/core";
import { palette, useMountEffect } from "@klk/ui";

export default function Join() {
  const [err, setErr] = useState<string>();
  const router = useRouter();

  useMountEffect(function consumeInvite() {
    const frag = location.hash.slice(1);
    if (frag === "") {
      setErr("This invite link is missing its payload.");
      return;
    }
    joinCircle(`#${frag}`)
      .then((c) => router.replace(`/circle/${encodeURIComponent(c.coord)}` as never))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  });

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingVertical="$8">
      {err !== undefined ? (
        <Text fontSize={14} color="#9F2F2D" textAlign="center">
          {err}
        </Text>
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
