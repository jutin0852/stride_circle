import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { createProfileIfMissing } from '@/lib/auth';
import { auth, requireFirebase } from '@/lib/firebase';

/** Web fallback. Metro selects google-sign-in.native.ts on iOS and Android. */
export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  try {
    const firebaseAuth = requireFirebase(auth, 'Authentication');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(firebaseAuth, provider);
    await createProfileIfMissing(result.user);
    return 'success';
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'cancelled';
    throw error;
  }
}
