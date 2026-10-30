import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AmalItem {
  id: string;
  title: string;
  arabic?: string;
  category: "prayer" | "quran" | "dhikr" | "good_deed";
}

export const DEFAULT_AMAL_LIST: AmalItem[] = [
  { id: "fajr", title: "Fajr Prayer on Time", category: "prayer" },
  { id: "dhuhr", title: "Dhuhr Prayer on Time", category: "prayer" },
  { id: "asr", title: "Asr Prayer on Time", category: "prayer" },
  { id: "maghrib", title: "Maghrib Prayer on Time", category: "prayer" },
  { id: "isha", title: "Isha Prayer on Time", category: "prayer" },
  { id: "quran", title: "Read at least 1 Ruku / Page of Quran", category: "quran" },
  { id: "morning_adhkar", title: "Morning Adhkar", category: "dhikr" },
  { id: "evening_adhkar", title: "Evening Adhkar", category: "dhikr" },
  { id: "ayatul_kursi", title: "Ayatul Kursi after Prayers", category: "dhikr" },
  { id: "tasbih_100", title: "SubhanAllah x100, Alhamdulillah x100", category: "dhikr" },
  { id: "durood", title: "Durood Shareef x100", category: "dhikr" },
  { id: "istighfar", title: "Astaghfirullah x100", category: "dhikr" },
  { id: "sadaqah", title: "Give Sadaqah / Help someone", category: "good_deed" },
  { id: "surah_mulk", title: "Surah Al-Mulk before sleeping", category: "quran" },
];

const AMAL_STORAGE_PREFIX = "@salah_times_amal_";

function getTodayKey(): string {
  const now = new Date();
  return `${AMAL_STORAGE_PREFIX}${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getCompletedAmal(): Promise<string[]> {
  try {
    const key = getTodayKey();
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("[Amal] Error loading amal:", error);
    return [];
  }
}

export async function toggleAmalItem(id: string): Promise<string[]> {
  try {
    const completed = await getCompletedAmal();
    const isCompleted = completed.includes(id);
    const updated = isCompleted ? completed.filter((item) => item !== id) : [...completed, id];
    const key = getTodayKey();
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("[Amal] Error toggling amal:", error);
    return [];
  }
}

