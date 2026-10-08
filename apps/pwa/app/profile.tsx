import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useRouter } from "one";
import { Button, Input, ScrollView, Text, TextArea, XStack, YStack } from "tamagui";
import {
  $connected,
  $contacts,
  $identity,
  $profiles,
  addContact,
  displayName,
  publishProfile,
  removeContact,
  storedUnlockMode,
} from "@klk/core";
import { npubDecode, npubEncode } from "@klk/proto";
import { Field, ShareActions, lookupCity, palette } from "@klk/ui";
import { createAndConnect, signOut } from "../src/boot.ts";
import { reportBug } from "../src/analytics";
import { APP_ORIGIN, RELAY_URL } from "../src/config.ts";
import { notify } from "../src/notify";

export default function Profile() {
  const identity = useStore($identity);
  const connected = useStore($connected);
  const profiles = useStore($profiles);
  const contacts = useStore($contacts);
  const router = useRouter();
  const mine = identity === null ? undefined : profiles[identity.pubkey];
  const [name, setName] = useState<string | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [addInput, setAddInput] = useState("");
  const [bug, setBug] = useState("");
  const [busy, setBusy] = useState(false);
  // PWA notifications probe: OS-level push needs a push service we don't
  // run yet — this captures the permission state honestly.
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  if (identity === null) {
    return (
      <YStack gap="$4" paddingTop="$6">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          Profile
        </Text>
        <Text fontSize={15} color={palette.muted} lineHeight={22}>
          You're browsing as a guest. Create an identity to have a profile, save contacts, and share
          yourself with a QR code.
        </Text>
        <Button
          backgroundColor={palette.ink}
          color="#FFFFFF"
          borderRadius={6}
          onPress={() => void createAndConnect()}
        >
          Create identity
        </Button>
        <XStack gap="$2" alignItems="center">
          <YStack
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={connected ? "#346538" : "#9F2F2D"}
          />
          <Text fontSize={13} color={palette.muted}>
            {connected ? "Connected" : "Disconnected"} · {RELAY_URL}
          </Text>
        </XStack>
      </YStack>
    );
  }

  const npub = npubEncode(identity.pubkey);
  const profileUrl = `${APP_ORIGIN}/u/${npub}`;

  const save = () => {
    setBusy(true);
    void publishProfile({
      ...(name !== undefined && name.trim() !== "" ? { name: name.trim() } : {}),
      ...(username !== undefined && username.trim() !== "" ? { username: username.trim() } : {}),
      ...(city !== undefined ? { city: city.trim() } : {}),
    })
      .then(() => {
        setName(undefined);
        setUsername(undefined);
        setCity(undefined);
        notify("Profile saved");
      })
      .catch((e: unknown) => notify(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void lookupCity(pos.coords.latitude, pos.coords.longitude).then((c) => {
          if (c !== null) setCity(c);
          else notify("Couldn't resolve your city — type it instead");
        });
      },
      () => notify("Location unavailable — type your city instead"),
      { timeout: 8000 },
    );
  };

  const addByInput = () => {
    // accepts an npub, a bare pubkey, or a /u/ profile link
    const raw = addInput.trim();
    const npubIn = raw.includes("/u/") ? raw.slice(raw.lastIndexOf("/u/") + 3) : raw;
    const pk = npubDecode(npubIn);
    if (pk === null) {
      notify("Paste a profile link or npub");
      return;
    }
    void addContact(pk)
      .then(() => {
        setAddInput("");
        notify("Added to your contacts");
      })
      .catch((e: unknown) => notify(e instanceof Error ? e.message : String(e)));
  };

  return (
    <ScrollView flex={1}>
      <YStack gap="$5" paddingTop="$6" paddingBottom="$8">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          Profile
        </Text>

        <YStack gap="$3">
          <Field label="Name">
            <Input
              value={name ?? mine?.name ?? ""}
              onChangeText={setName}
              placeholder="How friends know you"
              borderColor={palette.border}
              backgroundColor={palette.surface}
            />
          </Field>
          <Field label="Username">
            <Input
              value={username ?? mine?.username ?? displayName(identity.pubkey)}
              onChangeText={setUsername}
              autoCapitalize="none"
              borderColor={palette.border}
              backgroundColor={palette.surface}
            />
          </Field>
          <Field label="City">
            <XStack gap="$2">
              <Input
                flex={1}
                value={city ?? mine?.city ?? ""}
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
                onPress={locate}
              >
                Locate
              </Button>
            </XStack>
          </Field>
          {name !== undefined || username !== undefined || city !== undefined ? (
            <Button
              backgroundColor={palette.ink}
              color="#FFFFFF"
              borderRadius={6}
              disabled={busy}
              onPress={save}
            >
              Save profile
            </Button>
          ) : null}
        </YStack>

        <YStack gap="$2">
          <Text fontSize={13} color={palette.muted}>
            Share me
          </Text>
          <ShareActions
            url={profileUrl}
            title={`${displayName(identity.pubkey)} on Pinya`}
            text="Add me on Pinya — scan or open to save me to your contacts"
            onCopied={notify}
          />
        </YStack>

        <YStack gap="$2">
          <Text fontSize={13} color={palette.muted}>
            Contacts
          </Text>
          <Text fontSize={12} color={palette.muted} lineHeight={17}>
            Your lightweight address book — scan a friend's profile QR or paste their link. A circle
            of one is just you; contacts are how circles start.
          </Text>
          {contacts.length === 0 ? (
            <Text fontSize={14} color={palette.muted}>
              No contacts yet.
            </Text>
          ) : (
            contacts.map((pk) => (
              <XStack
                key={pk}
                alignItems="center"
                gap="$2"
                borderWidth={1}
                borderColor={palette.border}
                borderRadius={8}
                padding="$3"
                backgroundColor={palette.surface}
              >
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color={palette.ink}>
                    {displayName(pk)}
                  </Text>
                  <Text fontSize={11} color={palette.muted} fontFamily="$mono">
                    {profiles[pk]?.city ?? npubEncode(pk).slice(0, 16) + "…"}
                  </Text>
                </YStack>
                <Button
                  size="$2"
                  chromeless
                  color={palette.ink}
                  onPress={() => router.push(`/u/${npubEncode(pk)}` as never)}
                >
                  View
                </Button>
                <Button size="$2" chromeless color="#9F2F2D" onPress={() => void removeContact(pk)}>
                  Remove
                </Button>
              </XStack>
            ))
          )}
          <XStack gap="$2">
            <Input
              flex={1}
              value={addInput}
              onChangeText={setAddInput}
              placeholder="Profile link or npub"
              autoCapitalize="none"
              borderColor={palette.border}
              backgroundColor={palette.surface}
            />
            <Button
              size="$3"
              borderRadius={6}
              backgroundColor={palette.ink}
              color="#FFFFFF"
              disabled={addInput.trim() === ""}
              onPress={addByInput}
            >
              Add
            </Button>
          </XStack>
        </YStack>

        <Field label="Identity (npub)">
          <Text fontSize={13} color={palette.ink} fontFamily="$mono" selectable>
            {npub}
          </Text>
        </Field>
        <Field label="Unlocked by">
          <Text fontSize={14} color={palette.ink}>
            {storedUnlockMode() === "passkey"
              ? "Your passkey"
              : "This device only — no passkey saved"}
          </Text>
        </Field>
        <Field label="Notifications">
          {perm === "unsupported" ? (
            <Text fontSize={13} color={palette.muted}>
              This browser can't do push notifications yet.
            </Text>
          ) : perm === "granted" ? (
            <Text fontSize={13} color={palette.pastelGreenInk}>
              On — you'll hear about new events here.
            </Text>
          ) : (
            <YStack gap="$2">
              <Text fontSize={13} color={palette.muted}>
                {perm === "denied"
                  ? "Blocked — enable them in your browser's site settings."
                  : "Get a nudge when circles you follow post events."}
              </Text>
              {perm === "default" ? (
                <Button
                  size="$3"
                  borderRadius={6}
                  borderWidth={1}
                  borderColor={palette.border}
                  backgroundColor={palette.surface}
                  color={palette.ink}
                  onPress={() => {
                    void Notification.requestPermission().then((p) => {
                      setPerm(p);
                      if (p === "granted") notify("Notifications on");
                    });
                  }}
                >
                  Enable notifications
                </Button>
              ) : null}
            </YStack>
          )}
        </Field>

        <YStack gap="$2">
          <Text fontSize={13} color={palette.muted}>
            Report a bug
          </Text>
          <TextArea
            value={bug}
            onChangeText={setBug}
            placeholder="What broke? One line is plenty."
            numberOfLines={3}
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
            disabled={bug.trim() === ""}
            onPress={() => {
              reportBug(bug.trim());
              setBug("");
              notify("Sent — thanks for the heads up");
            }}
          >
            Send report
          </Button>
        </YStack>
        <XStack gap="$2" alignItems="center">
          <YStack
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={connected ? "#346538" : "#9F2F2D"}
          />
          <Text fontSize={13} color={palette.muted}>
            {connected ? "Connected" : "Disconnected"} · {RELAY_URL}
          </Text>
        </XStack>
        <Button
          borderRadius={6}
          borderWidth={1}
          borderColor={palette.border}
          backgroundColor={palette.surface}
          color={palette.ink}
          onPress={() => {
            void signOut().then(() => {
              // web reloads the realm; native just re-renders the guest view
              if (typeof location !== "undefined") location.reload();
            });
          }}
        >
          Sign out of this device
        </Button>
      </YStack>
    </ScrollView>
  );
}
