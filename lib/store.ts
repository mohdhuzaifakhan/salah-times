import { Masjid, AdminUser, AppEvent, LocationState, MasjidRequest } from "./types";
import { db } from "./firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  arrayUnion,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  QueryConstraint
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MASJIDS_COLLECTION = "masjids";
const USERS_COLLECTION = "users";
const EVENTS_COLLECTION = "events";
const LOCATIONS_COLLECTION = "locations";

export interface PaginatedMasjidsResult {
  masjids: Masjid[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

const ALL_MASJIDS_CACHE_KEY = "@all_masjids_cache";

export async function getMasjidsPaginated({
  pageSize = 10,
  lastDoc = null,
  city = null,
  searchQuery = "",
  configuredCitiesSet,
}: {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot | null;
  city?: string | null;
  searchQuery?: string;
  configuredCitiesSet?: Set<string>;
}): Promise<PaginatedMasjidsResult> {
  let querySucceeded = false;
  try {
    const masjidsRef = collection(db, MASJIDS_COLLECTION);
    const accumulatedMasjids: Masjid[] = [];
    let currentLastDoc: QueryDocumentSnapshot | null = lastDoc;
    let hasMoreDocsInDb = true;

    const cleanSearch = searchQuery.trim().toLowerCase();
    const cleanCity = city ? city.trim().toLowerCase() : null;

    let iterations = 0;
    const maxIterations = 20;

    while (accumulatedMasjids.length < pageSize && hasMoreDocsInDb && iterations < maxIterations) {
      iterations++;
      const constraints: QueryConstraint[] = [];
      constraints.push(orderBy("name"));

      if (currentLastDoc) {
        constraints.push(startAfter(currentLastDoc));
      }

      const fetchBatchSize = Math.max(pageSize * 3, 30);
      constraints.push(limit(fetchBatchSize));

      let querySnapshot: any = null;
      try {
        const q = query(masjidsRef, ...constraints);
        const fetchPromise = getDocs(q);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
        querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        const fallbackConstraints: QueryConstraint[] = [];
        if (currentLastDoc) fallbackConstraints.push(startAfter(currentLastDoc));
        fallbackConstraints.push(limit(fetchBatchSize));
        const q = query(masjidsRef, ...fallbackConstraints);
        const fetchPromise = getDocs(q);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
        querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
      }

      if (!querySnapshot) {
        break;
      }

      querySucceeded = true;
      const docs = querySnapshot.docs;
      if (docs.length < fetchBatchSize) {
        hasMoreDocsInDb = false;
      }

      if (docs.length === 0) {
        break;
      }

      for (const docSnap of docs) {
        currentLastDoc = docSnap;
        const masjid = docSnap.data() as Masjid;
        
        let matchesCity = true;
        if (cleanCity && cleanCity !== "all" && cleanCity !== "all cities") {
          const mCity = masjid.city ? masjid.city.trim().toLowerCase() : "";
          if (cleanCity === "other") {
            matchesCity = !mCity || (configuredCitiesSet ? !configuredCitiesSet.has(mCity) : false);
          } else {
            matchesCity = mCity === cleanCity;
          }
        }

        let matchesSearch = true;
        if (cleanSearch) {
          const combined = `${masjid.name} ${masjid.city || ""} ${masjid.address || ""}`.toLowerCase();
          matchesSearch = combined.includes(cleanSearch);
        }

        if (matchesCity && matchesSearch) {
          accumulatedMasjids.push(masjid);
          if (accumulatedMasjids.length === pageSize) {
            break;
          }
        }
      }
    }

    if (querySucceeded) {
      if (accumulatedMasjids.length > 0) {
        void getAllMasjids();
      }
      return {
        masjids: accumulatedMasjids,
        lastDoc: currentLastDoc,
        hasMore: hasMoreDocsInDb,
      };
    }
  } catch (error) {
    console.error("Error getting paginated masjids, trying local cache:", error);
  }

  try {
    const cached = await AsyncStorage.getItem(ALL_MASJIDS_CACHE_KEY);
    if (cached) {
      const allCached: Masjid[] = JSON.parse(cached);
      const cleanSearch = searchQuery.trim().toLowerCase();
      const cleanCity = city ? city.trim().toLowerCase() : null;

      const filtered = allCached.filter((masjid) => {
        let matchesCity = true;
        if (cleanCity && cleanCity !== "all" && cleanCity !== "all cities") {
          const mCity = masjid.city ? masjid.city.trim().toLowerCase() : "";
          if (cleanCity === "other") {
            matchesCity = !mCity || (configuredCitiesSet ? !configuredCitiesSet.has(mCity) : false);
          } else {
            matchesCity = mCity === cleanCity;
          }
        }
        let matchesSearch = true;
        if (cleanSearch) {
          const combined = `${masjid.name} ${masjid.city || ""} ${masjid.address || ""}`.toLowerCase();
          matchesSearch = combined.includes(cleanSearch);
        }
        return matchesCity && matchesSearch;
      });

      let startIndex = 0;
      if (lastDoc && lastDoc.id) {
        const idx = filtered.findIndex((m) => m.id === lastDoc.id);
        if (idx !== -1) {
          startIndex = idx + 1;
        }
      }

      const pagedSlice = filtered.slice(startIndex, startIndex + pageSize);
      const hasMore = (startIndex + pagedSlice.length) < filtered.length;
      const newLastDoc: any = pagedSlice.length > 0 ? { id: pagedSlice[pagedSlice.length - 1].id } : lastDoc;

      return {
        masjids: pagedSlice,
        lastDoc: newLastDoc,
        hasMore,
      };
    }
  } catch (cacheErr) {
    console.error("Error reading cached masjids fallback:", cacheErr);
  }

  return {
    masjids: [],
    lastDoc: null,
    hasMore: false,
  };
}

export async function getAllMasjids(): Promise<Masjid[]> {
  try {
    const querySnapshot = await getDocs(collection(db, MASJIDS_COLLECTION));
    if (querySnapshot) {
      const masjids: Masjid[] = [];
      querySnapshot.forEach((doc) => {
        masjids.push(doc.data() as Masjid);
      });
      const sorted = masjids.sort((a, b) => a.name.localeCompare(b.name));
      void AsyncStorage.setItem(ALL_MASJIDS_CACHE_KEY, JSON.stringify(sorted));
      return sorted;
    }
  } catch (error) {
    console.error("Error getting masjids from Firestore, trying local cache:", error);
  }

  try {
    const cached = await AsyncStorage.getItem(ALL_MASJIDS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Masjid[];
    }
  } catch (cacheErr) {
    console.error("Error reading cached masjids:", cacheErr);
  }

  return [];
}

export async function getMasjidById(id: string): Promise<Masjid | null> {
  const cacheKey = `@masjid_cache_${id}`;
  try {
    const docRef = doc(db, MASJIDS_COLLECTION, id);
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    
    const docSnap = await Promise.race([fetchPromise, timeoutPromise]);
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as Masjid;
      void AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.error("Error getting masjid from Firestore, trying local cache:", error);
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Masjid;
    }
  } catch (cacheErr) {
    console.error("Error reading cached masjid:", cacheErr);
  }

  return null;
}

export async function getMasjidByAdminUid(adminUid: string): Promise<Masjid | null> {
  try {
    const q = query(
      collection(db, MASJIDS_COLLECTION),
      where("adminUid", "==", adminUid),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Masjid;
    }
    return null;
  } catch (error) {
    console.error("Error getting masjid by admin uid:", error);
    return null;
  }
}

export async function getMasjidByAdminEmail(adminEmail: string): Promise<Masjid | null> {
  try {
    const q = query(
      collection(db, MASJIDS_COLLECTION),
      where("adminEmail", "==", adminEmail.toLowerCase()),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Masjid;
    }
    return null;
  } catch (error) {
    console.error("Error getting masjid by admin email:", error);
    return null;
  }
}

export async function createMasjid(data: Omit<Masjid, "id" | "createdAt">): Promise<Masjid> {
  try {
    const newMasjidRef = doc(collection(db, MASJIDS_COLLECTION));
    const newMasjid: Masjid = {
      ...data,
      id: newMasjidRef.id,
      createdAt: Date.now(),
    } as Masjid; // simplified for now

    await setDoc(newMasjidRef, newMasjid);
    return newMasjid;
  } catch (error) {
    console.error("Error creating masjid:", error);
    throw error;
  }
}

export async function createMasjidWithId(id: string, data: Omit<Masjid, "id" | "createdAt">): Promise<Masjid> {
  try {
    const masjidRef = doc(db, MASJIDS_COLLECTION, id);
    const newMasjid: Masjid = {
      ...data,
      id: id,
      createdAt: Date.now(),
    };
    await setDoc(masjidRef, newMasjid);
    return newMasjid;
  } catch (error) {
    console.error("Error creating masjid with id:", error);
    throw error;
  }
}


export async function updateMasjidTimetable(
  id: string,
  timetable: Masjid["timetable"]
): Promise<Masjid | null> {
  try {
    const masjidRef = doc(db, MASJIDS_COLLECTION, id);
    await updateDoc(masjidRef, { timetable });
    return await getMasjidById(id);
  } catch (error) {
    console.error("Error updating timetable:", error);
    return null;
  }
}

export async function updateMasjidDetails(
  id: string,
  details: Partial<Masjid>
): Promise<Masjid | null> {
  try {
    const masjidRef = doc(db, MASJIDS_COLLECTION, id);
    await updateDoc(masjidRef, details);
    return await getMasjidById(id);
  } catch (error) {
    console.error("Error updating details:", error);
    return null;
  }
}


export async function deleteMasjid(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, MASJIDS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Error deleting masjid:", error);
    return false;
  }
}

// User Profile Management
export async function createUserProfile(
  uid: string,
  email: string,
  role: AdminUser["role"],
  masjidId?: string,
  password?: string
) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userData: AdminUser = {
      uid,
      email,
      role,
    };

    if (masjidId) {
      userData.masjidId = masjidId;
    }

    if (password) {
      userData.password = password;
    }

    await setDoc(userRef, userData);
    return userData;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<AdminUser | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as AdminUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

export async function getUserProfileByEmail(email: string): Promise<AdminUser | null> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", email.trim().toLowerCase()),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as AdminUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile by email:", error);
    return null;
  }
}


// Events Management
export async function createEvent(data: Omit<AppEvent, "id" | "createdAt">): Promise<AppEvent> {
  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    
    // Clean undefined fields to prevent Firestore from throwing "Unsupported field value: undefined"
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const newEvent: AppEvent = {
      ...cleanedData,
      id: newEventRef.id,
      createdAt: Date.now(),
    } as AppEvent;

    await setDoc(newEventRef, newEvent);

    // Fetch masjid name if masjid-specific event
    let masjidName = "";
    const isGlobal = data.masjidId === "global";
    if (!isGlobal && data.masjidId) {
      try {
        const masjidDoc = await getMasjidById(data.masjidId);
        if (masjidDoc) masjidName = masjidDoc.name;
      } catch (e) {
        console.error("Error fetching masjid details for event notification:", e);
      }
    }

    // 1. Log admin notification in Firestore
    try {
      await createAdminNotification(
        isGlobal ? `New Global Event: ${data.title}` : `New Event (${masjidName || "Masjid"}): ${data.title}`,
        data.description,
        "event_created",
        data.masjidId,
        masjidName
      );
    } catch (e) {
      console.error("Error creating admin notification for event:", e);
    }

    // 2. Send notification to targeted users (Global -> All users, Masjid -> Primary Masjid users)
    try {
      const { sendEventNotification } = await import("./notifications");
      await sendEventNotification(newEvent, masjidName);
    } catch (e) {
      console.error("Error triggering event notification:", e);
    }

    return newEvent;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

export async function getGlobalEvents(): Promise<AppEvent[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where("masjidId", "==", "global")
    );
    const querySnapshot = await getDocs(q);
    const events: AppEvent[] = [];
    const now = Date.now();
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AppEvent;
      if (data.endDate > now) {
        events.push(data);
      }
    });
    return events.sort((a, b) => a.endDate - b.endDate);
  } catch (error) {
    console.error("Error getting global events:", error);
    return [];
  }
}

export async function getMasjidEvents(masjidId: string): Promise<AppEvent[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where("masjidId", "==", masjidId)
    );
    const querySnapshot = await getDocs(q);
    const events: AppEvent[] = [];
    const now = Date.now();
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AppEvent;
      if (data.endDate > now) {
        events.push(data);
      }
    });
    return events.sort((a, b) => a.endDate - b.endDate);
  } catch (error) {
    console.error("Error getting masjid events:", error);
    return [];
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<AppEvent, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, id);
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(eventRef, cleanedData);
    return true;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

export async function getEventById(id: string): Promise<AppEvent | null> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppEvent;
    }
    return null;
  } catch (error) {
    console.error("Error getting event:", error);
    return null;
  }
}

const PRIMARY_MASJID_KEY = "@primary_masjid_id";
const PRIMARY_MASJID_DATA_KEY = "@primary_masjid_data";

export async function getPrimaryMasjidId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PRIMARY_MASJID_KEY);
  } catch (error) {
    console.error("Error getting primary masjid id:", error);
    return null;
  }
}

export async function getCachedPrimaryMasjid(): Promise<Masjid | null> {
  try {
    const cached = await AsyncStorage.getItem(PRIMARY_MASJID_DATA_KEY);
    if (cached) {
      return JSON.parse(cached) as Masjid;
    }
  } catch (error) {
    console.error("Error reading cached primary masjid data:", error);
  }
  return null;
}

export async function savePrimaryMasjidId(id: string | null, masjidData?: Masjid | null): Promise<void> {
  try {
    if (id) {
      await AsyncStorage.setItem(PRIMARY_MASJID_KEY, id);
      if (masjidData) {
        await AsyncStorage.setItem(PRIMARY_MASJID_DATA_KEY, JSON.stringify(masjidData));
      }
    } else {
      await AsyncStorage.removeItem(PRIMARY_MASJID_KEY);
      await AsyncStorage.removeItem(PRIMARY_MASJID_DATA_KEY);
    }
  } catch (error) {
    console.error("Error saving primary masjid id:", error);
  }
}

// Wrong Time Reporting & Masjid Feedback CRUD
export async function createMasjidMessage(
  masjidId: string,
  masjidName: string,
  prayerName: string,
  suggestedTime: string,
  message: string,
  phone: string,
  messageType: string = "timetable_update",
  timetablePhotoBase64?: string
): Promise<any> {
  try {
    const msgRef = doc(collection(db, "masjid_messages"));
    const rawMsg = {
      id: msgRef.id,
      masjidId,
      masjidName,
      prayerName,
      suggestedTime,
      message,
      phone,
      createdAt: Date.now(),
      messageType,
      timetablePhotoBase64,
    };
    const newMsg = cleanFirestoreData(rawMsg);
    await setDoc(msgRef, newMsg);
    return newMsg;
  } catch (error) {
    console.error("Error creating masjid message:", error);
    throw error;
  }
}

export async function createAdminNotification(
  title: string,
  body: string,
  type: string,
  masjidId: string,
  masjidName?: string
): Promise<any> {
  try {
    const notifRef = doc(collection(db, "admin_notifications"));
    const newNotif = {
      id: notifRef.id,
      title,
      body,
      type,
      masjidId,
      masjidName: masjidName || "",
      createdAt: Date.now(),
      read: false,
    };
    await setDoc(notifRef, newNotif);
    return newNotif;
  } catch (error) {
    console.error("Error creating admin notification:", error);
    throw error;
  }
}

export async function getAdminNotifications(
  role: "super_admin" | "masjid_admin",
  masjidId?: string
): Promise<any[]> {
  try {
    let q;
    if (role === "super_admin") {
      q = query(collection(db, "admin_notifications"));
    } else {
      if (!masjidId) return [];
      q = query(
        collection(db, "admin_notifications"),
        where("masjidId", "==", masjidId)
      );
    }
    const querySnapshot = await getDocs(q);
    const notifs: any[] = [];
    querySnapshot.forEach((doc) => {
      notifs.push(doc.data());
    });
    return notifs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting admin notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, "admin_notifications", id);
    await updateDoc(docRef, { read: true });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

export async function deleteAdminNotification(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "admin_notifications", id));
    return true;
  } catch (error) {
    console.error("Error deleting admin notification:", error);
    return false;
  }
}

export async function getMasjidMessages(masjidId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, "masjid_messages"),
      where("masjidId", "==", masjidId)
    );
    const querySnapshot = await getDocs(q);
    const messages: any[] = [];
    querySnapshot.forEach((doc) => {
      messages.push(doc.data());
    });
    return messages.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting masjid messages:", error);
    return [];
  }
}

export async function deleteMasjidMessage(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "masjid_messages", id));
    return true;
  } catch (error) {
    console.error("Error deleting masjid message:", error);
    return false;
  }
}

// Global Support Tickets & App Feedback CRUD
export async function createAppMessage(
  message: string,
  phone?: string,
  details?: string,
  idea?: string,
  email?: string
): Promise<any> {
  try {
    const msgRef = doc(collection(db, "app_messages"));
    const newMsg: any = {
      id: msgRef.id,
      message,
      createdAt: Date.now(),
    };
    if (email) newMsg.email = email.toLowerCase();
    if (phone) newMsg.phone = phone;
    if (details) newMsg.details = details;
    if (idea) newMsg.idea = idea;

    await setDoc(msgRef, newMsg);

    // 1. Create Admin Notification entry in Firestore so admin can view it in Admin Panel
    try {
      await createAdminNotification(
        "New Contact / Support Message",
        `From: ${phone || email || "User"} - ${details || message}`,
        "contact_us",
        "global",
        "Contact Us"
      );
    } catch (e) {
      console.error("Failed to create admin notification record:", e);
    }

    // 2. Trigger system notification so admin is alerted even when app is backgrounded or not open
    try {
      const { sendLocalAdminNotification } = await import("./notifications");
      await sendLocalAdminNotification(
        "New Contact Us Message",
        `From ${phone || email || "User"}: ${details || message}`
      );
    } catch (e) {
      console.error("Failed to trigger local admin notification:", e);
    }

    return newMsg;
  } catch (error) {
    console.error("Error creating app message:", error);
    throw error;
  }
}

export async function getAppMessages(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "app_messages"));
    const messages: any[] = [];
    querySnapshot.forEach((doc) => {
      messages.push(doc.data());
    });
    return messages.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting app messages:", error);
    return [];
  }
}

export async function deleteAppMessage(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "app_messages", id));
    return true;
  } catch (error) {
    console.error("Error deleting app message:", error);
    return false;
  }
}

// Location (State, District & Sub-division) Management
const DEFAULT_LOCATIONS: LocationState[] = [
  {
    id: "uttar_pradesh",
    state: "Uttar Pradesh",
    cities: ["Rampur", "Moradabad", "Bareilly", "Sambhal"],
    districts: [
      {
        id: "rampur",
        name: "Rampur",
        subDivisions: [
          "Rampur city",
          "Tanda",
          "Dariyal",
          "Suar",
          "Maswasi",
          "Bilaspur",
          "Milak",
          "Shahabad",
          "Chamraua"
        ],
      },
      {
        id: "moradabad",
        name: "Moradabad",
        subDivisions: ["Moradabad City", "Kanth", "Thakurdwara", "Bilari", "Kundarki"],
      },
      {
        id: "bareilly",
        name: "Bareilly",
        subDivisions: ["Bareilly City", "Aonla", "Baheri", "Faridpur", "Nawabganj"],
      },
    ],
  },
];

const LOCATIONS_CACHE_KEY = "@locations_cache";

export async function getLocations(): Promise<LocationState[]> {
  try {
    const fetchPromise = getDocs(collection(db, LOCATIONS_COLLECTION));
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
    if (querySnapshot) {
      if (querySnapshot.empty) {
        for (const loc of DEFAULT_LOCATIONS) {
          await setDoc(doc(db, LOCATIONS_COLLECTION, loc.id), loc);
        }
        void AsyncStorage.setItem(LOCATIONS_CACHE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
        return DEFAULT_LOCATIONS;
      }
      const locations: LocationState[] = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as LocationState;
        // Auto-migrate/ensure default districts if missing (e.g. Rampur sub-divisions)
        if (data.id === "uttar_pradesh" && (!data.districts || data.districts.length === 0)) {
          data.districts = DEFAULT_LOCATIONS[0].districts;
          void setDoc(doc(db, LOCATIONS_COLLECTION, data.id), data, { merge: true });
        }
        locations.push(data);
      }
      const sorted = locations.sort((a, b) => a.state.localeCompare(b.state));
      void AsyncStorage.setItem(LOCATIONS_CACHE_KEY, JSON.stringify(sorted));
      return sorted;
    }
  } catch (error) {
    console.error("Error getting locations from Firestore, trying local cache:", error);
  }

  try {
    const cached = await AsyncStorage.getItem(LOCATIONS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as LocationState[];
    }
  } catch (cacheErr) {
    console.error("Error reading cached locations:", cacheErr);
  }

  return DEFAULT_LOCATIONS;
}

export async function addState(stateName: string): Promise<LocationState> {
  try {
    const docId = stateName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const newLocation: LocationState = {
      id: docId,
      state: stateName.trim(),
      cities: [],
      districts: [],
    };
    await setDoc(doc(db, LOCATIONS_COLLECTION, docId), newLocation);
    return newLocation;
  } catch (error) {
    console.error("Error adding state:", error);
    throw error;
  }
}

export async function addDistrictToState(stateId: string, districtName: string): Promise<void> {
  try {
    const docRef = doc(db, LOCATIONS_COLLECTION, stateId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data() as LocationState;
    const districts = data.districts || [];
    const cleanName = districtName.trim();
    if (districts.some((d) => d.name.toLowerCase() === cleanName.toLowerCase())) return;

    districts.push({
      id: cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      name: cleanName,
      subDivisions: [],
    });

    const cities = data.cities || [];
    if (!cities.includes(cleanName)) {
      cities.push(cleanName);
    }

    await updateDoc(docRef, { districts, cities });
  } catch (error) {
    console.error("Error adding district to state:", error);
    throw error;
  }
}

export async function addSubDivisionToDistrict(
  stateId: string,
  districtName: string,
  subDivisionName: string
): Promise<void> {
  try {
    const docRef = doc(db, LOCATIONS_COLLECTION, stateId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data() as LocationState;
    const districts = data.districts || [];
    const cleanSub = subDivisionName.trim();
    const cleanDist = districtName.trim().toLowerCase();

    let targetDist = districts.find((d) => d.name.toLowerCase() === cleanDist || d.id === cleanDist);
    if (!targetDist) {
      targetDist = {
        id: cleanDist.replace(/[^a-z0-9]/g, "_"),
        name: districtName.trim(),
        subDivisions: [],
      };
      districts.push(targetDist);
    }

    if (!targetDist.subDivisions.some((s) => s.toLowerCase() === cleanSub.toLowerCase())) {
      targetDist.subDivisions.push(cleanSub);
    }

    await updateDoc(docRef, { districts });
  } catch (error) {
    console.error("Error adding sub-division:", error);
    throw error;
  }
}

export async function deleteSubDivisionFromDistrict(
  stateId: string,
  districtName: string,
  subDivisionName: string
): Promise<void> {
  try {
    const docRef = doc(db, LOCATIONS_COLLECTION, stateId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data() as LocationState;
    const districts = data.districts || [];
    const cleanSub = subDivisionName.trim().toLowerCase();
    const cleanDist = districtName.trim().toLowerCase();

    const targetDist = districts.find((d) => d.name.toLowerCase() === cleanDist || d.id === cleanDist);
    if (targetDist) {
      targetDist.subDivisions = targetDist.subDivisions.filter((s) => s.toLowerCase() !== cleanSub);
      await updateDoc(docRef, { districts });
    }
  } catch (error) {
    console.error("Error deleting sub-division:", error);
    throw error;
  }
}

export async function deleteDistrictFromState(stateId: string, districtName: string): Promise<void> {
  try {
    const docRef = doc(db, LOCATIONS_COLLECTION, stateId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data() as LocationState;
    const cleanDist = districtName.trim().toLowerCase();
    const districts = (data.districts || []).filter((d) => d.name.toLowerCase() !== cleanDist && d.id !== cleanDist);
    const cities = (data.cities || []).filter((c) => c.toLowerCase() !== cleanDist);
    await updateDoc(docRef, { districts, cities });
  } catch (error) {
    console.error("Error deleting district:", error);
    throw error;
  }
}

export async function deleteState(stateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LOCATIONS_COLLECTION, stateId));
  } catch (error) {
    console.error("Error deleting state:", error);
    throw error;
  }
}

// ==========================================
// MASJID REQUESTS (User Registration Requests)
// ==========================================

export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as T;
}

export async function createMasjidRequest(
  data: Omit<MasjidRequest, "id" | "createdAt" | "status">
): Promise<MasjidRequest> {
  try {
    const reqRef = doc(collection(db, "masjid_requests"));
    const rawRequest: MasjidRequest = {
      id: reqRef.id,
      ...data,
      status: "pending",
      createdAt: Date.now(),
    };
    const newRequest = cleanFirestoreData(rawRequest);
    await setDoc(reqRef, newRequest);

    // 1. Notify Super Admin via Firestore notification
    try {
      await createAdminNotification(
        "New Masjid Registration Request",
        `Request for "${data.masjidName}" in ${data.city}. WhatsApp: ${data.whatsappNumber}`,
        "new_masjid_request",
        "global",
        data.masjidName
      );
    } catch (e) {
      console.error("Failed to create admin notification for masjid request:", e);
    }

    // 2. Trigger local admin notification
    try {
      const { sendLocalAdminNotification } = await import("./notifications");
      await sendLocalAdminNotification(
        "New Masjid Registration Request",
        `"${data.masjidName}" in ${data.city} (WhatsApp: ${data.whatsappNumber})`
      );
    } catch (e) {
      console.error("Failed to trigger local admin notification:", e);
    }

    return newRequest;
  } catch (error) {
    console.error("Error creating masjid request:", error);
    throw error;
  }
}

export async function getMasjidRequests(): Promise<MasjidRequest[]> {
  try {
    const q = query(collection(db, "masjid_requests"));
    const querySnapshot = await getDocs(q);
    const requests: MasjidRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requests.push(docSnap.data() as MasjidRequest);
    });
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting masjid requests:", error);
    return [];
  }
}

export async function updateMasjidRequestStatus(
  requestId: string,
  status: "pending" | "approved" | "rejected"
): Promise<boolean> {
  try {
    const docRef = doc(db, "masjid_requests", requestId);
    await updateDoc(docRef, { status });
    return true;
  } catch (error) {
    console.error("Error updating masjid request status:", error);
    return false;
  }
}

export async function deleteMasjidRequest(requestId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "masjid_requests", requestId));
    return true;
  } catch (error) {
    console.error("Error deleting masjid request:", error);
    return false;
  }
}

export async function cleanCompletedMasjidRequests(): Promise<number> {
  try {
    const requests = await getMasjidRequests();
    const completed = requests.filter((r) => r.status === "approved" || r.status === "rejected");
    let count = 0;
    for (const req of completed) {
      await deleteDoc(doc(db, "masjid_requests", req.id));
      count++;
    }
    return count;
  } catch (error) {
    console.error("Error cleaning completed masjid requests:", error);
    return 0;
  }
}



