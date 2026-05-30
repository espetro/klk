import NDK, { type NDKSigner } from '@klk/nostr-mobile';
import { Platform } from 'react-native';

const relayHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const RELAY_URL = `ws://${relayHost}:10547`;
export const RELAYS = [RELAY_URL];

let ndkInstance: NDK | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: RELAYS,
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

export async function connectNDKGuest(): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(5000);
  return ndk;
}
