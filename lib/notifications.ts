import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
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

interface AlarmState {
  isPlaying: boolean;
  prayerName?: string;
  masjidName?: string;
}

let activePlayer: AudioPlayer | null = null;
let alarmTimeout: ReturnType<typeof setTimeout> | number | null = null;
const alarmSubscribers: Array<(state: AlarmState) => void> = [];

export function subscribeAlarmState(callback: (state: AlarmState) => void) {
  alarmSubscribers.push(callback);
  return () => {
    const idx = alarmSubscribers.indexOf(callback);
    if (idx !== -1) alarmSubscribers.splice(idx, 1);
  };
}

function notifyAlarmSubscribers(state: AlarmState) {
  alarmSubscribers.forEach((cb) => cb(state));
}

/**
 * Immediately stops any actively playing prayer alarm ringtone.
 */
export async function stopPrayerAlarm() {
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }
  if (activePlayer) {
    try {
      activePlayer.pause();
    } catch (e) {
      // Ignore cleanup errors
    }
    activePlayer = null;
  }
  notifyAlarmSubscribers({ isPlaying: false });
}

/**
 * Triggers a 15-second loud alarm ringtone when a prayer notification arrives.
 * Automatically stops after 15 seconds or when stopPrayerAlarm() is called.
 */
export async function triggerPrayerAlarm(prayerName: string = "Namaaz", masjidName: string = "") {
  await stopPrayerAlarm();

  try {
    // Configure audio session using modern expo-audio API
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });

    const player = createAudioPlayer("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
    player.loop = true;
    player.volume = 1.0;
    player.play();

    activePlayer = player;
    notifyAlarmSubscribers({ isPlaying: true, prayerName, masjidName });

    // Automatically stop after exactly 15 seconds
    alarmTimeout = setTimeout(() => {
      void stopPrayerAlarm();
    }, 15000);
  } catch (error) {
    console.warn("Failed to play 15s prayer alarm sound:", error);
  }
}

/**
 * Ensures a high-priority, strict ALARM notification channel is created for Android.
 */
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer-alerts-alarm", {
      name: "Strict Prayer Alarm",
      description: "High-priority exact alarm notifications 10 minutes before prayer times.",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: "#0D7377",
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      bypassDnd: true, // Bypasses Do Not Disturb for critical prayer alarms
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }
}

/**
 * Schedules local notifications strictly 10 minutes BEFORE each prayer time
 * over the next 7 days.
 */
export async function schedulePrimaryMasjidNotifications(masjid: Masjid) {
  if (!masjid || !masjid.timetable) {
    console.warn("No timetable available for scheduling notifications.");
    return;
  }
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Notification permissions not granted!");
      return;
    }

    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const dailyPrayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
    const prayerLabels: Record<string, string> = {
      fajr: "Fajr",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
    };

    const now = new Date();

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);

      for (const prayerKey of dailyPrayers) {
        const timeStr = masjid.timetable[prayerKey];
        if (!timeStr) continue;

        const [hours, minutes] = timeStr.split(":").map(Number);
        
        // Exact prayer time on targetDay
        const prayerTime = new Date(
          targetDay.getFullYear(),
          targetDay.getMonth(),
          targetDay.getDate(),
          hours,
          minutes,
          0,
          0
        );

        // Calculate EXACT alert time: strictly 10 minutes BEFORE prayer time
        const alertTime = new Date(prayerTime.getTime() - 10 * 60 * 1000); 

        // If the exact alert time is in the past, skip
        if (alertTime.getTime() <= Date.now() + 5000) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${prayerLabels[prayerKey]} Alarm - 10 Mins Left`,
            body: `Waqt ho chuka hai! ${prayerLabels[prayerKey]} namaaz starts in 10 minutes at ${timeStr} in ${masjid.name}.`,
            sound: true,
            vibrate: [0, 500, 250, 500],
            data: {
              masjidId: masjid.id,
              prayer: prayerKey,
              prayerName: prayerLabels[prayerKey],
              masjidName: masjid.name,
              isPrayerAlarm: true,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alertTime,
            ...(Platform.OS === "android" ? { channelId: "prayer-alerts-alarm" } : {}),
          },
        });
      }
    }
    console.log("[Notifications] Successfully scheduled strict 10-min prayer alarms for primary masjid!");
  } catch (error) {
    console.error("[Notifications] Error scheduling prayer notifications:", error);
  }
}

/**
 * Initializes listeners for foreground notifications & user notification taps
 * to start or stop the 15-second alarm ringtone seamlessly.
 */
export function setupPrayerAlarmListeners() {
  // Trigger 15s alarm ring when notification arrives
  const notifSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    if (data?.isPrayerAlarm) {
      const prayerName = typeof data.prayerName === "string" ? data.prayerName : "Namaaz";
      const masjidName = typeof data.masjidName === "string" ? data.masjidName : "";
      void triggerPrayerAlarm(prayerName, masjidName);
    }
  });

  // Stop alarm if user taps the notification banner or action button
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    void stopPrayerAlarm();
  });

  return () => {
    notifSub.remove();
    responseSub.remove();
  };
}

export async function refreshPrimaryMasjidNotifications() {
  try {
    const primaryId = await getPrimaryMasjidId();
    if (!primaryId) return;
    const masjid = await getMasjidById(primaryId);
    if (masjid) {
      await schedulePrimaryMasjidNotifications(masjid);
    }
  } catch (error) {
    console.error("[Notifications] Failed to refresh primary masjid notifications:", error);
  }
}

export async function clearScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await stopPrayerAlarm();
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}
