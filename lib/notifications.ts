import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import { createAudioPlayer, setAudioModeAsync as setAudioModeAsyncExpoAudio, AudioPlayer } from "expo-audio";
import { Masjid } from "./types";
import { getPrimaryMasjidId, getMasjidById } from "./store";
import { getUpcomingPrayerDetails } from "./prayer-timer";

const LOCAL_AZAAN_ASSET = require("../assets/sounds/azaan.mp3");

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
let activeAvSound: Audio.Sound | null = null;
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
  if (activeAvSound) {
    try {
      await activeAvSound.stopAsync();
      await activeAvSound.unloadAsync();
    } catch (e) {
      // Ignore cleanup errors
    }
    activeAvSound = null;
  }
  notifyAlarmSubscribers({ isPlaying: false });
}

/**
 * Triggers a 30-second Azaan audio ringtone when a prayer notification arrives.
 * Instantly opens the popup modal and plays bundled Azaan audio through full speaker.
 */
export async function triggerPrayerAlarm(prayerName: string = "Namaaz", masjidName: string = "") {
  await stopPrayerAlarm();

  // 1. Immediately open UI popup modal (0ms delay)
  notifyAlarmSubscribers({ isPlaying: true, prayerName, masjidName });

  // 2. Set automatic 30s stop timeout
  alarmTimeout = setTimeout(() => {
    void stopPrayerAlarm();
  }, 30000);

  // 3. Configure audio session using modern Expo 54 expo-audio API
  try {
    await setAudioModeAsyncExpoAudio({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  } catch (err) {
    console.warn("[Notifications] expo-audio setAudioModeAsync error:", err);
  }

  // 4. Play local bundled Azaan sound asset directly from assets/sounds/azaan.mp3
  try {
    console.log("[Notifications] Playing bundled local Azaan asset (assets/sounds/azaan.mp3)...");
    const player = createAudioPlayer(LOCAL_AZAAN_ASSET);
    player.loop = false;
    player.volume = 1.0;
    player.play();
    activePlayer = player;
    console.log("[Notifications] Local Azaan audio playing successfully!");
  } catch (err) {
    console.warn("[Notifications] Local Azaan asset play error:", err);
  }
}

/**
 * Ensures a high-priority, strict ALARM notification channel is created for Android.
 */
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer-alerts-alarm", {
      name: "Strict Prayer Alarm & Azaan",
      description: "High-priority exact alarm and Azaan notifications for primary masjid prayer times.",
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
 * Schedules local notifications for both exact prayer time (Azaan) and 10 minutes BEFORE
 * each prayer time over the next 7 days for the primary masjid.
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
    let scheduledCount = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);

      for (const prayerKey of dailyPrayers) {
        const timeStr = masjid.timetable[prayerKey];
        if (!timeStr || !timeStr.includes(":")) continue;

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

        // 1. Exact Prayer Time Notification (Azaan)
        if (prayerTime.getTime() > Date.now() + 2000) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🕌 ${prayerLabels[prayerKey]} Prayer Time - ${masjid.name}`,
              body: `Waqt ho gaya hai! It's time for ${prayerLabels[prayerKey]} namaaz at ${timeStr} in ${masjid.name}.`,
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
              date: prayerTime,
              ...(Platform.OS === "android" ? { channelId: "prayer-alerts-alarm" } : {}),
            },
          });
          scheduledCount++;
        }

        // 2. Pre-alarm: strictly 10 minutes BEFORE prayer time
        const preAlertTime = new Date(prayerTime.getTime() - 10 * 60 * 1000); 
        if (preAlertTime.getTime() > Date.now() + 2000) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ ${prayerLabels[prayerKey]} Alarm - 10 Mins Left`,
              body: `${prayerLabels[prayerKey]} namaaz starts in 10 minutes (${timeStr}) at ${masjid.name}.`,
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
              date: preAlertTime,
              ...(Platform.OS === "android" ? { channelId: "prayer-alerts-alarm" } : {}),
            },
          });
          scheduledCount++;
        }
      }
    }
    console.log(`[Notifications] Successfully scheduled ${scheduledCount} prayer notifications & Azaan alerts for primary masjid!`);
  } catch (error) {
    console.error("[Notifications] Error scheduling prayer notifications:", error);
  }
}

let lastTriggeredPrayerId = "";

/**
 * Starts a real-time interval watcher when app is in foreground.
 * Triggers Azaan automatically as soon as any prayer countdown reaches IS NOW.
 */
export function setupForegroundPrayerWatcher(getPrimaryMasjid: () => Masjid | null) {
  const checkInterval = setInterval(() => {
    const masjid = getPrimaryMasjid();
    if (!masjid || !masjid.timetable) return;

    const details = getUpcomingPrayerDetails(masjid.timetable);
    if (details.isNow && details.nextPrayerKey) {
      const todayStr = new Date().toISOString().split("T")[0];
      const triggerId = `${todayStr}_${details.nextPrayerKey}`;

      if (lastTriggeredPrayerId !== triggerId) {
        lastTriggeredPrayerId = triggerId;
        console.log(`[Notifications] Foreground watcher triggering Azaan for ${details.nextPrayerName}`);
        void triggerPrayerAlarm(details.nextPrayerName, masjid.name);
      }
    }
  }, 2000);

  return () => clearInterval(checkInterval);
}

/**
 * Initializes listeners for foreground notifications & user notification taps.
 */
export function setupPrayerAlarmListeners() {
  const notifSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    if (data?.isPrayerAlarm) {
      const prayerName = typeof data.prayerName === "string" ? data.prayerName : "Namaaz";
      const masjidName = typeof data.masjidName === "string" ? data.masjidName : "";
      void triggerPrayerAlarm(prayerName, masjidName);
    }
  });

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

