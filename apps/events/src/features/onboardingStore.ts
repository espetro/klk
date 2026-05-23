import { atom } from "nanostores";
import { useStore } from "@nanostores/react";

interface OnboardingState {
  complete: boolean;
}

export const $onboarding = atom<OnboardingState>({ complete: false });

export function useOnboarding() {
  const state = useStore($onboarding);

  const setOnboardingComplete = (value: boolean) => {
    $onboarding.set({ complete: value });
  };

  return {
    onboardingComplete: state.complete,
    setOnboardingComplete,
  };
}
