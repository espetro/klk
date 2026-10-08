import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Link } from "one";
import { Button, Input, Spinner, Text, XStack, YStack } from "tamagui";
import { $identity, publishProfile, storage, usernameFor } from "@klk/core";
import { Field, lookupCity, palette } from "@klk/ui";
import { notify } from "../src/notify";
import { $bootError, $bootState, $unlockMode, unlock } from "../src/boot.ts";
import { Discover } from "../src/discover.tsx";

const WELCOMED = "klk.welcomed";

// One screen after identity creation: who are you. Everything skippable —
// username is pre-filled by the autogen, city is one tap.
function ProfileSetup(props: { onDone: () => void; unlockMode: string }) {
  const me = useStore($identity);
  const [name, setName] = useState("");
  const [username, setUsername] = useState(me === null ? "" : usernameFor(me.pubkey));
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void lookupCity(pos.coords.latitude, pos.coords.longitude)
          .then((c) => {
            if (c !== null) setCity(c);
            else notify("Couldn't resolve your city — type it instead");
          })
          .finally(() => setBusy(false));
      },
      () => {
        setBusy(false);
        notify("Location unavailable — type your city instead");
      },
      { timeout: 8000 },
    );
  };

  const finish = () => {
    setBusy(true);
    void publishProfile({
      name: name.trim() === "" ? undefined : name.trim(),
      username: username.trim() === "" ? undefined : username.trim(),
      city: city.trim() === "" ? undefined : city.trim(),
    })
      .catch(() => {})
      .finally(() => props.onDone());
  };

  return (
    <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
      <YStack gap="$2">
        <Text fontSize={28} fontWeight="700" color={palette.ink} letterSpacing={-0.5}>
          You're in.
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          {props.unlockMode === "passkey"
            ? "Your identity is locked to your passkey — no passwords, nothing to remember."
            : "Your identity lives on this device only."}{" "}
          A name so friends recognize you — everything here is editable later.
        </Text>
      </YStack>
      <Field label="Name (optional)">
        <Input
          value={name}
          onChangeText={setName}
          placeholder="How friends know you"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </Field>
      <Field label="Username">
        <Input
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
      </Field>
      <Field label="City (optional)">
        <XStack gap="$2">
          <Input
            flex={1}
            value={city}
            onChangeText={setCity}
            placeholder="Barcelona"
            borderColor={palette.border}
            backgroundColor={palette.surface}
          />
          <Button
            size="$3"
            borderRadius={6}
            borderWidth={1}
            borderColor={palette.border}
            backgroundColor={palette.surface}
            color={palette.ink}
            disabled={busy}
            onPress={locate}
          >
            Locate
          </Button>
        </XStack>
      </Field>
      <Button
        backgroundColor={palette.ink}
        color="#FFFFFF"
        borderRadius={6}
        disabled={busy}
        onPress={finish}
      >
        Start exploring
      </Button>
      <Text
        fontSize={13}
        color={palette.muted}
        textAlign="center"
        onPress={() => props.onDone()}
        cursor="pointer"
      >
        Skip for now
      </Text>
    </YStack>
  );
}

export default function Home() {
  const state = useStore($bootState);
  const err = useStore($bootError);
  const unlockMode = useStore($unlockMode);
  const me = useStore($identity);
  // profile-setup welcome shows once, right after first identity creation
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return storage.getItem(WELCOMED) === "1";
    } catch {
      return true;
    }
  });
  const done = () => {
    try {
      storage.setItem(WELCOMED, "1");
    } catch {
      /* private mode — just move on */
    }
    setWelcomed(true);
  };

  if (state === "locked") {
    return (
      <YStack flex={1} justifyContent="center" gap="$4" paddingVertical="$8">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          Welcome back
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          Your identity is protected by the passkey on this device.
        </Text>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => void unlock()}
        >
          Unlock with passkey
        </Button>
        {err !== undefined ? (
          <Text fontSize={13} color="#9F2F2D">
            {err}
          </Text>
        ) : null}
      </YStack>
    );
  }

  if (state !== "ready") {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingVertical="$8">
        <Spinner size="large" color={palette.muted} />
        {state === "error" ? (
          <YStack gap="$2" alignItems="center">
            <Text fontSize={13} color="#9F2F2D" textAlign="center">
              {err ?? "Could not reach the relay."}
            </Text>
            <Link href="/profile">
              <Text fontSize={13} color={palette.ink} textDecorationLine="underline">
                Connection settings
              </Text>
            </Link>
          </YStack>
        ) : (
          <Text fontSize={13} color={palette.muted}>
            {state === "connecting" ? "Connecting…" : "Waking up…"}
          </Text>
        )}
      </YStack>
    );
  }

  // signed in, never onboarded here → collect profile details once
  if (me !== null && !welcomed) {
    return <ProfileSetup onDone={done} unlockMode={unlockMode} />;
  }

  // guest or fully onboarded — straight to the map
  return <Discover />;
}
