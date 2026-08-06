import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  signInWithCustomToken,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

const CUSTOM_TOKEN_KEY = 'reelette_firebase_token';

/** Persist the custom token returned by the backend login endpoint. */
export function storeCustomToken(token: string): void {
  localStorage.setItem(CUSTOM_TOKEN_KEY, token);
}

/** Remove stored token — called on logout. */
export function clearFirebaseToken(): void {
  localStorage.removeItem(CUSTOM_TOKEN_KEY);
}

/**
 * Sign in to the Firebase client SDK using the stored custom token.
 * Returns true if the sign-in succeeded (or was already signed in).
 * Custom tokens are one-time-use; after the first sign-in the SDK
 * maintains the session automatically via its own refresh-token flow.
 */
export async function signInFirebase(): Promise<boolean> {
  if (auth.currentUser) return true;
  const token = localStorage.getItem(CUSTOM_TOKEN_KEY);
  if (!token) return false;
  try {
    await signInWithCustomToken(auth, token);
    // Token is one-time-use; clear it immediately — SDK manages the session via refresh tokens
    localStorage.removeItem(CUSTOM_TOKEN_KEY);
    return true;
  } catch {
    localStorage.removeItem(CUSTOM_TOKEN_KEY);
    return false;
  }
}

/** Sign the Firebase client SDK out — call alongside clearUser(). */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth).catch(() => {});
}

/** Sign in via Google popup. Returns the Firebase UserCredential. */
export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  return signInWithPopup(auth, provider);
}

