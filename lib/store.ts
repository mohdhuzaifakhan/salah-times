import { Masjid, AdminUser, AppEvent } from "./types";
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
  limit
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MASJIDS_COLLECTION = "masjids";
const USERS_COLLECTION = "users";
const EVENTS_COLLECTION = "events";

export async function getAllMasjids(): Promise<Masjid[]> {
  try {
    const querySnapshot = await getDocs(collection(db, MASJIDS_COLLECTION));
    const masjids: Masjid[] = [];
    querySnapshot.forEach((doc) => {
      masjids.push(doc.data() as Masjid);
    });
    return masjids.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting masjids:", error);
    return [];
  }
}

export async function getMasjidById(id: string): Promise<Masjid | null> {
  try {
    const docRef = doc(db, MASJIDS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Masjid;
    }
    return null;
  } catch (error) {
    console.error("Error getting masjid:", error);
    return null;
  }
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
  details: Partial<Pick<Masjid, "name" | "city" | "address">>
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
  masjidId?: string
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

// Events Management
export async function createEvent(data: Omit<AppEvent, "id" | "createdAt">): Promise<AppEvent> {
  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    const newEvent: AppEvent = {
      ...data,
      id: newEventRef.id,
      createdAt: Date.now(),
    };

    await setDoc(newEventRef, newEvent);
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

export async function getPrimaryMasjidId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PRIMARY_MASJID_KEY);
  } catch (error) {
    console.error("Error getting primary masjid id:", error);
    return null;
  }
}

export async function savePrimaryMasjidId(id: string | null): Promise<void> {
  try {
    if (id) {
      await AsyncStorage.setItem(PRIMARY_MASJID_KEY, id);
    } else {
      await AsyncStorage.removeItem(PRIMARY_MASJID_KEY);
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


