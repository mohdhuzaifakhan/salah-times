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
  orderBy,
  limit
} from 'firebase/firestore';

export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  text: string;
  translation: string;
  createdAt: any;
}

export interface RecentRead {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  updatedAt: any;
}

const COLLECTIONS = {
  BOOKMARKS: 'bookmarks',
  RECENT_READS: 'recent_reads',
  USER_PREFERENCES: 'user_preferences'
};

export const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const bookmarkId = `${userId}_${bookmark.surahNumber}_${bookmark.ayahNumber}`;
  
  const docRef = doc(db, COLLECTIONS.BOOKMARKS, bookmarkId);
  await setDoc(docRef, {
    ...bookmark,
    userId,
    createdAt: serverTimestamp()
  });
};

export const removeBookmark = async (surahNumber: number, ayahNumber: number) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const bookmarkId = `${userId}_${surahNumber}_${ayahNumber}`;
  
  const docRef = doc(db, COLLECTIONS.BOOKMARKS, bookmarkId);
  await deleteDoc(docRef);
};

export const getBookmarks = async (): Promise<Bookmark[]> => {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;
  
  const q = query(
    collection(db, COLLECTIONS.BOOKMARKS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark));
};

export const updateRecentRead = async (recent: Omit<RecentRead, 'updatedAt'>) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.RECENT_READS, userId);
  await setDoc(docRef, {
    ...recent,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getRecentRead = async (): Promise<RecentRead | null> => {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.RECENT_READS, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as RecentRead;
  }
  return null;
};

export const saveUserPreferences = async (prefs: any) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
  await setDoc(docRef, prefs, { merge: true });
};

export const getUserPreferences = async () => {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};
