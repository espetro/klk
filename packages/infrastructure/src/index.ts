// export { NDKAdapter } from './nostr/NDKAdapter';
// export { SecureStoreAdapter } from './storage/SecureStoreAdapter';
// export { SQLiteAdapter } from './storage/SQLiteAdapter';
// export { CryptoService } from './crypto/CryptoService';
export * from './nostr';
export { ExpoStorageAdapter } from './storage/ExpoStorageAdapter';
export { getSecure, setSecure, deleteSecure } from './storage';
export { saveCircle, getCircle, getAllCircles, deleteCircle } from './storage';
export type { CircleRecord } from './storage';
export {
  loadCitySettings,
  saveCitySettings,
  clearCitySettings,
  DEFAULT_CITY_SETTINGS,
} from './storage';
export type { CitySettings } from './storage';
export { ConfigService } from './config/ConfigService';
export { AesGcmCryptoAdapter } from './crypto/AesGcmCryptoAdapter';
export * as Auth from './auth';
export { resetOnboarding } from './auth/reset-onboarding';
export { completeOnboarding, isOnboardingComplete } from './auth/complete-login';

// Re-export NDK core types
export {
  default as NDKMock,
  NDKPrivateKeySigner,
  NDKEvent,
  type NDKUser,
  type NDKSigner,
  type NDKSubscription,
} from '@klk/nostr-mobile';
export { KlkSQLiteCacheAdapter } from '@klk/nostr-mobile';
