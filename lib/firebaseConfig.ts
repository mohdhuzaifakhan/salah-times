import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

function requiredEnv(
  name: string,
  value: string | undefined,
): string | undefined {
  if (!value) {
    console.warn(`Missing Firebase config: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: requiredEnv(
    "EXPO_PUBLIC_FIREBASE_APP_ID",
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db };
export { firebaseConfig };
