import { NDKPrivateKeySigner } from '@klk/nostr-mobile';

import { deleteSecure, getSecure, setSecure } from '../storage/secure';

const NSEC_KEY = 'events_app_nsec';

export async function getOrCreateIdentity(): Promise<NDKPrivateKeySigner> {
  const stored = await getSecure(NSEC_KEY);
  if (stored) {
    return new NDKPrivateKeySigner(stored);
  }
  const signer = NDKPrivateKeySigner.generate();
  const nsec = signer.privateKey;
  if (!nsec) throw new Error('Failed to generate private key');
  await setSecure(NSEC_KEY, nsec);
  return signer;
}

export async function wipeIdentity(): Promise<void> {
  await deleteSecure(NSEC_KEY);
}
