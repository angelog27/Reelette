import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, signInFirebase, signOutFirebase, storeCustomToken, FIREBASE_CONFIGURED } from '../services/firebase';
import { getUser, saveUser, clearUser, clearServices, login, register, loginWithOAuth } from '../services/api';
import type { CurrentUser } from '../types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate user from AsyncStorage on startup
  useEffect(() => {
    (async () => {
      try {
        const stored = await getUser();
        if (stored) {
          setUser(stored);
          await signInFirebase();
        }
      } catch (e) {
        console.warn('[Auth] Startup rehydration failed:', e);
      } finally {
        // Always resolve loading — a throw must never leave the app stuck
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!FIREBASE_CONFIGURED) {
      throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable login.');
    }
    const data = await login(email, password);
    if (data.customToken) {
      await storeCustomToken(data.customToken);
      await signInFirebase();
    }
    const currentUser: CurrentUser = {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      avatarUrl: data.avatarUrl,
    };
    await saveUser(currentUser);
    setUser(currentUser);
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!FIREBASE_CONFIGURED) {
      throw new Error('Firebase is not configured. Add your Firebase keys to .env to enable registration.');
    }
    const data = await register(email, password, username);
    if (data.customToken) {
      await storeCustomToken(data.customToken);
      await signInFirebase();
    }
    const currentUser: CurrentUser = {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
    };
    await saveUser(currentUser);
    setUser(currentUser);
  }, []);

  const signOut = useCallback(async () => {
    await signOutFirebase();
    await clearUser();
    await clearServices();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = await getUser();
    setUser(stored);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
