import { useOnboarding } from '@/features';
import { completeOnboarding } from '@klk/infrastructure';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';

import HowItWorksPage from './pages/how-it-works';
import LocationPage from './pages/location';
import WelcomePage from './pages/welcome';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = [WelcomePage, HowItWorksPage, LocationPage];

export default function OnboardingPager() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { setOnboardingComplete } = useOnboarding();

  const handleComplete = useCallback(async () => {
    await completeOnboarding();
    setOnboardingComplete(true);
    router.replace('/(tabs)/events');
  }, [router, setOnboardingComplete]);

  const handleProceed = useCallback(() => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  }, [currentIndex, handleComplete]);

  return (
    <View className='flex-1 bg-gray-50'>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item: Page, index }) => (
          <View style={{ width: SCREEN_WIDTH }} className='flex-1'>
            <Page
              onProceed={handleProceed}
              onSkip={handleComplete}
              isLast={index === PAGES.length - 1}
            />
          </View>
        )}
      />

      <View className='flex-row justify-center pb-8 gap-2'>
        {PAGES.map((_, i) => (
          <View
            key={_.name}
            className={`h-1.5 rounded-full ${
              currentIndex === i ? 'w-6 bg-gray-900' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </View>
    </View>
  );
}
