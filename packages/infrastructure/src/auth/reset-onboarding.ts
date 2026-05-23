import { deleteSecure, getSecure } from "@/lib/storage/secure";

const ONBOARDING_KEY = "onboarding_complete";
const OAUTH_CREDENTIAL_KEY = "oauth_credential";
const OAUTH_PROVIDER_KEY = "oauth_provider";

export async function resetOnboarding(options?: { clearOAuth?: boolean }): Promise<void> {
  await deleteSecure(ONBOARDING_KEY);

  if (options?.clearOAuth) {
    await deleteSecure(OAUTH_CREDENTIAL_KEY);
    await deleteSecure(OAUTH_PROVIDER_KEY);
  }
}
