import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

import { auth, database, requireFirebase } from '@/lib/firebase';
import { walkingReminders } from '@/services/notifications/walking-reminders';
import {
  getAvatarChoiceFromUrl,
  getAvatarUrl,
  getDefaultAvatarChoice,
  getProfilePhotoURL,
  isAvatarStyle,
  type AvatarChoice,
} from '@/lib/avatar';

export async function createProfileIfMissing(user: User, options: { startOnboarding?: boolean } = {}) {
  const db = requireFirebase(database, 'Firestore');
  const profileReference = doc(db, 'users', user.uid);
  const existingProfile = await getDoc(profileReference);

  const profile = existingProfile.exists() ? existingProfile.data() : null;
  const storedPhotoURL = getRemotePhotoURL(profile?.photoURL);
  const authPhotoURL = getRemotePhotoURL(user.photoURL);
  const storedAvatar = getAvatarChoiceFromUrl(storedPhotoURL)
    ?? (typeof profile?.avatarSeed === 'string' && profile.avatarSeed && isAvatarStyle(profile.avatarStyle)
      ? { seed: profile.avatarSeed, style: profile.avatarStyle }
      : null);
  const avatar = storedAvatar ?? getAvatarChoiceFromUrl(authPhotoURL) ?? getDefaultAvatarChoice(user.uid);
  // The saved profile is authoritative, including real photos and chosen characters.
  // Only generate a character URL when neither profile nor Auth has a usable photo.
  const photoURL = storedPhotoURL ?? authPhotoURL ?? getAvatarUrl(avatar);

  if (user.photoURL !== photoURL) await updateProfile(user, { photoURL });

  await setDoc(profileReference, {
    // Matches the member-record name so Firestore Rules accept circle joins.
    displayName: user.displayName?.trim() || 'Wakà member',
    email: user.email,
    avatarSeed: avatar.seed,
    avatarStyle: avatar.style,
    photoURL,
    ...(!existingProfile.exists() && options.startOnboarding ? { onboardingVersion: 0 } : {}),
    ...(existingProfile.exists() ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
  }, { merge: true });
}

function getRemotePhotoURL(value: unknown): string | null {
  const photo = getProfilePhotoURL(value);
  if (photo) return photo;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

export async function createAccount(input: { displayName: string; email: string; password: string }) {
  const firebaseAuth = requireFirebase(auth, 'Authentication');
  const credentials = await createUserWithEmailAndPassword(firebaseAuth, input.email.trim(), input.password);
  await updateProfile(credentials.user, { displayName: input.displayName.trim() });
  await createProfileIfMissing(credentials.user, { startOnboarding: true });
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const firebaseAuth = requireFirebase(auth, 'Authentication');
  const credentials = await signInWithEmailAndPassword(firebaseAuth, input.email.trim(), input.password);
  await createProfileIfMissing(credentials.user);
}

export async function signInWithGoogleIdToken(idToken: string) {
  const firebaseAuth = requireFirebase(auth, 'Authentication');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
  // Firebase v12 exposes the new-user flag through getAdditionalUserInfo.
  // Existing members must never be sent through setup.
  const isNewUser = getAdditionalUserInfo(result)?.isNewUser === true;
  await createProfileIfMissing(result.user, { startOnboarding: isNewUser });
}

export async function updateUserDisplayName(input: { displayName: string; user: User }) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Enter a name to save your profile.');

  await updateProfile(input.user, { displayName });
  const db = requireFirebase(database, 'Firestore');
  const publicReference = doc(db, 'publicProfiles', input.user.uid);
  const hasPublicProfile = (await getDoc(publicReference)).exists();
  // The searchable name must change in the same write as the private one.
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', input.user.uid), { displayName, updatedAt: serverTimestamp() }, { merge: true });
  if (hasPublicProfile) batch.update(publicReference, { displayName, displayNameLower: displayName.toLowerCase(), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function updateUserAvatar(input: { avatar: AvatarChoice; user: User }) {
  const photoURL = getAvatarUrl(input.avatar);

  const db = requireFirebase(database, 'Firestore');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'users', input.user.uid),
    { avatarSeed: input.avatar.seed, avatarStyle: input.avatar.style, photoURL, photoAsset: input.avatar.photoAsset ?? null, updatedAt: serverTimestamp() },
    { merge: true },
  );

  const publicReference = doc(db, 'publicProfiles', input.user.uid);
  if ((await getDoc(publicReference)).exists()) {
    batch.update(publicReference, { avatarSeed: input.avatar.seed, avatarStyle: input.avatar.style, updatedAt: serverTimestamp() });
  }

  const memberships = await getDocs(collection(db, 'users', input.user.uid, 'circleMemberships'));
  memberships.forEach((membership) => {
    batch.set(
      doc(db, 'circles', membership.id, 'members', input.user.uid),
      { avatarSeed: input.avatar.seed, avatarStyle: input.avatar.style, photoURL, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
  await batch.commit();
  // Firestore is authoritative. An Auth refresh failure must not undo a saved photo.
  await updateProfile(input.user, { photoURL }).catch(() => {});
}

export async function signOutCurrentUser() {
  const firebaseAuth = requireFirebase(auth, 'Authentication');
  const previousUserId = firebaseAuth.currentUser?.uid ?? null;
  await walkingReminders.activate(null);
  try { await signOut(firebaseAuth); }
  catch (error) {
    await walkingReminders.activate(previousUserId).catch(() => {});
    throw error;
  }
}

export function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'That email already has an account. Try signing in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'That email or password is not correct.',
    'auth/network-request-failed': 'Check your internet connection, then try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/weak-password': 'Use a password with at least six characters.',
    'auth/account-exists-with-different-credential': 'This email already uses another sign-in method. Sign in with that method first.',
    'auth/operation-not-allowed': 'This sign-in method is not available yet. Please use email to sign in.',
    'auth/unauthorized-domain': 'Google sign-in is not available from this web address yet.',
    'auth/popup-blocked': 'Allow the sign-in pop-up in your browser, then try again.',
  };

  return messages[code] ?? (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}
