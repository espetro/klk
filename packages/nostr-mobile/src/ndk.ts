import NDK, { NDKPrivateKeySigner, type NDKSigner } from '@nostr-dev-kit/ndk';

import type { KlkSQLiteCacheAdapter } from './cache/sqlite';

export interface CreateNDKOptions {
  relayUrls: string[];
  signer?: NDKSigner;
  cacheAdapter?: KlkSQLiteCacheAdapter;
}

export async function createNDK(opts: CreateNDKOptions): Promise<NDK> {
  const ndk = new NDK({
    explicitRelayUrls: opts.relayUrls,
    ...(opts.cacheAdapter ? { cacheAdapter: opts.cacheAdapter } : {}),
  });
  if (opts.signer) {
    ndk.signer = opts.signer;
  }
  await ndk.connect();
  return ndk;
}

export { NDKPrivateKeySigner };
