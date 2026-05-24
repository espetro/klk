import { useCallback, useRef, useState } from "react";
import { FlatList, View, Dimensions } from "react-native";

import EventsPage from "./pages/events";
import LocationPage from "./pages/location";
import LoginPage from "./pages/login";
import WelcomePage from "./pages/welcome";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGES = [WelcomePage, EventsPage, LocationPage, LoginPage];

export default function OnboardingPager() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleProceed = useCallback(() => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    flatListRef.current?.scrollToIndex({ index: PAGES.length - 1 });
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item: Page, index }) => (
          <View style={{ width: SCREEN_WIDTH }} className="flex-1">
            <Page
              onProceed={handleProceed}
              onSkip={handleSkip}
              isLast={index === PAGES.length - 1}
            />
          </View>
        )}
      />

      {/* Page indicator dots */}
      <View className="flex-row justify-center pb-8 gap-2">
        {PAGES.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${
              currentIndex === i ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
