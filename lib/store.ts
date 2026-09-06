import { Masjid, AdminUser, AppEvent, LocationState } from "./types";
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

      currentLastDoc = docs[docs.length - 1];

      for (const docSnap of docs) {
        const masjid = docSnap.data() as Masjid;
        
        let matchesCity = true;
        if (cleanCity && cleanCity !== "all") {
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
        if (cleanCity && cleanCity !== "all") {
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
    const fetchPromise = getDocs(collection(db, MASJIDS_COLLECTION));
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);

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
  messageType: string = "timetable_update"
): Promise<any> {
  try {
    const msgRef = doc(collection(db, "masjid_messages"));
    const newMsg = {
      id: msgRef.id,
      masjidId,
      masjidName,
      prayerName,
      suggestedTime,
      message,
      phone,
      createdAt: Date.now(),
      messageType,
    };
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

// Location (State & City) Management
const DEFAULT_LOCATIONS: LocationState[] = [
  {
    id: "uttar_pradesh",
    state: "Uttar Pradesh",
    cities: ["Rampur", "Moradabad", "Bareilly", "Sambhal"],
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
      querySnapshot.forEach((docSnap) => {
        locations.push(docSnap.data() as LocationState);
      });
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
    };
    await setDoc(doc(db, LOCATIONS_COLLECTION, docId), newLocation);
    return newLocation;
  } catch (error) {
    console.error("Error adding state:", error);
    throw error;
  }
}

export async function addCityToState(stateId: string, cityName: string): Promise<void> {
  try {
    const docRef = doc(db, LOCATIONS_COLLECTION, stateId);
    await updateDoc(docRef, {
      cities: arrayUnion(cityName.trim()),
    });
  } catch (error) {
    console.error("Error adding city to state:", error);
    throw error;
  }
}


