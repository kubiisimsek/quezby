import { appleAuth } from '@invertase/react-native-apple-authentication';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SocialProvider } from '@quezby/types';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { GOOGLE_CLIENTS } from '@/config/env';

/** The player closed Apple's or Google's sheet. Not an error worth a word. */
export class SignInCancelled extends Error {
  constructor() {
    super('Sign-in cancelled.');
    this.name = 'SignInCancelled';
  }
}

/** Which buttons this build can offer: Apple on iOS, Google once its client ids are set. */
export function socialAvailability(): Record<SocialProvider, boolean> {
  return {
    apple: Platform.OS === 'ios' && appleAuth.isSupported,
    google: GOOGLE_CLIENTS !== null,
  };
}

/**
 * Apple's proof of who the player is. The nonce comes from the API, which
 * issued it once and checks that Apple signed its hash into the token — a
 * token caught in transit cannot be replayed.
 */
export async function appleCredential(): Promise<{
  identityToken: string;
  nonce: string;
  authorizationCode: string | null;
}> {
  const { nonce } = await api.auth.nonce();
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL],
      nonce,
    });
    if (!response.identityToken) throw new Error('Apple returned no identity token.');
    return { identityToken: response.identityToken, nonce, authorizationCode: response.authorizationCode };
  } catch (error) {
    if ((error as { code?: string }).code === appleAuth.Error.CANCELED) throw new SignInCancelled();
    throw error;
  }
}

let googleReady = false;

/** Google's ID token for the account the player picks — every time, so accounts can be switched. */
export async function googleCredential(): Promise<{ idToken: string }> {
  if (!GOOGLE_CLIENTS) throw new Error('Google sign-in is not configured for this build.');
  if (!googleReady) {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENTS.webClientId,
      ...(GOOGLE_CLIENTS.iosClientId ? { iosClientId: GOOGLE_CLIENTS.iosClientId } : {}),
    });
    googleReady = true;
  }
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) throw new SignInCancelled();
    if (!response.data.idToken) throw new Error('Google returned no ID token.');
    return { idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) throw new SignInCancelled();
    throw error;
  }
}
