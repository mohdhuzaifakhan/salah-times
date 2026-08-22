import notifee, {
  AndroidImportance,
  AndroidVisibility,
  Event,
  EventType,
  TriggerType,
} from "@notifee/react-native";
import { AudioPlayer, createAudioPlayer, setAudioModeAsync as setAudioModeAsyncExpoAudio } from "expo-audio";
import { Platform } from "react-native";
import { getAlarmSettings, PrayerKey } from "./alarm-settings";
import { getMasjidById, getPrimaryMasjidId } from "./store";
import { Masjid } from "./types";

const LOCAL_AZAAN_ASSET = require("../assets/sounds/Ghalwash.mp3");

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
 * Stops actively playing prayer alarm ringtone and clears displayed notifications from tray.
 * IMPORTANT: Does NOT cancel future scheduled trigger notifications!
 */
export async function stopPrayerAlarm() {
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }
  if (activePlayer) {
    try {
      activePlayer.pause();
    } catch {
      // Ignore cleanup errors
    }
    activePlayer = null;
  }

  try {
    // Only cancel currently displayed notification banners, NOT future scheduled triggers!
    await notifee.cancelDisplayedNotifications();
  } catch {
    // Ignore cleanup errors
  }

  notifyAlarmSubscribers({ isPlaying: false });
}

/**
 * Triggers a 30-second Azaan audio ringtone when a prayer notification arrives in foreground or user opens app.
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
 * Ensures high-priority Android notification channels are created for Azaan, Default, and Silent alarms.
 */
async function ensureAndroidChannels() {
  if (Platform.OS === "android") {
    // 1. High priority channel with native Azaan sound (azaan.mp3 in res/raw)
    await notifee.createChannel({
      id: "azaan-alarm",
      name: "Prayer Alarm (Azaan)",
      description: "High-priority Azaan sound notifications for Namaz prayer times.",
      importance: AndroidImportance.HIGH,
      vibrationPattern: [500, 250, 500, 250],
      lightColor: "#0D7377",
      vibration: true,
      lights: true,
      bypassDnd: true,
      sound: "azaan",
      visibility: AndroidVisibility.PUBLIC,
    });

    // 2. High priority channel with standard system default sound
    await notifee.createChannel({
      id: "default-alarm",
      name: "Prayer Alarm (Default Sound)",
      description: "High-priority system sound notifications for Namaz prayer times.",
      importance: AndroidImportance.HIGH,
      vibrationPattern: [500, 250, 500, 250],
      lightColor: "#0D7377",
      vibration: true,
      lights: true,
      bypassDnd: true,
      sound: "default",
      visibility: AndroidVisibility.PUBLIC,
    });

    // 3. Silent channel
    await notifee.createChannel({
      id: "silent-alarm",
      name: "Prayer Alarm (Silent)",
      description: "Silent notifications for Namaz prayer times.",
      importance: AndroidImportance.DEFAULT,
      vibration: false,
      visibility: AndroidVisibility.PUBLIC,
    });
  }
}

/**
 * Triggers a local system notification for admin alerts (e.g., when a user submits a Contact Us message).
 */
export async function sendLocalAdminNotification(title: string, body: string) {
  try {
    if (Platform.OS === "android") {
      await ensureAndroidChannels();
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: "azaan-alarm",
          pressAction: {
            id: "default",
          },
        },
      });
    } else {
      await notifee.displayNotification({
        title,
        body,
      });
    }
  } catch (err) {
    console.error("[Notifications] Error displaying local admin notification:", err);
  }
}

/**
 * Triggers a local system notification when a new Event is created.
 */
export async function sendEventNotification(
  event: { title: string; description: string; masjidId: string },
  masjidName?: string
) {
  try {
    const isGlobal = event.masjidId === "global";
    const primaryId = await getPrimaryMasjidId();

    if (isGlobal || (primaryId && primaryId === event.masjidId)) {
      const notifTitle = isGlobal
        ? `Announcement: ${event.title}`
        : `${masjidName || "Masjid Event"}: ${event.title}`;

      if (Platform.OS === "android") {
        await ensureAndroidChannels();
        await notifee.displayNotification({
          title: notifTitle,
          body: event.description,
          android: {
            channelId: "azaan-alarm",
            pressAction: {
              id: "default",
            },
          },
        });
      } else {
        await notifee.displayNotification({
          title: notifTitle,
          body: event.description,
        });
      }
    }
  } catch (err) {
    console.error("[Notifications] Error sending event notification:", err);
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

      // Cancel only previous scheduled prayer trigger notifications (preserve admin/event notifs)
      try {
        const existingIds = await notifee.getTriggerNotificationIds();
        for (const id of existingIds) {
          if (id.startsWith("prayer_")) {
            await notifee.cancelTriggerNotification(id);
          }
        }
      } catch (err) {
        console.warn("[Notifications] Error clearing existing trigger IDs:", err);
      }

      if (!settings.globalEnabled) {
        return;
      }

      // Request permissions
      try {
        const permResult = await notifee.requestPermission();
        if (permResult.authorizationStatus === 0) {
          console.warn("[Notifications] Notification permissions not granted by user.");
          return;
        }
      } catch (permErr) {
        console.warn("[Notifications] Error requesting notification permissions:", permErr);
      }

      await ensureAndroidChannels();

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

            const channelId =
              prayerConfig.sound === "azaan"
                ? "azaan-alarm"
                : prayerConfig.sound === "default"
                ? "default-alarm"
                : "silent-alarm";

            try {
              await notifee.createTriggerNotification(
                {
                  id: notificationId,
                  title: `⏰ ${prayerName} Alarm - ${offsetLabel}`,
                  body: bodyText,
                  data: {
                    masjidId: masjid.id,
                    prayer: prayerKey,
                    prayerName: prayerName,
                    masjidName: masjid.name,
                    isPrayerAlarm: "true",
                    offsetMinutes: String(prayerConfig.offsetMinutes || 0),
                  },
                  android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    vibrationPattern: settings.vibrate ? [500, 250, 500, 250] : undefined,
                    pressAction: {
                      id: "default",
                      launchActivity: "default",
                    },
                    actions: [
                      {
                        title: "STOP ALARM",
                        pressAction: { id: "stop" },
                      },
                    ],
                    autoCancel: true,
                  },
                },
                {
                  type: TriggerType.TIMESTAMP,
                  timestamp: targetTriggerTime.getTime(),
                  alarmManager: {
                    allowWhileIdle: true,
                  },
                }
              );
              scheduledCount++;
            } catch (singleSchedErr) {
              console.error(`[Notifications] Error scheduling notification ${notificationId}:`, singleSchedErr);
            }
          }
        }
      }
      console.log(`[Notifications] Successfully scheduled ${scheduledCount} exact prayer alarms via Notifee.`);
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
  return () => { };
}

/**
 * Handles background Notifee events registered in index.js outside React tree.
 * Executes when an exact alarm trigger notification fires or user interacts with notification while app process is backgrounded or killed.
 */
export async function handleNotifeeBackgroundEvent(event: Event) {
  const { type, detail } = event;

  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "stop") {
    await stopPrayerAlarm();
  }
}

/**
 * Initializes listeners for foreground Notifee notifications & user notification taps.
 * Also checks initial notification on app launch from killed state.
 */
export function setupPrayerAlarmListeners() {
  // Check if app was launched by tapping a prayer alarm notification
  notifee.getInitialNotification().then((initialNotif) => {
    if (initialNotif && initialNotif.notification?.data?.isPrayerAlarm === "true") {
      const data = initialNotif.notification.data;
      const prayerName = typeof data.prayerName === "string" ? data.prayerName : "Namaaz";
      const masjidName = typeof data.masjidName === "string" ? data.masjidName : "";
      const offsetMinutes = Number(data.offsetMinutes) || 0;
      void triggerPrayerAlarm(prayerName, masjidName, offsetMinutes);
    }
  }).catch((err) => {
    console.warn("[Notifications] Error checking initial notification:", err);
  });

  const unsubscribe = notifee.onForegroundEvent(async (event: Event) => {
    const { type, detail } = event;

    if (type === EventType.DELIVERED || type === EventType.PRESS) {
      const data = detail.notification?.data;
      if (data?.isPrayerAlarm === "true") {
        const prayerName = typeof data.prayerName === "string" ? data.prayerName : "Namaaz";
        const masjidName = typeof data.masjidName === "string" ? data.masjidName : "";
        const offsetMinutes = Number(data.offsetMinutes) || 0;
        await triggerPrayerAlarm(prayerName, masjidName, offsetMinutes);
      }
    } else if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "stop") {
      await stopPrayerAlarm();
    }
  });

  return unsubscribe;
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
    const existingIds = await notifee.getTriggerNotificationIds();
    for (const id of existingIds) {
      if (id.startsWith("prayer_")) {
        await notifee.cancelTriggerNotification(id);
      }
    }
    await stopPrayerAlarm();
  } catch (error) {
    console.error("[Notifications] Failed to clear notifications:", error);
  }
}

