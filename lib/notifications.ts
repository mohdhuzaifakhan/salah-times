import { AudioPlayer, createAudioPlayer, setAudioModeAsync as setAudioModeAsyncExpoAudio } from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAlarmSettings, PrayerKey } from "./alarm-settings";
import { getMasjidById, getPrimaryMasjidId } from "./store";
import { Masjid } from "./types";

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
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

interface AlarmState {
  isPlaying: boolean;
  prayerName?: string;
  masjidName?: string;
  offsetMinutes?: number;
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
 * Triggers a 30-second Azaan audio ringtone when a prayer notification arrives.
 * Instantly opens the popup modal and plays bundled Azaan audio through speaker.
 */
export async function triggerPrayerAlarm(
  prayerName: string = "Namaaz",
  masjidName: string = "",
  offsetMinutes?: number
) {
  await stopPrayerAlarm();

  // 1. Immediately open UI popup modal (0ms delay)
  notifyAlarmSubscribers({ isPlaying: true, prayerName, masjidName, offsetMinutes });

  // 2. Set automatic 30s stop timeout
  alarmTimeout = setTimeout(() => {
    void stopPrayerAlarm();
  }, 30000);

  // 3. Configure audio session
  try {
    await setAudioModeAsyncExpoAudio({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  } catch (err) {
    console.warn("[Notifications] expo-audio setAudioModeAsync error:", err);
  }

  // 4. Play local bundled Azaan sound asset directly with expo-audio
  try {
    const player = createAudioPlayer(LOCAL_AZAAN_ASSET);
    player.loop = false;
    player.volume = 1.0;
    player.play();
    activePlayer = player;
  } catch (err) {
    console.warn("[Notifications] expo-audio play error:", err);
  }
}

/**
 * Ensures a high-priority, strict ALARM notification channel is created for Android.
 */
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer-alerts-alarm", {
      name: "Prayer Alarm & Azaan",
      description: "High-priority alarm and Azaan notifications for Namaz prayer times.",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: "#0D7377",
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      bypassDnd: true, // Bypasses Do Not Disturb for critical prayer alarms
      sound: "azaan", // Referencing raw/azaan.mp3 natively
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }
}

// Global scheduling mutex to prevent race conditions & duplicate schedules
let activeSchedulingPromise: Promise<void> | null = null;

export async function schedulePrimaryMasjidNotifications(masjid: Masjid): Promise<void> {
  if (activeSchedulingPromise) {
    await activeSchedulingPromise;
  }

  activeSchedulingPromise = (async () => {
    if (!masjid || !masjid.timetable) {
      console.warn("[Notifications] No timetable available for scheduling notifications.");
      return;
    }
    try {
      const settings = await getAlarmSettings();

      // Clean up previous scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!settings.globalEnabled) {
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("[Notifications] Notification permissions not granted!");
        return;
      }

      await ensureAndroidChannel();

      const dailyPrayers: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      const prayerLabels: Record<PrayerKey, string> = {
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
        const dateFormatted = `${targetDay.getFullYear()}-${(targetDay.getMonth() + 1).toString().padStart(2, "0")}-${targetDay.getDate().toString().padStart(2, "0")}`;
        const isFriday = targetDay.getDay() === 5;

        for (const prayerKey of dailyPrayers) {
          const prayerConfig = settings.prayers[prayerKey];

          // Skip if alarm is disabled for this specific Namaz
          if (!prayerConfig || !prayerConfig.enabled) {
            continue;
          }

          const isDhuhrOnFriday = prayerKey === "dhuhr" && isFriday;
          const prayerName = isDhuhrOnFriday ? "Jummah" : prayerLabels[prayerKey];
          const timeStr = isDhuhrOnFriday
            ? (masjid.timetable.jummah || masjid.timetable.dhuhr)
            : masjid.timetable[prayerKey];

          if (!timeStr || !timeStr.includes(":")) continue;

          const [hours, minutes] = timeStr.split(":").map(Number);

          const prayerTime = new Date(
            targetDay.getFullYear(),
            targetDay.getMonth(),
            targetDay.getDate(),
            hours,
            minutes,
            0,
            0
          );

          // Calculate target trigger time based on per-prayer offset
          const offsetMs = (prayerConfig.offsetMinutes || 0) * 60 * 1000;
          const targetTriggerTime = new Date(prayerTime.getTime() - offsetMs);

          if (targetTriggerTime.getTime() > Date.now() + 2000) {
            const notificationId = `prayer_${prayerKey}_${dateFormatted}_${masjid.id}`;

            const offsetLabel = prayerConfig.offsetMinutes > 0
              ? `${prayerConfig.offsetMinutes} Mins Left`
              : "Prayer Time";

            const bodyText = prayerConfig.offsetMinutes > 0
              ? `${prayerName} namaaz starts in ${prayerConfig.offsetMinutes} minutes (${timeStr}) at ${masjid.name}.`
              : `It is time for ${prayerName} namaaz (${timeStr}) at ${masjid.name}.`;

            const soundName = prayerConfig.sound === "azaan" ? "azaan.mp3" : prayerConfig.sound === "default" ? "default" : undefined;

            await Notifications.scheduleNotificationAsync({
              identifier: notificationId,
              content: {
                title: `⏰ ${prayerName} Alarm - ${offsetLabel}`,
                body: bodyText,
                sound: soundName,
                vibrate: settings.vibrate ? [0, 500, 250, 500] : undefined,
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: {
                  masjidId: masjid.id,
                  prayer: prayerKey,
                  prayerName: prayerName,
                  masjidName: masjid.name,
                  isPrayerAlarm: true,
                  offsetMinutes: prayerConfig.offsetMinutes,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: targetTriggerTime,
                ...(Platform.OS === "android" ? { channelId: "prayer-alerts-alarm" } : {}),
              },
            });
            scheduledCount++;
          }
        }
      }
    } catch (error) {
      console.error("[Notifications] Error scheduling prayer notifications:", error);
    }
  })();

  try {
    await activeSchedulingPromise;
  } finally {
    activeSchedulingPromise = null;
  }
}

/**
 * Foreground watcher placeholder for primary masjid countdown state (no duplicate triggers).
 */
export function setupForegroundPrayerWatcher(_getPrimaryMasjid: () => Masjid | null) {
  // Foreground alerts are handled directly by NotificationReceivedListener when scheduled 10m alert arrives
  return () => { };
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
      const offsetMinutes = typeof data.offsetMinutes === "number" ? data.offsetMinutes : 10;
      void triggerPrayerAlarm(prayerName, masjidName, offsetMinutes);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.isPrayerAlarm) {
      const prayerName = typeof data.prayerName === "string" ? data.prayerName : "Namaaz";
      const masjidName = typeof data.masjidName === "string" ? data.masjidName : "";
      const offsetMinutes = typeof data.offsetMinutes === "number" ? data.offsetMinutes : 10;
      void triggerPrayerAlarm(prayerName, masjidName, offsetMinutes);
    } else {
      void stopPrayerAlarm();
    }
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
    console.error("[Notifications] Failed to clear notifications:", error);
  }
}


