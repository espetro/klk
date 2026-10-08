import { useState } from "react";
import { Share } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

/**
 * Share any link via the OS share sheet. No QR on native (react-native-svg
 * isn't a dep) — the URL stays visible+selectable for the manual path.
 */
export function ShareActions(props: {
  url: string;
  title: string;
  text?: string;
  onCopied?: (msg: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const share = async () => {
    try {
      await Share.share({
        title: props.title,
        message: props.url,
        url: props.url,
      });
    } catch {
      // sheet dismissed or failed — leave the URL visible
      setFailed(true);
    }
  };
  return (
    <YStack gap="$2">
      <XStack gap="$2">
        <Button
          flex={1}
          size="$3"
          borderRadius={6}
          backgroundColor={palette.ink}
          color="#FFFFFF"
          onPress={() => void share()}
        >
          Share
        </Button>
      </XStack>
      {failed ? (
        <YStack
          padding="$3"
          backgroundColor={palette.surface}
          borderRadius={8}
          borderWidth={1}
          borderColor={palette.border}
        >
          <Text fontSize={12} color={palette.ink} selectable>
            {props.url}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
