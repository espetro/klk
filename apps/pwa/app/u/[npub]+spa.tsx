// Public user card: /u/<npub>. What a profile QR or shared link opens —
// guests included (kind-0 reads need no membership). Save = contact.
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { useParams } from "one";
import { Button, Text, XStack, YStack } from "tamagui";
import {
  $contacts,
  $connected,
  $identity,
  $profiles,
  addContact,
  displayName,
  fetchProfiles,
  getLogger,
  removeContact,
} from "@klk/core";
import { npubDecode, npubEncode } from "@klk/proto";
import { EmptyState, ShareActions, palette, useMountEffect } from "@klk/ui";
import { createAndConnect } from "../../src/boot.ts";
import { APP_ORIGIN } from "../../src/config.ts";
import { notify } from "../../src/notify.ts";

const log = getLogger(["klk", "user-card"]);

export default function UserCard() {
  const params = useParams<{ npub: string }>();
  const pk = npubDecode(String(params.npub ?? ""));
  const profiles = useStore($profiles);
  const contacts = useStore($contacts);
  const me = useStore($identity);
  const connected = useStore($connected);
  const [busy, setBusy] = useState(false);

  useMountEffect(function loadProfile() {
    if (pk === null) return;
    // boot() may still be connecting — fire when the realm comes up,
    // and retry a few times: a failed fetch used to leave the card on
    // the autogen name forever
    let tries = 0;
    const attempt = () => {
      tries += 1;
      void fetchProfiles([pk]).catch((e: unknown) => {
        log.warn`profile fetch failed (try ${String(tries)}): ${String(e)}`;
        if (tries < 4) setTimeout(attempt, 600);
      });
    };
    const stop = $connected.subscribe((ok) => {
      if (!ok) return;
      stop();
      attempt();
    });
    return () => stop();
  });

  if (pk === null) {
    return (
      <YStack paddingTop="$6">
        <EmptyState title="Not a profile link" hint="This link doesn't point at a Pinya user." />
      </YStack>
    );
  }

  const p = profiles[pk];
  const isMe = me?.pubkey === pk;
  const isContact = contacts.includes(pk);
  const selfUrl = `${APP_ORIGIN}/u/${npubEncode(pk)}`;

  const toggleContact = () => {
    setBusy(true);
    void (isContact ? removeContact(pk) : addContact(pk))
      .then(() => notify(isContact ? "Removed from contacts" : "Added to your contacts"))
      .catch((e: unknown) => notify(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <YStack gap="$4" paddingTop="$6">
      <YStack gap="$1">
        <Text fontSize={26} fontWeight="700" color={palette.ink} letterSpacing={-0.4}>
          {displayName(pk)}
        </Text>
        {p?.username !== undefined ? (
          <Text fontSize={15} color={palette.muted}>
            @{p.username}
          </Text>
        ) : null}
        {p?.city !== undefined ? (
          <Text fontSize={13} color={palette.muted}>
            {p.city}
          </Text>
        ) : null}
      </YStack>

      {connected && p === undefined ? (
        <Text fontSize={13} color={palette.muted}>
          They haven't shared profile details yet — this is their autogen name.
        </Text>
      ) : null}

      {isMe ? (
        <Text fontSize={13} color={palette.muted}>
          That's you — share this card so friends can add you.
        </Text>
      ) : me === null ? (
        <YStack gap="$2">
          <Text fontSize={13} color={palette.muted} lineHeight={18}>
            Create an identity to save {displayName(pk)} to your contacts.
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
      ) : (
        <Button
          borderRadius={6}
          backgroundColor={isContact ? palette.surface : palette.ink}
          borderWidth={1}
          borderColor={isContact ? palette.border : palette.ink}
          color={isContact ? palette.ink : "#FFFFFF"}
          disabled={busy}
          onPress={toggleContact}
        >
          {isContact ? "In your contacts — remove" : "Save to contacts"}
        </Button>
      )}

      <ShareActions
        url={selfUrl}
        title={`${displayName(pk)} on Pinya`}
        text="Add me on Pinya"
        onCopied={notify}
      />
      <XStack gap="$2" alignItems="center">
        <YStack
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={connected ? "#346538" : "#9F2F2D"}
        />
        <Text fontSize={12} color={palette.muted}>
          {connected ? "Live" : "Connecting…"}
        </Text>
      </XStack>
    </YStack>
  );
}
