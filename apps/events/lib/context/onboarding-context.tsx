import React, { createContext, useContext, useState, useCallback } from "react";

interface OnboardingContextType {
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  onboardingComplete: false,
  setOnboardingComplete: () => {},
});

export function OnboardingProvider({
  children,
  initialComplete = false,
}: {
  children: React.ReactNode;
  initialComplete?: boolean;
}) {
  const [onboardingComplete, setOnboardingComplete] = useState(initialComplete);

  const setComplete = useCallback((value: boolean) => {
    setOnboardingComplete(value);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{ onboardingComplete, setOnboardingComplete: setComplete }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
