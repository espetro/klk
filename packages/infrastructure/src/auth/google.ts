import { makeRedirectUri } from 'expo-auth-session';
import { openAuthSessionAsync, maybeCompleteAuthSession } from 'expo-web-browser';

export interface GoogleSignInResult {
  accessToken: string;
  idToken?: string | undefined;
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const redirectUri = makeRedirectUri({});

    const authUrl =
      `${GOOGLE_AUTH_ENDPOINT}?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent('openid profile email')}`;

    const result = await openAuthSessionAsync(authUrl, redirectUri);
    maybeCompleteAuthSession();

    if (result.type === 'success' && result.url) {
      const params = new URLSearchParams(result.url.split('#')[1] ?? '');
      const accessToken = params.get('access_token');

      if (!accessToken) {
        throw new Error('Google Sign-In failed: no access token received');
      }

      return {
        accessToken,
        idToken: params.get('id_token') ?? undefined,
      };
    }

    if (result.type === 'cancel') {
      throw new Error('Google Sign-In was cancelled');
    }

    throw new Error('Google Sign-In failed: no access token received');
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Google Sign-In failed: Unknown error');
  }
}
