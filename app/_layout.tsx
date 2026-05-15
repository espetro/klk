import "react-native-get-random-values";
import "../global.css";
import { createContext, useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import NDK, { NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk-mobile";
import { getNDK } from "@/lib/nostr/ndk";
import { getOrCreateIdentity } from "@/lib/nostr/identity";
import { processIncomingGiftWraps } from "@/lib/nostr/groups";

SplashScreen.preventAutoHideAsync();

interface NDKContextValue {
  ndk: NDK | null;
  signer: NDKPrivateKeySigner | null;
  currentUser: NDKUser | null;
  city: string;
  setCity: (city: string) => void;
}

export const NDKContext = createContext<NDKContextValue>({
  ndk: null,
  signer: null,
  currentUser: null,
  city: "barcelona",
  setCity: () => {},
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);
  const [city, setCity] = useState("barcelona");

  useEffect(() => {
    (async () => {
      try {
        const s = await getOrCreateIdentity();
        const instance = getNDK();
        instance.signer = s;
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
    <NDKContext.Provider value={{ ndk, signer, currentUser, city, setCity }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
        <Stack.Screen name="event/new" options={{ title: "New Event" }} />
        <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
        <Stack.Screen name="group/new" options={{ title: "New Group" }} />
      </Stack>
    </NDKContext.Provider>
  );
}
