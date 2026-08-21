import AsyncStorage from "@react-native-async-storage/async-storage";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type AlarmSoundOption = "azaan" | "default" | "silent";

export interface PrayerAlarmConfig {
  enabled: boolean;
  offsetMinutes: number; // 0 = at prayer time, 5 = 5m before, 10 = 10m before, 15 = 15m before, 20 = 20m before, 30 = 30m before
  sound: AlarmSoundOption;
}

export interface AlarmSettings {
  globalEnabled: boolean;
  vibrate: boolean;
  prayers: Record<PrayerKey, PrayerAlarmConfig>;
}

export const STORAGE_KEY = "@salah_times_alarm_settings_v1";

export const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_DISPLAY_NAMES: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr / Jummah",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const OFFSET_OPTIONS = [
  { label: "At Prayer Time (0m)", value: 0 },
  { label: "5 mins before", value: 5 },
  { label: "10 mins before", value: 10 },
  { label: "15 mins before", value: 15 },
  { label: "20 mins before", value: 20 },
  { label: "30 mins before", value: 30 },
];

export const DEFAULT_ALARM_SETTINGS: AlarmSettings = {
  globalEnabled: true,
  vibrate: true,
  prayers: {
    fajr: { enabled: true, offsetMinutes: 10, sound: "azaan" },
    dhuhr: { enabled: true, offsetMinutes: 10, sound: "azaan" },
    asr: { enabled: true, offsetMinutes: 10, sound: "azaan" },
    maghrib: { enabled: true, offsetMinutes: 10, sound: "azaan" },
    isha: { enabled: true, offsetMinutes: 10, sound: "azaan" },
  },
};

/**
 * Loads current alarm settings from AsyncStorage.
 */
export async function getAlarmSettings(): Promise<AlarmSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AlarmSettings>;

    return {
      globalEnabled: parsed.globalEnabled ?? DEFAULT_ALARM_SETTINGS.globalEnabled,
      vibrate: parsed.vibrate ?? DEFAULT_ALARM_SETTINGS.vibrate,
      prayers: {
        fajr: { ...DEFAULT_ALARM_SETTINGS.prayers.fajr, ...parsed.prayers?.fajr },
        dhuhr: { ...DEFAULT_ALARM_SETTINGS.prayers.dhuhr, ...parsed.prayers?.dhuhr },
        asr: { ...DEFAULT_ALARM_SETTINGS.prayers.asr, ...parsed.prayers?.asr },
        maghrib: { ...DEFAULT_ALARM_SETTINGS.prayers.maghrib, ...parsed.prayers?.maghrib },
        isha: { ...DEFAULT_ALARM_SETTINGS.prayers.isha, ...parsed.prayers?.isha },
      },
    };
  } catch (error) {
    console.error("[AlarmSettings] Error reading alarm settings:", error);
    return DEFAULT_ALARM_SETTINGS;
  }
}

/**
 * Saves alarm settings to AsyncStorage.
 */
export async function saveAlarmSettings(settings: AlarmSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("[AlarmSettings] Error saving alarm settings:", error);
  }
}

/**
 * Updates settings for a specific prayer.
 */
export async function updatePrayerAlarmConfig(
  prayer: PrayerKey,
  patch: Partial<PrayerAlarmConfig>
): Promise<AlarmSettings> {
  const current = await getAlarmSettings();
  const updated: AlarmSettings = {
    ...current,
    prayers: {
      ...current.prayers,
      [prayer]: {
        ...current.prayers[prayer],
        ...patch,
      },
    },
  };
  await saveAlarmSettings(updated);
  return updated;
}

/**
 * Updates global alarm settings.
 */
export async function updateGlobalAlarmSetting(
  patch: Partial<Omit<AlarmSettings, "prayers">>
): Promise<AlarmSettings> {
  const current = await getAlarmSettings();
  const updated: AlarmSettings = {
    ...current,
    ...patch,
  };
  await saveAlarmSettings(updated);
  return updated;
}
