// App chrome: mobile-first single column + bottom tab bar (spec §3.2).
import type { ReactNode } from "react";
import { Link } from "one";
import { Text, XStack, YStack } from "tamagui";
import { palette } from "@klk/ui";

const Tab = ({ href, label }: { href: string; label: string }) => (
  <YStack flex={1}>
    <Link href={href as never}>
      <YStack alignItems="center" paddingVertical="$2">
        <Text fontSize={13} color={palette.ink}>
          {label}
        </Text>
      </YStack>
    </Link>
  </YStack>
);

export const AppShell = ({ children }: { children: ReactNode }) => (
  <YStack flex={1} backgroundColor={palette.canvas} minHeight="100vh">
    <YStack
      flex={1}
      width="100%"
      maxWidth={520}
      alignSelf="center"
      paddingHorizontal="$4"
      paddingBottom={72}
    >
      {children}
    </YStack>
    <XStack
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      height={56}
      backgroundColor={palette.surface}
      borderTopWidth={1}
      borderTopColor={palette.border}
      justifyContent="space-around"
      alignItems="center"
    >
      <Tab href="/" label="Circles" />
      <Tab href="/circle/new" label="New circle" />
      <Tab href="/profile" label="Profile" />
    </XStack>
  </YStack>
);
