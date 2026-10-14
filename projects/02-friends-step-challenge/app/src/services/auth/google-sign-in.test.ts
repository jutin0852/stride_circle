import { beforeEach, expect, it, vi } from 'vitest';
import { signInWithGoogle } from './google-sign-in';
const mock = vi.hoisted(() => ({ popup: vi.fn(), profile: vi.fn(), parameters: vi.fn(), user: { uid: 'test-walker' } }));
vi.mock('@/lib/auth', () => ({ createProfileIfMissing: mock.profile }));
vi.mock('@/lib/firebase', () => ({ auth: {}, requireFirebase: (value: unknown) => value }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { setCustomParameters = mock.parameters; },
  signInWithPopup: mock.popup,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mock.popup.mockReset().mockResolvedValue({ user: mock.user });
  mock.profile.mockResolvedValue(undefined);
});
it('completes web login using the Firebase popup flow', async () => {
  expect(await signInWithGoogle()).toBe('success');
  expect(mock.popup).toHaveBeenCalledTimes(1);
  expect(mock.parameters).toHaveBeenCalledWith({ prompt: 'select_account' });
  expect(mock.profile).toHaveBeenCalledWith(mock.user);
});
it('handles popup cancellation without surfacing an error', async () => {
  mock.popup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
  expect(await signInWithGoogle()).toBe('cancelled');
  expect(mock.profile).not.toHaveBeenCalled();
});
it('preserves provider and network failures for the user-facing error handler', async () => {
  const error = { code: 'auth/network-request-failed' };
  mock.popup.mockRejectedValueOnce(error);
  await expect(signInWithGoogle()).rejects.toBe(error);
});
