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

