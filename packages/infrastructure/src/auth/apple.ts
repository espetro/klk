import * as AppleAuthentication from 'expo-apple-authentication';

export interface AppleSignInResult {
  identityToken: string | null;
  user: string;
  email: string | null;
  fullName: AppleAuthentication.AppleAuthenticationFullName | null;
}

export function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const available = await isAppleSignInAvailable();
    if (!available) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    return {
      identityToken: credential.identityToken,
      user: credential.user,
      email: credential.email ?? null,
      fullName: credential.fullName ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'APPLE_AUTHENTICATION_CANCELED') {
      throw new Error('Apple Sign-In was cancelled', { cause: error });
    }
    throw new Error(
      `Apple Sign-In failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}
