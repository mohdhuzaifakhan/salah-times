import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { initializeApp as initializeFirebaseApp, deleteApp } from "firebase/app";
import { AdminUser, DEFAULT_TIMETABLE } from "./types";
import {
  createUserProfile,
  getUserProfile,
  createMasjid,
  getMasjidByAdminUid,
  getMasjidByAdminEmail,
} from "./store";
import { auth, firebaseConfig } from "./firebaseConfig";
import { isSuperAdminEmail, SUPER_ADMIN_EMAIL } from "./app-config";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth as getFirebaseAuth,
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

async function resolveProfileForUser(user: User): Promise<AdminUser | null> {
  const email = (user.email || "").trim().toLowerCase();
  if (!email) return null;

  const existingProfile = await getUserProfile(user.uid);
  if (existingProfile) return existingProfile;

  if (isSuperAdminEmail(email)) {
    return await createUserProfile(user.uid, email, "super_admin");
  }

  const assignedMasjid =
    (await getMasjidByAdminUid(user.uid)) || (await getMasjidByAdminEmail(email));

  if (!assignedMasjid) return null;

  return await createUserProfile(user.uid, email, "masjid_admin", assignedMasjid.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (user) {
          const profile = await resolveProfileForUser(user);
          setAdmin(profile);
        } else {
          setAdmin(null);
        }
      } catch (error) {
        console.error("Auth state handling error:", error);
        setAdmin(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await resolveProfileForUser(userCredential.user);
      if (!profile) {
        await signOut(auth);
        return { user: null, error: "No masjid assigned to this account. Contact super admin." };
      }
      return { user: profile };
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error?.code || '');
      return { user: null, error: message };
    }
  };

  const register = async (email: string, password: string, masjidName: string, city: string, address: string) => {
    const superAdminEmail = auth.currentUser?.email || "";
    if (!isSuperAdminEmail(superAdminEmail)) {
      return { error: "Only super admin can register masjid accounts." };
    }

    const masjidAdminEmail = email.trim().toLowerCase();
    if (masjidAdminEmail === SUPER_ADMIN_EMAIL) {
      return { error: "Super admin email cannot be used as masjid admin email." };
    }

    const existingMasjidForEmail = await getMasjidByAdminEmail(masjidAdminEmail);
    if (existingMasjidForEmail) {
      return { error: "This masjid admin email is already assigned to another masjid." };
    }

    const secondaryAppName = `secondary-auth-${Date.now()}`;
    const secondaryApp = initializeFirebaseApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getFirebaseAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        masjidAdminEmail,
        password
      );
      const uid = userCredential.user.uid;

      const masjid = await createMasjid({
        name: masjidName,
        city,
        address,
        adminUid: uid,
        adminEmail: masjidAdminEmail,
        timetable: { ...DEFAULT_TIMETABLE },
      });

      const masjidAdminUser = await createUserProfile(
        uid,
        masjidAdminEmail,
        "masjid_admin",
        masjid.id
      );
      return { admin: masjidAdminUser };
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error?.code || '');
      return { error: message };
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // no-op
      }
      await deleteApp(secondaryApp);
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
