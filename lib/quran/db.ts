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
  USER_PREFERENCES: 'user_preferences',
  PAGE_BOOKMARKS: 'page_bookmarks',
  READING_PROGRESS: 'reading_progress',
  TAFSEER: 'tafseer'
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

  try {
    const q = query(
      collection(db, COLLECTIONS.BOOKMARKS),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const bookmarks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark));

    // Sort in memory by createdAt descending
    bookmarks.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return bookmarks;
  } catch (error) {
    console.error("Failed to load bookmarks:", error);
    return [];
  }
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

// 15-Line Quran Page Bookmarks
export const addPageBookmark = async (pageNumber: number) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${pageNumber}`;

  const docRef = doc(db, COLLECTIONS.PAGE_BOOKMARKS, id);
  await setDoc(docRef, {
    userId,
    pageNumber,
    createdAt: serverTimestamp()
  });
};

export const removePageBookmark = async (pageNumber: number) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${pageNumber}`;

  const docRef = doc(db, COLLECTIONS.PAGE_BOOKMARKS, id);
  await deleteDoc(docRef);
};

export const getPageBookmarks = async (): Promise<number[]> => {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;

  try {
    const q = query(
      collection(db, COLLECTIONS.PAGE_BOOKMARKS),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => doc.data());

    // Sort in memory by createdAt descending
    docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    return docs.map(d => d.pageNumber as number);
  } catch (error) {
    console.error("Failed to load page bookmarks:", error);
    return [];
  }
};

// 15-Line Quran Reading Progress
export const saveLastReadPage = async (pageNumber: number) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  const docRef = doc(db, COLLECTIONS.READING_PROGRESS, userId);
  await setDoc(docRef, {
    pageNumber,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getLastReadPage = async (): Promise<number | null> => {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;

  try {
    const docRef = doc(db, COLLECTIONS.READING_PROGRESS, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().pageNumber as number;
    }
  } catch (error) {
    console.error("Failed to load reading progress:", error);
  }
  return null;
};

// Tafseer Firestore helper
export const getTafseerFromFirestore = async (
  scholar: string,
  surahId: number,
  ayahNumber: number
): Promise<string | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.TAFSEER, scholar, 'ayahs', `${surahId}_${ayahNumber}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().tafseerText as string;
    }
  } catch (error) {
    console.warn("Firestore Tafseer fetch failed, using API/Local fallback:", error);
  }
  return null;
};
