// Email gate for the launch cohort — wraps the whole app until an email
// is on file (or VITE_COHORT_GATE=0). Copy stays honest about why: we're
// letting people in slowly, not extracting data.
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Input, Text, YStack } from "tamagui";
import { palette } from "@klk/ui";
import { posthogClient } from "./analytics.ts";
import { COHORT_GATE } from "./config.ts";
import { cohortEmail, joinCohort } from "./cohort.ts";

export function CohortGate({ children }: { children: ReactNode }) {
  const [joined, setJoined] = useState(cohortEmail() !== null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!COHORT_GATE || joined) return children;

  const submit = () => {
    const value = email.trim();
    if (value === "") return;
    setBusy(true);
    setError(null);
    joinCohort(value)
      .then(() => {
        posthogClient()?.identify(value.toLowerCase());
        setJoined(true);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <YStack flex={1} justifyContent="center" gap="$4" padding="$5" backgroundColor={palette.canvas}>
      <YStack gap="$2">
        <Text fontSize={34} fontWeight="800" color={palette.ink} letterSpacing={-1}>
          Pinya
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          Private circles for the people around you — events, RSVPs, and plans that stay yours.
        </Text>
      </YStack>
      <YStack
        gap="$3"
        borderWidth={1}
        borderColor={palette.border}
        borderRadius={12}
        padding="$4"
        backgroundColor={palette.surface}
      >
        <Text fontSize={14} fontWeight="600" color={palette.ink}>
          We're letting the first cohort in slowly.
        </Text>
        <Text fontSize={13} color={palette.muted} lineHeight={19}>
          Leave your email and you're in — that's also how we reach you about the launch.
        </Text>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          borderColor={palette.border}
          backgroundColor={palette.canvas}
          onSubmitEditing={submit}
        />
        {error !== null ? (
          <Text fontSize={13} color="#9F2F2D">
            {error}
          </Text>
        ) : null}
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={8}
          disabled={busy || email.trim() === ""}
          onPress={submit}
        >
          {busy ? "Joining…" : "Continue"}
        </Button>
      </YStack>
    </YStack>
  );
}
