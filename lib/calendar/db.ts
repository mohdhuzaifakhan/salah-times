import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

export interface SavedEvent {
  id: string;
  eventId: string;
  title: string;
  gregorianDate: any;
  remindMe: boolean;
  createdAt: any;
}

const COLLECTIONS = {
  SAVED_EVENTS: 'calendar_saved_events',
  PREFERENCES: 'calendar_preferences'
};

export const saveIslamicEvent = async (event: Omit<SavedEvent, 'id' | 'createdAt'>) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${event.eventId}`;
  
  const docRef = doc(db, COLLECTIONS.SAVED_EVENTS, id);
  await setDoc(docRef, {
    ...event,
    userId,
    createdAt: serverTimestamp()
  });
};

export const unsaveIslamicEvent = async (eventId: string) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${eventId}`;
  
  const docRef = doc(db, COLLECTIONS.SAVED_EVENTS, id);
  await deleteDoc(docRef);
};

export const getSavedEvents = async (): Promise<SavedEvent[]> => {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;
  
  try {
    const q = query(
      collection(db, COLLECTIONS.SAVED_EVENTS),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedEvent));
    
    // Sort in memory by createdAt descending
    events.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    return events;
  } catch (error) {
    console.error("Failed to load saved events:", error);
    return [];
  }
};

export const updateCalendarPrefs = async (prefs: any) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.PREFERENCES, userId);
  await setDoc(docRef, prefs, { merge: true });
};

export const getCalendarPrefs = async () => {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.PREFERENCES, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};
