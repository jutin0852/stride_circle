import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAvatarUrl, getDefaultAvatarChoice } from './avatar';
import { createAccount, signInWithEmail, signInWithGoogleIdToken } from './auth';

const mock = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  user: { uid: 'walker', displayName: 'Walker', email: 'walker@example.com', photoURL: null as string | null },
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: 'new-walker', displayName: null, email: 'new@example.com', photoURL: null } })),
  updateProfile: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: {}, database: {}, requireFirebase: (service: unknown) => service }));
vi.mock('@/services/notifications/walking-reminders', () => ({ walkingReminders: { activate: vi.fn() } }));
vi.mock('firebase/auth', () => ({
  getAdditionalUserInfo: (result: { additionalUserInfo?: unknown }) => result.additionalUserInfo ?? null,
  createUserWithEmailAndPassword: mock.createUserWithEmailAndPassword,
  GoogleAuthProvider: { credential: vi.fn(() => ({})) },
  signInWithCredential: vi.fn(async () => ({ user: mock.user })),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: mock.user })),
  signOut: vi.fn(),
  updateProfile: mock.updateProfile,
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(() => 'profile'),
  getDoc: vi.fn(async () => ({ exists: () => mock.profile !== null, data: () => mock.profile })),
  getDocs: vi.fn(), serverTimestamp: () => 'timestamp', setDoc: mock.setDoc, writeBatch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.profile = null;
  mock.user.photoURL = null;
});

describe('sign-in profile photos', () => {
  it('keeps an uploaded profile photo and restores it to Auth', async () => {
    const photoURL = 'https://firebasestorage.googleapis.com/profile-photo.jpg';
    mock.profile = { photoURL, avatarSeed: 'chosen', avatarStyle: 'cameo' };
    mock.user.photoURL = getAvatarUrl(getDefaultAvatarChoice('walker'));
    await signInWithEmail({ email: mock.user.email, password: 'password' });
    expect(mock.updateProfile).toHaveBeenCalledWith(mock.user, { photoURL });
    expect(mock.setDoc).toHaveBeenCalledWith('profile', expect.objectContaining({ photoURL, avatarSeed: 'chosen', avatarStyle: 'cameo' }), { merge: true });
  });

  it('keeps a Google photo when creating a new profile', async () => {
    mock.user.photoURL = 'https://lh3.googleusercontent.com/photo';
    await signInWithGoogleIdToken('token');
    expect(mock.updateProfile).not.toHaveBeenCalled();
    expect(mock.setDoc).toHaveBeenCalledWith('profile', expect.objectContaining({ photoURL: mock.user.photoURL }), { merge: true });
  });

  it('keeps the chosen character instead of replacing it with a provider photo', async () => {
    const photoURL = getAvatarUrl({ seed: 'chosen', style: 'cameo' });
    mock.profile = { photoURL };
    mock.user.photoURL = 'https://lh3.googleusercontent.com/photo';
    await signInWithGoogleIdToken('token');
    expect(mock.updateProfile).toHaveBeenCalledWith(mock.user, { photoURL });
  });

  it('creates a default character only when there is no photo', async () => {
    await signInWithEmail({ email: mock.user.email, password: 'password' });
    expect(mock.setDoc).toHaveBeenCalledWith('profile', expect.objectContaining({ photoURL: getAvatarUrl(getDefaultAvatarChoice('walker')) }), { merge: true });
  });

  it('marks an email account as needing first-run setup', async () => {
    await createAccount({ displayName: 'New Walker', email: 'new@example.com', password: 'password' });
    expect(mock.setDoc).toHaveBeenCalledWith('profile', expect.objectContaining({ onboardingVersion: 0 }), { merge: true });
  });

  it('ignores malformed stored photos and preserves a valid Auth photo', async () => {
    mock.profile = { photoURL: { invalid: true } };
    mock.user.photoURL = 'https://example.com/photo.jpg';
    await signInWithEmail({ email: mock.user.email, password: 'password' });
    expect(mock.updateProfile).not.toHaveBeenCalled();
    expect(mock.setDoc).toHaveBeenCalledWith('profile', expect.objectContaining({ photoURL: mock.user.photoURL }), { merge: true });
  });
});
