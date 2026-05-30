import { useOnboarding } from '@/features';
import {
  connectNDKGuest,
  getOrCreateIdentity,
  isOnboardingComplete,
  processIncomingGiftWraps,
  NDKMock as NDK,
  NDKPrivateKeySigner,
  NDKUser,
} from '@klk/infrastructure';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useInitializeApp() {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKPrivateKeySigner | null>(null);
  const [currentUser, setCurrentUser] = useState<NDKUser | null>(null);

  const [ready, setReady] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const { onboardingComplete, setOnboardingComplete } = useOnboarding();

  const ndkRef = useRef<NDK | null>(null);

  const attachIdentity = useCallback(async function attachIdentity() {
    if (!ndkRef.current) {
      return;
    }
    const s = await getOrCreateIdentity();
    ndkRef.current.signer = s;
    const user = await s.user();
    setSigner(s);
    setCurrentUser(user);
    processIncomingGiftWraps(ndkRef.current, user.pubkey);
  }, []);

  useEffect(
    function initializeApp() {
      (async function runInitialization() {
        try {
          // Always connect NDK in read-only mode first — guest mode
          const instance = await connectNDKGuest();
          ndkRef.current = instance;
          setNdk(instance);

          const complete = await isOnboardingComplete();
          setOnboardingComplete(complete);
          setOnboardingChecked(true);

          const s = await getOrCreateIdentity();
          instance.signer = s;
          const user = await s.user();
          setSigner(s);
          setCurrentUser(user);
          processIncomingGiftWraps(instance, user.pubkey);
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

  return { ready, onboardingChecked, onboardingComplete, ndk, signer, currentUser, attachIdentity };
}
