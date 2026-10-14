// Native SDK behavior belongs to the Jest/React Native test runner.
import { Platform } from 'react-native';
import { signInWithGoogle } from './google-sign-in.native';

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockFirebaseSignIn = jest.fn();
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES' },
}));
jest.mock('@/lib/auth', () => ({ signInWithGoogleIdToken: (...args: unknown[]) => mockFirebaseSignIn(...args) }));

const originalWebId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const originalIOSId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
let sequence = 0;
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'ios');
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = `123-web-${sequence++}.apps.googleusercontent.com`;
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '123-ios.apps.googleusercontent.com';
  mockSignIn.mockReset().mockResolvedValue({ type: 'success', data: { idToken: 'test-id-token' } });
  mockFirebaseSignIn.mockReset().mockResolvedValue(undefined);
  mockHasPlayServices.mockReset().mockResolvedValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalWebId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebId;
  if (originalIOSId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIOSId;
});

it('configures iOS identity-only sign-in and exchanges the token with Firebase', async () => {
  expect(await signInWithGoogle()).toBe('success');
  expect(mockConfigure).toHaveBeenCalledWith({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, offlineAccess: false });
  expect(mockHasPlayServices).not.toHaveBeenCalled();
  expect(mockFirebaseSignIn).toHaveBeenCalledWith('test-id-token');
});
it('does not require iOS credentials on Android and checks Play Services', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  expect(await signInWithGoogle()).toBe('success');
  expect(mockConfigure).toHaveBeenCalledWith({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
  expect(mockHasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
});
it('treats closing the Google dialog as cancellation rather than an error', async () => {
  mockSignIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
  expect(await signInWithGoogle()).toBe('cancelled');
  mockSignIn.mockRejectedValueOnce({ code: 'CANCELLED' });
  expect(await signInWithGoogle()).toBe('cancelled');
  expect(mockFirebaseSignIn).not.toHaveBeenCalled();
});
it('does not attempt Firebase login without an ID token', async () => {
  mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: null } });
  await expect(signInWithGoogle()).rejects.toThrow('Google could not complete sign-in');
  expect(mockFirebaseSignIn).not.toHaveBeenCalled();
});
it('keeps the current account safe when configuration is missing', async () => {
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  await expect(signInWithGoogle()).rejects.toThrow('Google sign-in is not available');
  expect(mockSignIn).not.toHaveBeenCalled();
  expect(mockFirebaseSignIn).not.toHaveBeenCalled();
});
it('presents a usable fallback for Play Services and signing-certificate errors', async () => {
  mockSignIn.mockRejectedValueOnce({ code: 'PLAY_SERVICES' });
  await expect(signInWithGoogle()).rejects.toThrow('Google Play Services is unavailable');
  mockSignIn.mockRejectedValueOnce({ code: '10' });
  await expect(signInWithGoogle()).rejects.toThrow('Google sign-in is not ready');
});
