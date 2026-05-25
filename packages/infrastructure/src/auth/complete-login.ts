import { NDKPrivateKeySigner } from '@klk/nostr-mobile';

import { getOrCreateIdentity } from '../nostr/identity';
import { getSecure, setSecure } from '../storage/secure';

const ONBOARDING_KEY = 'onboarding_complete';
const OAUTH_CREDENTIAL_KEY = 'oauth_credential';
const OAUTH_PROVIDER_KEY = 'oauth_provider';

export type OAuthProvider = 'apple' | 'google';

export async function completeLogin(options: {
  method: 'oauth' | 'skip';
  provider?: OAuthProvider;
  credential?: string;
}): Promise<NDKPrivateKeySigner> {
  const signer = await getOrCreateIdentity();

  if (options.method === 'oauth') {
    if (!options.provider || !options.credential) {
      throw new Error('OAuth login requires provider and credential');
    }
    await setSecure(OAUTH_CREDENTIAL_KEY, options.credential);
    await setSecure(OAUTH_PROVIDER_KEY, options.provider);
  }

  await completeOnboarding();
  return signer;
}

export async function completeOnboarding(): Promise<void> {
  await setSecure(ONBOARDING_KEY, 'true');
}

export async function isOnboardingComplete(): Promise<boolean> {
  const value = await getSecure(ONBOARDING_KEY);
  return value === 'true';
}

export async function getOAuthProvider(): Promise<OAuthProvider | null> {
  const provider = await getSecure(OAUTH_PROVIDER_KEY);
  if (provider === 'apple' || provider === 'google') return provider;
  return null;
}
