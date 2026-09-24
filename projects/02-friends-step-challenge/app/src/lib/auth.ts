import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

import { auth, database, requireFirebase } from '@/lib/firebase';
import {
  getAvatarChoiceFromUrl,
  getAvatarUrl,
  getDefaultAvatarChoice,
  type AvatarChoice,
} from '@/lib/avatar';

async function createProfileIfMissing(user: User) {
  const db = requireFirebase(database, 'Firestore');
  const profileReference = doc(db, 'users', user.uid);
  const existingProfile = await getDoc(profileReference);

  const storedAvatar = existingProfile.exists()
    ? getAvatarChoiceFromUrl(existingProfile.data().photoURL)
    : null;
  const avatar = storedAvatar ?? getAvatarChoiceFromUrl(user.photoURL) ?? getDefaultAvatarChoice(user.uid);
  const photoURL = getAvatarUrl(avatar);

  if (user.photoURL !== photoURL) await updateProfile(user, { photoURL });

  await setDoc(profileReference, {
    displayName: user.displayName ?? 'Stride Circle member',
    email: user.email,
    avatarSeed: avatar.seed,
    avatarStyle: avatar.style,
    photoURL,
    ...(existingProfile.exists() ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
  }, { merge: true });
}

export async function createAccount(input: { displayName: string; email: string; password: string }) {
  const firebaseAuth = requireFirebase(auth, 'Authentication');
  const credentials = await createUserWithEmailAndPassword(firebaseAuth, input.email.trim(), input.password);
  await updateProfile(credentials.user, { displayName: input.displayName.trim() });
  await createProfileIfMissing(credentials.user);
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
  await createProfileIfMissing(result.user);
}

export async function updateUserDisplayName(input: { displayName: string; user: User }) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Enter a name to save your profile.');

  await updateProfile(input.user, { displayName });
  const db = requireFirebase(database, 'Firestore');
  await setDoc(
    doc(db, 'users', input.user.uid),
    { displayName, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function updateUserAvatar(input: { avatar: AvatarChoice; user: User }) {
  const photoURL = getAvatarUrl(input.avatar);
  await updateProfile(input.user, { photoURL });

  const db = requireFirebase(database, 'Firestore');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'users', input.user.uid),
    { avatarSeed: input.avatar.seed, avatarStyle: input.avatar.style, photoURL, updatedAt: serverTimestamp() },
    { merge: true },
  );

  const memberships = await getDocs(collection(db, 'users', input.user.uid, 'circleMemberships'));
  memberships.forEach((membership) => {
    batch.set(
      doc(db, 'circles', membership.id, 'members', input.user.uid),
      { avatarSeed: input.avatar.seed, avatarStyle: input.avatar.style, photoURL, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
  await batch.commit();
}

export function signOutCurrentUser() {
  return signOut(requireFirebase(auth, 'Authentication'));
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
  };

  return messages[code] ?? (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}
