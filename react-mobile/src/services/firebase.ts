import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { storage } from '../lib/storage';

// ── Known values derived from .firebaserc (project ID is not secret) ─────────
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'reelette-project';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${PROJECT_ID}.firebaseapp.com`,
  projectId:         PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Firebase requires apiKey to initialize. If it's missing we skip init and
// export null stubs so the rest of the app doesn't crash.
const FIREBASE_CONFIGURED = !!firebaseConfig.apiKey;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (FIREBASE_CONFIGURED) {
  _app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db   = getFirestore(_app);
} else {
  console.warn(
    '[Reelette] Firebase not configured — auth will be unavailable.\n' +
    'Add EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,\n' +
    'and EXPO_PUBLIC_FIREBASE_APP_ID to your .env file to enable login.'
  );
}

export const auth = _auth;
export const db   = _db;
export { FIREBASE_CONFIGURED };

const TOKEN_KEY = 'reelette_firebase_token';

export async function storeCustomToken(token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
}

export async function clearFirebaseToken(): Promise<void> {
  await storage.removeItem(TOKEN_KEY);
}

export async function signInFirebase(): Promise<boolean> {
  if (!_auth) return false;
  try {
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) return false;
    await signInWithCustomToken(_auth, token);
    return true;
  } catch {
    await clearFirebaseToken();
    return false;
  }
}

export async function signOutFirebase(): Promise<void> {
  if (_auth) {
    try { await signOut(_auth); } catch {}
  }
  await clearFirebaseToken();
}
