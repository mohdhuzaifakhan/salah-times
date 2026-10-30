import { db } from "./firebaseConfig";
import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Retrieve CURRENT_VERSION defined in app.json (e.g. "1.0.0")
export const CURRENT_VERSION = Constants.expoConfig?.version || "1.0.0";
export const LAST_NOTIFIED_VERSION_KEY = "@salah_times_last_notified_update_version";
export const SKIPPED_VERSION_KEY = "@salah_times_skipped_update_version";

export interface AppUpdateConfig {
  latestVersion: string;
  minVersion: string;
  releaseNotes: string[];
  playStoreUrl: string;
  appStoreUrl: string;
  enabled: boolean;
  updatedAt?: number;
  notifyUsers?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
}

export const DEFAULT_UPDATE_CONFIG: AppUpdateConfig = {
  latestVersion: "1.0.0",
  minVersion: "1.0.0",
  releaseNotes: ["Performance improvements", "General bug fixes"],
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
  appStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
  enabled: true,
  updatedAt: Date.now(),
  notifyUsers: true,
};

/**
 * Robustly sanitizes and parses a version string into an array of integers.
 * E.g. "v1.2.3" -> [1, 2, 3]
 * E.g. " 1.0 "   -> [1, 0, 0]
 */
export function parseVersion(version: string): number[] {
  if (!version || typeof version !== "string") return [0, 0, 0];
  const clean = version.trim().replace(/^v/i, "");
  const parts = clean.split(".").map((p) => {
    const num = parseInt(p.replace(/\D/g, ""), 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts;
}

/**
 * Compares two semantic version strings safely.
 * Returns:
 *   -1 if v1 < v2
 *    1 if v1 > v2
 *    0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

/**
 * Sends an immediate local notification to the user's status bar about the new update.
 */
export async function notifyUserOfUpdate(config: AppUpdateConfig): Promise<boolean> {
  try {
    // 1. Check if user was already notified for this exact version release
    const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_VERSION_KEY);
    if (lastNotified === config.latestVersion) {
      return false;
    }

    // 2. Verify / Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Updates] Notification permission not granted; skipping system notification.");
      return false;
    }

    // 3. Setup Android Notification Channel if on Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("app_updates", {
        name: "App Updates",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0D7377",
        sound: "default",
      });
    }

    const noteHighlight =
      config.releaseNotes && config.releaseNotes.length > 0
        ? `What's new: ${config.releaseNotes[0]}`
        : "Tap to update Salah Times now and explore new features!";

    // 4. Schedule immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: config.notificationTitle || `🚀 New Update Available: v${config.latestVersion}`,
        body: config.notificationBody || noteHighlight,
        data: {
          type: "app_update",
          version: config.latestVersion,
          url: config.playStoreUrl || DEFAULT_UPDATE_CONFIG.playStoreUrl,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver immediately
    });

    // 5. Mark as notified so user is not spammed repeatedly
    await AsyncStorage.setItem(LAST_NOTIFIED_VERSION_KEY, config.latestVersion);
    return true;
  } catch (error) {
    console.error("[Updates] Failed to deliver update notification:", error);
    return false;
  }
}

/**
 * Real-time listener for app updates from Firestore.
 * Automatically triggers callback whenever admin saves a release.
 */
export function subscribeToAppUpdate(
  onUpdate: (config: AppUpdateConfig) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, "config", "app_update");
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUpdateConfig;
        onUpdate(data);
      } else {
        onUpdate(DEFAULT_UPDATE_CONFIG);
      }
    },
    (err) => {
      console.warn("[Updates] Real-time update subscription error:", err);
      onError?.(err);
    }
  );
}

/**
 * Fetches the update configuration from Firestore document `/config/app_update`.
 * If forceServer is true, it attempts to fetch directly from Firestore server to bypass stale cache.
 */
export async function fetchAppUpdateConfig(forceServer: boolean = false): Promise<AppUpdateConfig> {
  try {
    const docRef = doc(db, "config", "app_update");
    let docSnap;

    if (forceServer) {
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (serverErr) {
        console.warn("[Updates] getDocFromServer failed, falling back to cache/default:", serverErr);
        docSnap = await getDoc(docRef);
      }
    } else {
      docSnap = await getDoc(docRef);
    }

    if (docSnap.exists()) {
      return docSnap.data() as AppUpdateConfig;
    } else {
      // Auto-initialize document in Firestore
      await setDoc(docRef, DEFAULT_UPDATE_CONFIG);
      return DEFAULT_UPDATE_CONFIG;
    }
  } catch (error: any) {
    if (error?.code === "unavailable" || error?.message?.includes("offline")) {
      console.warn("[Updates] Device offline or Firestore unavailable; skipping update check.");
    } else {
      console.warn("[Updates] Unable to fetch update config from Firestore:", error?.message || error);
    }
    return DEFAULT_UPDATE_CONFIG;
  }
}

/**
 * Saves the updated app release configuration to Firestore document `/config/app_update`.
 */
export async function saveAppUpdateConfig(config: AppUpdateConfig): Promise<void> {
  try {
    const docRef = doc(db, "config", "app_update");
    await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    console.error("[Updates] Failed to save app update config to Firestore:", error);
    throw error;
  }
}

/**
 * Opens Google Play Store (or App Store) directly via market deep link with web URL fallback.
 */
export async function openPlayStore(customUrl?: string): Promise<void> {
  const targetUrl = customUrl?.trim() || DEFAULT_UPDATE_CONFIG.playStoreUrl;

  if (Platform.OS === "android") {
    // If it's a play store web URL, attempt market intent first
    if (targetUrl.includes("play.google.com/store/apps/details")) {
      const match = targetUrl.match(/id=([a-zA-Z0-9._]+)/);
      const pkg = match ? match[1] : "com.huzaifa.salahtimes";
      const marketUrl = `market://details?id=${pkg}`;
      try {
        const canOpen = await Linking.canOpenURL(marketUrl);
        if (canOpen) {
          await Linking.openURL(marketUrl);
          return;
        }
      } catch (e) {
        console.warn("[Updates] Failed to open market URL, falling back to web link:", e);
      }
    }
  }

  try {
    await Linking.openURL(targetUrl);
  } catch (err) {
    console.error("[Updates] Could not open store URL:", err);
  }
}

