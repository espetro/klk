// export { NDKAdapter } from './nostr/NDKAdapter';
// export { SecureStoreAdapter } from './storage/SecureStoreAdapter';
// export { SQLiteAdapter } from './storage/SQLiteAdapter';
// export { CryptoService } from './crypto/CryptoService';
export * from './nostr';
export { ExpoStorageAdapter } from './storage/ExpoStorageAdapter';
export { getSecure, setSecure, deleteSecure } from './storage';
export { saveGroup, getGroup, getAllGroups, deleteGroup } from './storage';
export type { GroupRecord } from './storage';
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

// Re-export mock types for @nostr-dev-kit/ndk-mobile replacement
export {
  default as NDKMock,
  NDKCacheAdapterSqlite,
  NDKPrivateKeySigner,
  NDKEvent,
  type NDKUser,
  type NDKSigner,
  type NDKSubscription,
} from './__mocks__/@nostr-dev-kit/ndk-mobile';
