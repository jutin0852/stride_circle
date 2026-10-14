import { Platform } from 'react-native';
import { signInWithGoogleIdToken } from '@/lib/auth';
import { isGoogleClientId } from '@/lib/google-auth-config';

let configuredClientKey: string | null = null;

export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!isGoogleClientId(webClientId) || (Platform.OS === 'ios' && !isGoogleClientId(iosClientId))) {
    throw new Error('Google sign-in is not available in this version yet. Please use email to sign in.');
  }

  let sdk: typeof import('@react-native-google-signin/google-signin');
  try {
    // Existing development clients should still open and support email login.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('@react-native-google-signin/google-signin');
  } catch {
    throw new Error('This app needs an update to use Google sign-in. Please use email for now.');
  }

  try {
    const key = `${webClientId}:${iosClientId ?? ''}`;
    if (configuredClientKey !== key) {
      sdk.GoogleSignin.configure({ webClientId, ...(Platform.OS === 'ios' ? { iosClientId } : {}), offlineAccess: false });
      configuredClientKey = key;
    }
    if (Platform.OS === 'android') {
      await sdk.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const result = await sdk.GoogleSignin.signIn();
    if (result.type === 'cancelled') return 'cancelled';
    const idToken = result.data.idToken;
    if (!idToken) throw new Error('Google could not complete sign-in. Please try again.');
    await signInWithGoogleIdToken(idToken);
    return 'success';
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === sdk.statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
    if (code === sdk.statusCodes.IN_PROGRESS) throw new Error('Google sign-in is already open. Please finish it first.');
    if (code === sdk.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is unavailable. Update it or use email to sign in.');
    }
    if (code === '10' || code === 'DEVELOPER_ERROR') {
      throw new Error('Google sign-in is not ready for this app version. Please use email for now.');
    }
    // Firebase's known errors are handled centrally. Do not expose native SDK
    // configuration internals (client IDs, URL schemes, or stack traces) in UI.
    if (code.startsWith('auth/')) throw error;
    throw new Error('Google could not complete sign-in. Please try again.');
  }
}
