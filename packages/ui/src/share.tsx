import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Text, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

/**
 * Share any link: Share-Intent via navigator.share when the platform
 * offers it, copy to clipboard otherwise — plus a QR code for the
 * scan-to-open path (add user, join circle, save contact).
 */
export function ShareActions(props: {
  url: string;
  title: string;
  text?: string;
  onCopied?: (msg: string) => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const share = async () => {
    try {
      const nav = navigator as Navigator & {
        share?: (d: { title: string; text: string; url: string }) => Promise<void>;
      };
      if (nav.share !== undefined) {
        await nav.share({ title: props.title, text: props.text ?? props.title, url: props.url });
        return;
      }
    } catch {
      return; // share sheet dismissed
    }
    try {
      await navigator.clipboard.writeText(props.url);
      props.onCopied?.("Link copied");
    } catch {
      props.onCopied?.("Couldn't copy — use the QR code");
      setShowQR(true);
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
        <Button
          flex={1}
          size="$3"
          borderRadius={6}
          backgroundColor={palette.surface}
          borderWidth={1}
          borderColor={palette.border}
          color={palette.ink}
          onPress={() => setShowQR(!showQR)}
        >
          {showQR ? "Hide QR" : "QR code"}
        </Button>
      </XStack>
      {showQR ? (
        <YStack
          alignItems="center"
          gap="$2"
          padding="$3"
          backgroundColor="#FFFFFF"
          borderRadius={8}
          borderWidth={1}
          borderColor={palette.border}
        >
          <QRCodeSVG value={props.url} size={168} />
          <Text fontSize={11} color={palette.muted} textAlign="center">
            Scan to open on another device
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
