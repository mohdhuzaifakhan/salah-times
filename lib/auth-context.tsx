import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { AdminUser, DEFAULT_TIMETABLE } from "./types";
import { createUserProfile, getUserProfile, createMasjid } from "./store";
import { auth } from "./firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: AdminUser | null; error?: string }>;
  register: (email: string, password: string, masjidName: string, city: string, address: string) => Promise<{ admin: AdminUser; error?: undefined } | { admin?: undefined; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setAdmin(profile);
        } else {
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(userCredential.user.uid);
      return { user: profile };
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error?.code || '');
      return { user: null, error: message };
    }
  };

  const register = async (email: string, password: string, masjidName: string, city: string, address: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const masjid = await createMasjid({
        name: masjidName,
        city,
        address,
        adminUid: uid,
        timetable: { ...DEFAULT_TIMETABLE },
      });

      const adminUser = await createUserProfile(uid, email, masjid.id);
      setAdmin(adminUser);

      return { admin: adminUser };
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error?.code || '');
      return { error: message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAdmin(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const value = useMemo(
    () => ({ admin, isLoading, login, register, logout }),
    [admin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

