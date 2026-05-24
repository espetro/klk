import { useOnboarding } from '@/features';
import {
  connectNDK,
  getOrCreateIdentity,
  isOnboardingComplete,
  processIncomingGiftWraps,
} from '@klk/infrastructure';
import NDK, { NDKPrivateKeySigner, NDKUser } from '@nostr-dev-kit/ndk-mobile';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

export default function useInitializeApp() {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);

  const [ready, setReady] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const { onboardingComplete, setOnboardingComplete } = useOnboarding();

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
        } catch (error) {
          console.error('RootLayout init error:', error);
          setOnboardingComplete(false);
        } finally {
          setReady(true);
          SplashScreen.hideAsync();
        }
      })();
    },
    [setOnboardingComplete]
  );

  return { ready, onboardingChecked, onboardingComplete, ndk, signer, currentUser };
}
