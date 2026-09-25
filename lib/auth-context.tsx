import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteApp, initializeApp as initializeFirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth as getFirebaseAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { isSuperAdminEmail, SUPER_ADMIN_EMAIL } from "./app-config";
import { showCustomAlert } from "./custom-alert";
import { auth, db, firebaseConfig } from "./firebaseConfig";
import {
  createMasjid,
  createUserProfile,
  getMasjidByAdminEmail,
  getMasjidByAdminUid,
  getMasjidById,
  getUserProfile,
  getUserProfileByEmail,
} from "./store";
import { AdminUser, DEFAULT_TIMETABLE } from "./types";

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

export interface TempGuestSession {
  masjidId: string;
  masjidName: string;
  loggedInAt: number;
  expiresAt: number;
}

const TEMP_GUEST_SESSION_KEY = "@temp_guest_session_v1";

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: AdminUser | null; error?: string }>;
  loginAsGuest: (masjidId: string) => Promise<{ success: boolean; masjidName?: string; error?: string }>;
  register: (email: string, password: string, masjidName: string, city: string, address: string) => Promise<{ admin: AdminUser; error?: undefined } | { admin?: undefined; error: string }>;
  logout: () => Promise<void>;
  resetMasjidPasswordByAdmin: (masjidId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
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
    let isMounted = true;

    const checkTempSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem(TEMP_GUEST_SESSION_KEY);
        if (rawSession) {
          const session: TempGuestSession = JSON.parse(rawSession);
          const now = Date.now();
          if (now > session.expiresAt) {
            await AsyncStorage.removeItem(TEMP_GUEST_SESSION_KEY);
            if (isMounted) setAdmin(null);
            showCustomAlert(
              "⏰ Guest Access Expired",
              `Your 1-Day Guest Login for "${session.masjidName}" has ended. You have been automatically logged out.`
            );
          } else {
            if (!auth.currentUser && isMounted) {
              setAdmin({
                uid: `guest_${session.masjidId}`,
                email: `guest@${session.masjidName.toLowerCase().replace(/[^a-z0-9]/g, "") || "masjid"}.local`,
                role: "masjid_admin",
                masjidId: session.masjidId,
                isTempGuest: true,
                guestExpiresAt: session.expiresAt,
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to check temp guest session:", e);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (user) {
          await AsyncStorage.removeItem(TEMP_GUEST_SESSION_KEY);
          const profile = await resolveProfileForUser(user);
          if (isMounted) setAdmin(profile);
        } else {
          await checkTempSession();
        }
      } catch (error) {
        console.error("Auth state handling error:", error);
        if (isMounted) setAdmin(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    const interval = setInterval(async () => {
      const rawSession = await AsyncStorage.getItem(TEMP_GUEST_SESSION_KEY);
      if (rawSession) {
        const session: TempGuestSession = JSON.parse(rawSession);
        if (Date.now() > session.expiresAt) {
          await AsyncStorage.removeItem(TEMP_GUEST_SESSION_KEY);
          setAdmin((current) => {
            if (current?.isTempGuest) {
              showCustomAlert(
                "⏰ Guest Access Expired",
                `Your 1-Day Temporary Access for "${session.masjidName}" has ended.`
              );
              return null;
            }
            return current;
          });
        }
      }
    }, 60000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await AsyncStorage.removeItem(TEMP_GUEST_SESSION_KEY);
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

  const loginAsGuest = async (masjidId: string) => {
    try {
      const masjid = await getMasjidById(masjidId);
      if (!masjid) {
        return { success: false, error: "Masjid not found." };
      }
      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours (1 day)

      const session: TempGuestSession = {
        masjidId: masjid.id,
        masjidName: masjid.name,
        loggedInAt: now,
        expiresAt: expiresAt,
      };

      await AsyncStorage.setItem(TEMP_GUEST_SESSION_KEY, JSON.stringify(session));

      const tempAdmin: AdminUser = {
        uid: `guest_${masjid.id}`,
        email: `guest@${masjid.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "masjid"}.local`,
        role: "masjid_admin",
        masjidId: masjid.id,
        password: "",
        isTempGuest: true,
        guestExpiresAt: expiresAt,
      };

      setAdmin(tempAdmin);

      const { savePrimaryMasjidId } = await import("./store");
      await savePrimaryMasjidId(masjid.id, masjid);

      return { success: true, masjidName: masjid.name };
    } catch (error: any) {
      console.error("Guest login error:", error);
      return { success: false, error: error?.message || "Failed to log in as guest." };
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
        masjid.id,
        password
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

  const resetMasjidPasswordByAdmin = async (masjidId: string, newPassword: string) => {
    if (newPassword.trim().length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    try {
      const targetMasjid = await getMasjidById(masjidId);
      if (!targetMasjid) {
        return { success: false, error: "Masjid not found." };
      }

      let targetAdminUid = targetMasjid.adminUid;
      let targetAdminEmail = targetMasjid.adminEmail;

      let userProfile = targetAdminUid ? await getUserProfile(targetAdminUid) : null;
      if (!userProfile && targetAdminEmail) {
        userProfile = await getUserProfileByEmail(targetAdminEmail);
        if (userProfile?.uid) {
          targetAdminUid = userProfile.uid;
        }
      }

      const currentStoredPassword = userProfile?.password;

      const res = await updateMasjidAdminCredentials(
        masjidId,
        targetAdminUid || "",
        targetAdminEmail || userProfile?.email || "",
        currentStoredPassword,
        targetAdminEmail || userProfile?.email || "",
        newPassword.trim()
      );

      if (res.success) {
        return { success: true };
      } else {
        return { success: false, error: res.error || "Failed to reset password." };
      }
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      return { success: false, error: err?.message || "An error occurred while resetting password." };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TEMP_GUEST_SESSION_KEY);
      await signOut(auth);
      setAdmin(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const value = useMemo(
    () => ({ admin, isLoading, login, loginAsGuest, register, logout, resetMasjidPasswordByAdmin }),
    [admin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export async function updateMasjidAdminCredentials(
  masjidId: string,
  adminUid: string,
  currentEmail: string,
  currentPassword: string | undefined,
  newEmail: string,
  newPassword: string
): Promise<{ success: boolean; newUid?: string; error?: string }> {
  const secondaryAppName = `secondary-auth-update-${Date.now()}`;
  const secondaryApp = initializeFirebaseApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getFirebaseAuth(secondaryApp);

  try {
    let userToUpdate: any = null;
    let isNewUser = false;

    if (currentPassword && currentEmail) {
      try {
        const cred = await signInWithEmailAndPassword(secondaryAuth, currentEmail.trim().toLowerCase(), currentPassword);
        userToUpdate = cred.user;
      } catch {
        // Fallback to creating a new user if sign-in fails
      }
    }

    if (!userToUpdate) {
      // Create a new auth user since we can't update the old one
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim().toLowerCase(), newPassword);
        userToUpdate = cred.user;
        isNewUser = true;
      } catch (createErr: any) {
        const message = getFirebaseErrorMessage(createErr?.code || '');
        return { success: false, error: `Failed to create new user: ${message}` };
      }
    } else {
      // Update existing user
      try {
        if (currentEmail.trim().toLowerCase() !== newEmail.trim().toLowerCase()) {
          const { updateEmail: firebaseUpdateEmail } = require("firebase/auth");
          await firebaseUpdateEmail(userToUpdate, newEmail.trim().toLowerCase());
        }
        if (currentPassword !== newPassword) {
          const { updatePassword: firebaseUpdatePassword } = require("firebase/auth");
          await firebaseUpdatePassword(userToUpdate, newPassword);
        }
      } catch (updateErr: any) {
        const message = getFirebaseErrorMessage(updateErr?.code || '');
        return { success: false, error: `Failed to update credentials in Auth: ${message}` };
      }
    }

    const finalUid = userToUpdate.uid;

    // Update Firestore users collection
    const userRef = doc(db, "users", finalUid);
    const updatedUserData: AdminUser = {
      uid: finalUid,
      email: newEmail.trim().toLowerCase(),
      role: "masjid_admin",
      masjidId: masjidId,
      password: newPassword,
    };
    await setDoc(userRef, updatedUserData);

    // If a new user was created, delete the old Firestore user profile (if different)
    if (isNewUser && adminUid && adminUid !== finalUid) {
      try {
        await deleteDoc(doc(db, "users", adminUid));
      } catch (delErr) {
        console.warn("Failed to delete old user profile:", delErr);
      }
    }

    // Update the masjid document
    const masjidRef = doc(db, "masjids", masjidId);
    await updateDoc(masjidRef, {
      adminUid: finalUid,
      adminEmail: newEmail.trim().toLowerCase()
    });

    return { success: true, newUid: finalUid };
  } catch (err: any) {
    return { success: false, error: err.message || "An unknown error occurred." };
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch { }
    await deleteApp(secondaryApp);
  }
}

export async function deleteMasjidAndAuth(
  masjidId: string,
  adminUid: string,
  adminEmail: string | undefined,
  adminPassword?: string
): Promise<{ success: boolean; error?: string }> {
  // Try to delete Firebase Auth user first if we have password
  if (adminEmail && adminPassword) {
    const secondaryAppName = `secondary-auth-delete-${Date.now()}`;
    const secondaryApp = initializeFirebaseApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getFirebaseAuth(secondaryApp);

    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, adminEmail.trim().toLowerCase(), adminPassword);
      await deleteUser(cred.user);
    } catch (authErr) {
      console.warn("Could not delete Firebase Auth user (may not exist or bad password):", authErr);
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  // Now delete Firestore records
  try {
    // 1. Delete Masjid doc
    await deleteDoc(doc(db, "masjids", masjidId));

    // 2. Delete Admin User doc
    if (adminUid) {
      await deleteDoc(doc(db, "users", adminUid));
    }

    // 3. Delete related events
    const eventsQuery = query(collection(db, "events"), where("masjidId", "==", masjidId));
    const eventsSnap = await getDocs(eventsQuery);
    for (const d of eventsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 4. Delete admin notifications
    const notifsQuery = query(collection(db, "admin_notifications"), where("masjidId", "==", masjidId));
    const notifsSnap = await getDocs(notifsQuery);
    for (const d of notifsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 5. Delete masjid feedback messages
    const msgsQuery = query(collection(db, "masjid_messages"), where("masjidId", "==", masjidId));
    const msgsSnap = await getDocs(msgsQuery);
    for (const d of msgsSnap.docs) {
      await deleteDoc(d.ref);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete masjid data." };
  }
}
