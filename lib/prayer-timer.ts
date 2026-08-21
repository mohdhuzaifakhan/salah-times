import { useState, useEffect } from "react";
import { Timetable, PRAYER_NAMES } from "./types";

export interface UpcomingPrayerDetails {
  nextPrayerKey: keyof Timetable | null;
  nextPrayerName: string;
  nextPrayerTimeFormatted: string;
  remainingSeconds: number;
  formattedRemaining: string;
  isNow: boolean;
}

const PRAYERS_KEYS: (keyof Timetable)[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function formatCompactTime(timeStr: string): string {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return "--:--";
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function getUpcomingPrayerDetails(timetable: Timetable | null, now: Date = new Date()): UpcomingPrayerDetails {
  if (!timetable) {
    return {
      nextPrayerKey: null,
      nextPrayerName: "Namaaz",
      nextPrayerTimeFormatted: "--:--",
      remainingSeconds: 0,
      formattedRemaining: "--:--",
      isNow: false,
    };
  }

  const currentMs = now.getTime();
  const isFriday = now.getDay() === 5;
  const activeKeys: (keyof Timetable)[] = isFriday
    ? ["fajr", "jummah", "asr", "maghrib", "isha"]
    : ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  // Construct target Date instances for today's prayers
  let targetDate: Date | null = null;
  let selectedKey: keyof Timetable | null = null;

  for (const key of activeKeys) {
    const timeStr = key === "jummah" ? (timetable.jummah || timetable.dhuhr) : timetable[key];
    if (!timeStr || !timeStr.includes(":")) continue;

    const [h, m] = timeStr.split(":").map(Number);
    const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

    // If prayer time is in the future today or within 30 seconds of starting
    if (pDate.getTime() + 30000 > currentMs) {
      targetDate = pDate;
      selectedKey = key;
      break;
    }
  }

  // If all prayers today have passed, target tomorrow's Fajr
  if (!targetDate || !selectedKey) {
    selectedKey = "fajr";
    const fajrTime = timetable.fajr || "05:00";
    const [h, m] = fajrTime.split(":").map(Number);
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m, 0, 0);
  }

  const diffMs = targetDate.getTime() - currentMs;
  const remainingSecs = Math.max(0, Math.floor(diffMs / 1000));
  const isNow = diffMs <= 30000 && diffMs >= -30000;

  const hours = Math.floor(remainingSecs / 3600);
  const minutes = Math.floor((remainingSecs % 3600) / 60);
  const seconds = remainingSecs % 60;

  let formattedRemaining = "";
  if (isNow) {
    formattedRemaining = "NOW";
  } else if (hours > 0) {
    formattedRemaining = `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  } else if (minutes > 0) {
    formattedRemaining = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  } else {
    formattedRemaining = `${seconds}s`;
  }

  const selectedTime = selectedKey === "jummah"
    ? (timetable.jummah || timetable.dhuhr)
    : (timetable[selectedKey] || "");

  return {
    nextPrayerKey: selectedKey,
    nextPrayerName: PRAYER_NAMES[selectedKey] || selectedKey,
    nextPrayerTimeFormatted: formatCompactTime(selectedTime),
    remainingSeconds: remainingSecs,
    formattedRemaining,
    isNow,
  };
}

export function usePrayerCountdown(timetable: Timetable | null): UpcomingPrayerDetails {
  const [details, setDetails] = useState<UpcomingPrayerDetails>(() =>
    getUpcomingPrayerDetails(timetable)
  );

  useEffect(() => {
    setDetails(getUpcomingPrayerDetails(timetable));

    const timer = setInterval(() => {
      setDetails(getUpcomingPrayerDetails(timetable));
    }, 1000);

    return () => clearInterval(timer);
  }, [timetable]);

  return details;
}
