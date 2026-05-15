import NDK, { NDKCacheAdapterSqlite } from "@nostr-dev-kit/ndk-mobile";

export const RELAY_URL = "ws://localhost:10547";
export const RELAYS = [RELAY_URL];

let _ndk: NDK | null = null;

export function getNDK(): NDK {
  if (!_ndk) {
    const cacheAdapter = new NDKCacheAdapterSqlite("events-app");
    cacheAdapter.initialize();
    _ndk = new NDK({
      explicitRelayUrls: RELAYS,
      cacheAdapter,
    });
  }
  return _ndk;
}
