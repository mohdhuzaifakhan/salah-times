export interface Timetable {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: string;
}

export interface Masjid {
  id: string;
  name: string;
  city: string;
  address: string;
  adminUid: string;
  timetable: Timetable;
  createdAt: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: "admin";
  masjidId: string;
}

export const DEFAULT_TIMETABLE: Timetable = {
  fajr: "05:00",
  dhuhr: "13:00",
  asr: "16:30",
  maghrib: "18:30",
  isha: "20:00",
  jummah: "13:30",
};

export const PRAYER_NAMES: Record<keyof Timetable, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  jummah: "Jummah",
};

export const PRAYER_ORDER: (keyof Timetable)[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "jummah",
];
