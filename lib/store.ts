import AsyncStorage from "@react-native-async-storage/async-storage";
import { Masjid, AdminUser, DEFAULT_TIMETABLE } from "./types";
import * as Crypto from "expo-crypto";

const MASJIDS_KEY = "@salah_times_masjids";
const ADMIN_KEY = "@salah_times_admin";

const SEED_MASJIDS: Masjid[] = [
  {
    id: "seed_1",
    name: "Masjid Al-Noor",
    city: "London",
    address: "45 Whitechapel Road, E1 1DU",
    adminUid: "",
    timetable: { fajr: "04:45", dhuhr: "13:15", asr: "16:45", maghrib: "19:02", isha: "20:30", jummah: "13:30" },
    createdAt: Date.now() - 86400000,
  },
  {
    id: "seed_2",
    name: "Islamic Centre",
    city: "Birmingham",
    address: "12 Coventry Road, B10 0UR",
    adminUid: "",
    timetable: { fajr: "05:00", dhuhr: "13:10", asr: "16:30", maghrib: "18:55", isha: "20:15", jummah: "13:15" },
    createdAt: Date.now() - 172800000,
  },
  {
    id: "seed_3",
    name: "Masjid As-Salam",
    city: "Manchester",
    address: "78 Cheetham Hill Road, M8 8LZ",
    adminUid: "",
    timetable: { fajr: "04:55", dhuhr: "13:20", asr: "16:40", maghrib: "19:00", isha: "20:25", jummah: "13:30" },
    createdAt: Date.now() - 259200000,
  },
  {
    id: "seed_4",
    name: "Masjid Al-Huda",
    city: "Leeds",
    address: "32 Spencer Place, LS7 4BR",
    adminUid: "",
    timetable: { fajr: "05:05", dhuhr: "13:15", asr: "16:35", maghrib: "18:50", isha: "20:10", jummah: "13:00" },
    createdAt: Date.now() - 345600000,
  },
];

async function ensureSeeded(): Promise<Masjid[]> {
  const raw = await AsyncStorage.getItem(MASJIDS_KEY);
  if (!raw) {
    await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(SEED_MASJIDS));
    return SEED_MASJIDS;
  }
  return JSON.parse(raw);
}

export async function getAllMasjids(): Promise<Masjid[]> {
  const masjids = await ensureSeeded();
  return masjids.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMasjidById(id: string): Promise<Masjid | null> {
  const masjids = await ensureSeeded();
  return masjids.find((m) => m.id === id) || null;
}

export async function createMasjid(data: Omit<Masjid, "id" | "createdAt">): Promise<Masjid> {
  const masjids = await ensureSeeded();
  const newMasjid: Masjid = {
    ...data,
    id: Crypto.randomUUID(),
    createdAt: Date.now(),
  };
  masjids.push(newMasjid);
  await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(masjids));
  return newMasjid;
}

export async function updateMasjidTimetable(
  id: string,
  timetable: Masjid["timetable"]
): Promise<Masjid | null> {
  const masjids = await ensureSeeded();
  const idx = masjids.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  masjids[idx].timetable = timetable;
  await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(masjids));
  return masjids[idx];
}

export async function updateMasjidDetails(
  id: string,
  details: Partial<Pick<Masjid, "name" | "city" | "address">>
): Promise<Masjid | null> {
  const masjids = await ensureSeeded();
  const idx = masjids.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  if (details.name) masjids[idx].name = details.name;
  if (details.city) masjids[idx].city = details.city;
  if (details.address) masjids[idx].address = details.address;
  await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(masjids));
  return masjids[idx];
}

export async function deleteMasjid(id: string): Promise<boolean> {
  const masjids = await ensureSeeded();
  const filtered = masjids.filter((m) => m.id !== id);
  if (filtered.length === masjids.length) return false;
  await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(filtered));
  return true;
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser | null> {
  const raw = await AsyncStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  const admins: (AdminUser & { password: string })[] = JSON.parse(raw);
  const found = admins.find((a) => a.email === email && a.password === password);
  if (!found) return null;
  return { uid: found.uid, email: found.email, role: "admin", masjidId: found.masjidId };
}

export async function registerAdmin(
  email: string,
  password: string,
  masjidName: string,
  city: string,
  address: string
): Promise<{ admin: AdminUser; masjid: Masjid }> {
  const uid = Crypto.randomUUID();

  const masjid = await createMasjid({
    name: masjidName,
    city,
    address,
    adminUid: uid,
    timetable: { ...DEFAULT_TIMETABLE },
  });

  const admin: AdminUser & { password: string } = {
    uid,
    email,
    password,
    role: "admin",
    masjidId: masjid.id,
  };

  const raw = await AsyncStorage.getItem(ADMIN_KEY);
  const admins: (AdminUser & { password: string })[] = raw ? JSON.parse(raw) : [];
  admins.push(admin);
  await AsyncStorage.setItem(ADMIN_KEY, JSON.stringify(admins));

  const masjids = await ensureSeeded();
  const idx = masjids.findIndex((m) => m.id === masjid.id);
  if (idx !== -1) {
    masjids[idx].adminUid = uid;
    await AsyncStorage.setItem(MASJIDS_KEY, JSON.stringify(masjids));
  }

  return {
    admin: { uid, email, role: "admin", masjidId: masjid.id },
    masjid: { ...masjid, adminUid: uid },
  };
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const raw = await AsyncStorage.getItem("@salah_times_session");
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function saveAdminSession(admin: AdminUser): Promise<void> {
  await AsyncStorage.setItem("@salah_times_session", JSON.stringify(admin));
}

export async function clearAdminSession(): Promise<void> {
  await AsyncStorage.removeItem("@salah_times_session");
}
