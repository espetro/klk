import "react-native-get-random-values";
import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import NDK, { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";
import { NDKContext } from "@/lib/context/ndk-context";
export { NDKContext };
import { useOnboarding } from "@/features";
import { connectNDK } from "@klk/infrastructure";
import { getOrCreateIdentity } from "@klk/infrastructure";
import { processIncomingGiftWraps } from "@klk/infrastructure";
import { isOnboardingComplete } from "@klk/infrastructure";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const [ready, setReady] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { onboardingComplete, setOnboardingComplete } = useOnboarding();
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      try {
        const complete = await isOnboardingComplete();
        setOnboardingComplete(complete);
        setOnboardingChecked(true);

        if (complete) {
          const s = await getOrCreateIdentity();
          const instance = connectNDK(s);
          await instance.connect();

          const user = await s.user();
          setSigner(s);
          setNdk(instance);
          setCurrentUser(user);

          processIncomingGiftWraps(instance, user.pubkey);
        }
      } catch (e) {
        console.error("RootLayout init error:", e);
        setOnboardingComplete(false);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  useEffect(() => {
    if (ready && onboardingChecked && !onboardingComplete) {
      const isOnboardingRoute = segments[0] === "onboarding";
      if (!isOnboardingRoute) {
        router.replace("/onboarding/welcome");
      }
    }
  }, [ready, onboardingChecked, onboardingComplete, segments, router]);

  if (!ready) return null;

  return (
    <NDKContext.Provider value={{ ndk, signer, currentUser }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="event/[id]"
          options={{
            title: "Event",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="event/new"
          options={{
            title: "New Event",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
        <Stack.Screen
          name="group/new"
          options={{
            title: "New Group",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ title: "Terms of Service" }} />
        <Stack.Screen name="legal/privacy" options={{ title: "Privacy Policy" }} />
      </Stack>
    </NDKContext.Provider>
  );
}

export default function RootLayout() {
  return <RootLayoutInner />;
}
