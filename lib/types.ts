export interface Timetable {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: string;
  // Other daily & optional times
  sunrise?: string;
  ishraq?: string;
  chasht?: string;
  zawal?: string;
  tahajjud?: string;
  // Ramadan specific times
  sehri?: string;
  iftar?: string;
  taraweeh?: string;
}

export interface Masjid {
  id: string;
  name: string;
  city: string;
  subDivision?: string;
  state?: string;
  address: string;
  adminUid: string;
  adminEmail?: string;
  timetable: Timetable;
  createdAt: number;
}

export interface LocationDistrict {
  id: string;
  name: string;
  subDivisions: string[];
}

export interface LocationState {
  id: string;
  state: string;
  cities: string[];
  districts?: LocationDistrict[];
}

export interface AdminUser {
  uid: string;
  email: string;
  role: "super_admin" | "masjid_admin";
  masjidId?: string;
  password?: string;
  isTempGuest?: boolean;
  guestExpiresAt?: number;
}

export const DEFAULT_TIMETABLE: Timetable = {
  fajr: "05:00",
  dhuhr: "13:00",
  asr: "16:30",
  maghrib: "18:30",
  isha: "20:00",
  jummah: "13:30",
  sunrise: "06:15",
  ishraq: "06:35",
  chasht: "09:30",
  zawal: "11:55",
  tahajjud: "03:45",
  sehri: "04:45",
  iftar: "18:35",
  taraweeh: "20:30",
};

export const PRAYER_NAMES: Record<keyof Timetable, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  jummah: "Jummah",
  sunrise: "Sunrise",
  ishraq: "Ishraq",
  chasht: "Chasht / Duha",
  zawal: "Zawal (Noon)",
  tahajjud: "Tahajjud",
  sehri: "Sehri Ends",
  iftar: "Iftar",
  taraweeh: "Taraweeh",
};

export const OTHER_TIMES_ORDER: (keyof Timetable)[] = [
  "sunrise",
  "ishraq",
  "chasht",
  "zawal",
  "tahajjud",
];

export const RAMADAN_TIMES_ORDER: (keyof Timetable)[] = [
  "sehri",
  "iftar",
  "taraweeh",
];

export const PRAYER_ORDER: (keyof Timetable)[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "jummah",
];

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  endDate: number;
  masjidId: string | 'global';
  createdBy: string;
  createdAt: number;
  imageUrl?: string;
  link?: string;
}

export interface MasjidRequest {
  id: string;
  masjidName: string;
  city: string;
  subDivision?: string;
  state?: string;
  address: string;
  whatsappNumber: string;
  email?: string;
  notes?: string;
  masjidPhotoBase64?: string;
  timetablePhotoBase64?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

