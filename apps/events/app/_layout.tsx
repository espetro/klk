// eslint-disable-next-line import/no-unassigned-import
import 'react-native-get-random-values';
// eslint-disable-next-line import/no-unassigned-import
import '../global.css';
import useInitializeApp from '@/hooks/useInitializeApp';
import { NDKContext } from '@/lib/context/ndk-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();

  const { ready, onboardingChecked, onboardingComplete, ...contextValue } = useInitializeApp();

  useEffect(
    function handleRoutingAfterOnboarding() {
      if (ready && onboardingChecked && !onboardingComplete) {
        const isOnboardingRoute = segments[0] === 'onboarding';
        if (!isOnboardingRoute) {
          router.replace('/onboarding');
        }
      }
    },
    [ready, onboardingChecked, onboardingComplete, segments, router]
  );

  if (!ready) {
    return null;
  }

  return (
    <NDKContext.Provider value={contextValue}>
      <Stack>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen
          name='event/[id]'
          options={{
            title: 'Event',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name='event/new'
          options={{
            title: 'New Event',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name='group/[id]' options={{ title: 'Group' }} />
        <Stack.Screen
          name='group/new'
          options={{
            title: 'New Group',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name='onboarding' options={{ headerShown: false }} />
        <Stack.Screen name='legal/terms' options={{ title: 'Terms of Service' }} />
        <Stack.Screen name='legal/privacy' options={{ title: 'Privacy Policy' }} />
        <Stack.Screen
          name='profile'
          options={{
            title: 'Profile',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.5, 1.0],
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </NDKContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutInner />
    </GestureHandlerRootView>
  );
}
