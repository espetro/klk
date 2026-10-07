import { Slot } from "one";
import { Platform } from "react-native";
import { KlkProvider } from "@klk/ui";
import { AppShell } from "../src/shell.tsx";

export default function Layout() {
  const inner = (
    <KlkProvider>
      <AppShell>
        <Slot />
      </AppShell>
    </KlkProvider>
  );

  if (Platform.OS === "web") {
    return (
      <html lang="en-US">
        <head>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
          />
          <meta name="theme-color" content="#FBFBFA" />
          <link rel="icon" href="/favicon.svg" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/app-icon.png" />
          <title>Klk</title>
        </head>
        {inner}
      </html>
    );
  }

  return inner;
}
