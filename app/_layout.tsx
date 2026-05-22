import "react-native-get-random-values";
import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import NDK, { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";
import { NDKContext } from "@/lib/context/ndk-context";
export { NDKContext };
import { CityProvider } from "@/lib/context/city-context";
import { connectNDK } from "@/lib/nostr/ndk";
import { getOrCreateIdentity } from "@/lib/nostr/identity";
import { processIncomingGiftWraps } from "@/lib/nostr/groups";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getOrCreateIdentity();
        const instance = connectNDK(s);
        await instance.connect();

        const user = await s.user();
        setSigner(s);
        setNdk(instance);
        setCurrentUser(user);

        processIncomingGiftWraps(instance, user.pubkey);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <NDKContext.Provider value={{ ndk, signer, currentUser }}>
      <CityProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
          <Stack.Screen name="event/new" options={{ title: "New Event" }} />
          <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
          <Stack.Screen name="group/new" options={{ title: "New Group" }} />
          <Stack.Screen name="legal/terms" options={{ title: "Terms of Service" }} />
          <Stack.Screen name="legal/privacy" options={{ title: "Privacy Policy" }} />
        </Stack>
      </CityProvider>
    </NDKContext.Provider>
  );
}
