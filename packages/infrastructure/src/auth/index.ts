export { signInWithGoogle } from "./google";
export type { GoogleSignInResult } from "./google";

export { signInWithApple, isAppleSignInAvailable } from "./apple";
export type { AppleSignInResult } from "./apple";

export {
  authenticateWithBiometrics,
  isBiometricAvailable,
  getBiometricType,
} from "./biometric";
export type { BiometricResult } from "./biometric";

export {
  completeLogin,
  completeOnboarding,
  isOnboardingComplete,
  getOAuthProvider,
} from "./complete-login";
export type { OAuthProvider } from "./complete-login";

export { resetOnboarding } from "./reset-onboarding";
