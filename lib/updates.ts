import { db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Constants from "expo-constants";

// Retrieve CURRENT_VERSION defined in app.json
export const CURRENT_VERSION = Constants.expoConfig?.version || "1.0.0";

export interface AppUpdateConfig {
  latestVersion: string;
  minVersion: string;
  releaseNotes: string[];
  playStoreUrl: string;
  appStoreUrl: string;
  enabled: boolean;
}

export const DEFAULT_UPDATE_CONFIG: AppUpdateConfig = {
  latestVersion: "1.0.0",
  minVersion: "1.0.0",
  releaseNotes: ["Performance improvements", "General bug fixes"],
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
  appStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
  enabled: true,
};

/**
 * Compares two semantic version strings (e.g. "1.0.0" and "1.1.0").
 * Returns:
 *   -1 if v1 < v2
 *   1  if v1 > v2
 *   0  if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const len = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

/**
 * Fetches the update configuration from Firestore document `/config/app_update`.
 * If it does not exist, it initializes it with DEFAULT_UPDATE_CONFIG.
 */
export async function fetchAppUpdateConfig(): Promise<AppUpdateConfig> {
  try {
    const docRef = doc(db, "config", "app_update");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppUpdateConfig;
    } else {
      // Auto-initialize document in Firestore
      await setDoc(docRef, DEFAULT_UPDATE_CONFIG);
      return DEFAULT_UPDATE_CONFIG;
    }
  } catch (error) {
    console.error("[Updates] Failed to fetch app update config from Firestore:", error);
    return DEFAULT_UPDATE_CONFIG;
  }
}
