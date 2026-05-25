import NDK, { NDKCacheAdapterSqlite, NDKSigner } from '../__mocks__/@nostr-dev-kit/ndk-mobile';

export const RELAY_URL = 'ws://localhost:10547';
export const RELAYS = [RELAY_URL];

let ndkInstance: NDK | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    const cacheAdapter = new NDKCacheAdapterSqlite('events-app');
    cacheAdapter.initialize();
    ndkInstance = new NDK({
      explicitRelayUrls: RELAYS,
      cacheAdapter,
    });
  }
  return ndkInstance;
}

export function connectNDK(signer?: NDKSigner): NDK {
  const ndk = getNDK();
  if (signer) {
    ndk.signer = signer;
  }
  return ndk;
}
