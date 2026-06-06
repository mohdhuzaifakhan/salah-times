import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Masjid } from "./types";
import { getPrimaryMasjidId, getMasjidById } from "./store";

// Configure notifications presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldVibrate: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ensures a high-priority notification channel is created for Android.
 */
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer-alerts", {
      name: "Prayer Alerts",
      description: "Alerts sent exactly 10 minutes before prayer times.",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      enableVibrate: true,
      showBadge: false,
    });
  }
}

/**
 * Schedules local notifications for all prayer times over the next 7 days
 * for the given primary masjid.
 */
export async function schedulePrimaryMasjidNotifications(masjid: Masjid) {
  if (!masjid || !masjid.timetable) {
    console.warn("No timetable available for scheduling notifications.");
    return;
  }
  try {
    // 1. Request permissions if not already granted
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Notification permissions not granted!");
      return;
    }

    // 2. Ensure Android Notification Channel is created
    await ensureAndroidChannel();

    // 3. Clear all previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const dailyPrayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
    const prayerLabels: Record<string, string> = {
      fajr: "Fajr",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
    };

    // 4. Loop through the next 7 days and schedule alerts
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);

      for (const prayerKey of dailyPrayers) {
        const timeStr = masjid.timetable[prayerKey]; // e.g. "05:15"
        if (!timeStr) continue;

        const [hours, minutes] = timeStr.split(":").map(Number);
        
        // Target time for this prayer on this day
        const prayerTime = new Date(date);
        prayerTime.setHours(hours, minutes, 0, 0);

        // If the prayer time is already in the past, skip it
        if (prayerTime.getTime() <= Date.now()) {
          continue;
        }

        // Exact alert time: exactly 10 minutes BEFORE the actual namaaz time
        const alertTime = new Date(prayerTime.getTime() - 10 * 60 * 1000); 
        if (alertTime.getTime() <= Date.now()) continue;

        // 5. Schedule the high-priority notification with custom sounds and vibration
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 Namaaz Alert - ${prayerLabels[prayerKey]}`,
            body: `Waqt ho chuka hai! ${prayerLabels[prayerKey]} namaaz starts in 10 minutes at ${timeStr} in ${masjid.name}.`,
            sound: Platform.OS === "ios" ? "default" : true, // Vibrates and plays standard sound
            vibrate: [0, 250, 250, 250], // Custom vibration pattern: [delay, vibrate, pause, vibrate]
            data: { masjidId: masjid.id, prayer: prayerKey },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alertTime,
            ...(Platform.OS === "android" ? { channelId: "prayer-alerts" } : {}),
          },
        });
      }
    }
    console.log("Successfully scheduled prayer notifications for primary masjid!");
  } catch (error) {
    console.error("Error scheduling prayer notifications:", error);
  }
}

/**
 * Automatically retrieves the user's primary masjid and reschedules
 * prayer alerts for the upcoming 7 days to keep them refreshed and precise.
 */
export async function refreshPrimaryMasjidNotifications() {
  try {
    const primaryId = await getPrimaryMasjidId();
    if (!primaryId) {
      console.log("[Notifications] No primary masjid configured. Skipping notification refresh.");
      return;
    }
    const masjid = await getMasjidById(primaryId);
    if (masjid) {
      await schedulePrimaryMasjidNotifications(masjid);
      console.log(`[Notifications] Refreshed notifications for primary masjid: ${masjid.name}`);
    }
  } catch (error) {
    console.error("[Notifications] Failed to refresh primary masjid notifications:", error);
  }
}

/**
 * Clears all scheduled notifications (called when the primary masjid is unlinked)
 */
export async function clearScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Cleared all scheduled prayer notifications.");
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}
