// eslint-disable-next-line import/no-unassigned-import
import "react-native-get-random-values";
// eslint-disable-next-line import/no-unassigned-import
import "../global.css";
import { useOnboarding } from "@/features";
import { NDKContext } from "@/lib/context/ndk-context";
import {
  connectNDK,
  getOrCreateIdentity,
  processIncomingGiftWraps,
  isOnboardingComplete,
} from "@klk/infrastructure";
import NDK, { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";

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

  useEffect(
    function initializeApp() {
      (async function runInitialization() {
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
    },
    [setOnboardingComplete],
  );

  useEffect(
    function handleRoutingAfterOnboarding() {
      if (ready && onboardingChecked && !onboardingComplete) {
        const isOnboardingRoute = segments[0] === "onboarding";
        if (!isOnboardingRoute) {
          router.replace("/onboarding");
        }
      }
    },
    [ready, onboardingChecked, onboardingComplete, segments, router],
  );

  const ndkContextValue = useMemo(() => ({ ndk, signer, currentUser }), [ndk, signer, currentUser]);

  if (!ready) {
    return null;
  }

  return (
    <NDKContext.Provider value={ndkContextValue}>
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
        <Stack.Screen
          name="profile"
          options={{
            title: "Profile",
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.5, 1.0],
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack>
    </NDKContext.Provider>
  );
}

export default function RootLayout() {
  return <RootLayoutInner />;
}
