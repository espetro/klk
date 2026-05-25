// Re-export NDK core (NDK default class + essential exports)
export { default } from '@nostr-dev-kit/ndk';
export {
  NDKEvent,
  NDKPrivateKeySigner,
} from '@nostr-dev-kit/ndk';
export type {
  NDKCacheAdapter,
  NDKFilter,
  NDKRelay,
  NDKSigner,
  NDKSubscription,
  NDKUser,
  NDKKind,
} from '@nostr-dev-kit/ndk';

// Local additions
export { KlkSQLiteCacheAdapter } from './cache/sqlite';
export { createNDK } from './ndk';
export type { CreateNDKOptions } from './ndk';
