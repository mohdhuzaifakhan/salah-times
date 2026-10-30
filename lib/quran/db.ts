import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
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
  translation?: string;
  createdAt: any;
  pageNumber?: number;
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

export const LOCAL_QURAN_KEYS = {
  LAST_READ_PAGE: '@quran_last_read_page',
  BOOKMARKS: '@quran_bookmarks',
  PAGE_BOOKMARKS: '@quran_page_bookmarks',
  RECENT_READ: '@quran_recent_read',
  PREFERENCES: '@quran_user_preferences',
  MONTHLY_PAGES_PREFIX: '@quran_monthly_pages_', // e.g. @quran_monthly_pages_2026-10
};

// ============================================================================
// 1. AYAH BOOKMARKS (Local AsyncStorage + Firestore sync)
// ============================================================================

export const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
  const bookmarkId = `${bookmark.surahNumber}_${bookmark.ayahNumber}`;
  const newBookmark: Bookmark = {
    ...bookmark,
    id: bookmarkId,
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
  };

  // 1. Always save to local cache
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.BOOKMARKS);
    const existing: Bookmark[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(
      (b) => !(b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber)
    );
    const updated = [newBookmark, ...filtered];
    await AsyncStorage.setItem(LOCAL_QURAN_KEYS.BOOKMARKS, JSON.stringify(updated));
  } catch (err) {
    console.error('[Quran DB] Local save bookmark failed:', err);
  }

  // 2. Sync to Firestore if user is authenticated
  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.BOOKMARKS, `${userId}_${bookmarkId}`);
      await setDoc(docRef, {
        ...bookmark,
        userId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Quran DB] Firestore bookmark sync failed (offline or guest):', err);
    }
  }
};

export const removeBookmark = async (surahNumber: number, ayahNumber: number) => {
  // 1. Always remove from local cache
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.BOOKMARKS);
    if (raw) {
      const existing: Bookmark[] = JSON.parse(raw);
      const updated = existing.filter(
        (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
      );
      await AsyncStorage.setItem(LOCAL_QURAN_KEYS.BOOKMARKS, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('[Quran DB] Local remove bookmark failed:', err);
  }

  // 2. Sync to Firestore if authenticated
  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const bookmarkId = `${userId}_${surahNumber}_${ayahNumber}`;
      const docRef = doc(db, COLLECTIONS.BOOKMARKS, bookmarkId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[Quran DB] Firestore bookmark delete failed:', err);
    }
  }
};

export const getBookmarks = async (): Promise<Bookmark[]> => {
  let localBookmarks: Bookmark[] = [];

  // 1. Read from local cache first (guarantees instant offline access)
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.BOOKMARKS);
    if (raw) {
      localBookmarks = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Quran DB] Local getBookmarks failed:', err);
  }

  // 2. If authenticated, fetch from Firestore in background & merge
  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const q = query(
        collection(db, COLLECTIONS.BOOKMARKS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const firestoreBookmarks = querySnapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Bookmark)
      );

      if (firestoreBookmarks.length > 0) {
        // Merge without duplicates
        const map = new Map<string, Bookmark>();
        for (const b of localBookmarks) {
          map.set(`${b.surahNumber}_${b.ayahNumber}`, b);
        }
        for (const b of firestoreBookmarks) {
          map.set(`${b.surahNumber}_${b.ayahNumber}`, b);
        }
        const merged = Array.from(map.values());
        merged.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        // Update local cache
        void AsyncStorage.setItem(LOCAL_QURAN_KEYS.BOOKMARKS, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('[Quran DB] Firestore getBookmarks failed, using local cache:', err);
    }
  }

  return localBookmarks;
};

// ============================================================================
// 2. RECENT READ
// ============================================================================

export const updateRecentRead = async (recent: Omit<RecentRead, 'updatedAt'>) => {
  const record: RecentRead = {
    ...recent,
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
  };

  try {
    await AsyncStorage.setItem(LOCAL_QURAN_KEYS.RECENT_READ, JSON.stringify(record));
  } catch (err) {
    console.error('[Quran DB] Local save recent read failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.RECENT_READS, userId);
      await setDoc(
        docRef,
        {
          ...recent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Quran DB] Firestore recent read sync failed:', err);
    }
  }
};

export const getRecentRead = async (): Promise<RecentRead | null> => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.RECENT_READ);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Quran DB] Local getRecentRead failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.RECENT_READS, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as RecentRead;
        void AsyncStorage.setItem(LOCAL_QURAN_KEYS.RECENT_READ, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('[Quran DB] Firestore getRecentRead failed:', err);
    }
  }
  return null;
};

// ============================================================================
// 3. USER PREFERENCES
// ============================================================================

export const saveUserPreferences = async (prefs: any) => {
  try {
    await AsyncStorage.setItem(LOCAL_QURAN_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (err) {
    console.error('[Quran DB] Local save user preferences failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
      await setDoc(docRef, prefs, { merge: true });
    } catch (err) {
      console.warn('[Quran DB] Firestore saveUserPreferences failed:', err);
    }
  }
};

export const getUserPreferences = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.PREFERENCES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Quran DB] Local getUserPreferences failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        void AsyncStorage.setItem(LOCAL_QURAN_KEYS.PREFERENCES, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('[Quran DB] Firestore getUserPreferences failed:', err);
    }
  }
  return null;
};

// ============================================================================
// 4. 15-LINE QURAN PAGE BOOKMARKS
// ============================================================================

export const addPageBookmark = async (pageNumber: number) => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS);
    const pages: number[] = raw ? JSON.parse(raw) : [];
    if (!pages.includes(pageNumber)) {
      const updated = [pageNumber, ...pages];
      await AsyncStorage.setItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('[Quran DB] Local addPageBookmark failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const id = `${userId}_${pageNumber}`;
      const docRef = doc(db, COLLECTIONS.PAGE_BOOKMARKS, id);
      await setDoc(docRef, {
        userId,
        pageNumber,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Quran DB] Firestore addPageBookmark failed:', err);
    }
  }
};

export const removePageBookmark = async (pageNumber: number) => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS);
    if (raw) {
      const pages: number[] = JSON.parse(raw);
      const updated = pages.filter((p) => p !== pageNumber);
      await AsyncStorage.setItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('[Quran DB] Local removePageBookmark failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const id = `${userId}_${pageNumber}`;
      const docRef = doc(db, COLLECTIONS.PAGE_BOOKMARKS, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[Quran DB] Firestore removePageBookmark failed:', err);
    }
  }
};

export const getPageBookmarks = async (): Promise<number[]> => {
  let localPages: number[] = [];

  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS);
    if (raw) {
      localPages = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Quran DB] Local getPageBookmarks failed:', err);
  }

  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const q = query(
        collection(db, COLLECTIONS.PAGE_BOOKMARKS),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => d.data());
      docs.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      const remotePages = docs.map((d) => d.pageNumber as number);

      const merged = Array.from(new Set([...remotePages, ...localPages]));
      void AsyncStorage.setItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS, JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn('[Quran DB] Firestore getPageBookmarks failed:', err);
    }
  }

  return localPages;
};

// ============================================================================
// 5. 15-LINE QURAN READING PROGRESS & MONTHLY TRACKING
// ============================================================================

export const saveLastReadPage = async (pageNumber: number) => {
  if (pageNumber < 1 || pageNumber > 604) return;

  // 1. Always save to local AsyncStorage immediately
  try {
    await AsyncStorage.setItem(LOCAL_QURAN_KEYS.LAST_READ_PAGE, pageNumber.toString());

    // Track pages read in current month
    const currentMonthKey = `${LOCAL_QURAN_KEYS.MONTHLY_PAGES_PREFIX}${moment().format('YYYY-MM')}`;
    const raw = await AsyncStorage.getItem(currentMonthKey);
    const pages: number[] = raw ? JSON.parse(raw) : [];
    if (!pages.includes(pageNumber)) {
      pages.push(pageNumber);
      await AsyncStorage.setItem(currentMonthKey, JSON.stringify(pages));
    }
  } catch (err) {
    console.error('[Quran DB] Local saveLastReadPage failed:', err);
  }

  // 2. Sync to Firestore if signed in
  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.READING_PROGRESS, userId);
      await setDoc(
        docRef,
        {
          pageNumber,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Quran DB] Firestore saveLastReadPage sync failed:', err);
    }
  }
};

export const getLastReadPage = async (): Promise<number | null> => {
  // 1. Check local AsyncStorage first
  try {
    const raw = await AsyncStorage.getItem(LOCAL_QURAN_KEYS.LAST_READ_PAGE);
    if (raw) {
      const page = parseInt(raw, 10);
      if (!isNaN(page) && page >= 1 && page <= 604) {
        return page;
      }
    }
  } catch (err) {
    console.error('[Quran DB] Local getLastReadPage failed:', err);
  }

  // 2. If authenticated, check Firestore
  if (auth.currentUser) {
    try {
      const userId = auth.currentUser.uid;
      const docRef = doc(db, COLLECTIONS.READING_PROGRESS, userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const page = snap.data().pageNumber as number;
        if (page >= 1 && page <= 604) {
          void AsyncStorage.setItem(LOCAL_QURAN_KEYS.LAST_READ_PAGE, page.toString());
          return page;
        }
      }
    } catch (err) {
      console.warn('[Quran DB] Firestore getLastReadPage failed:', err);
    }
  }
  return null;
};

// ============================================================================
// 6. TAFSEER FIRESTORE HELPER
// ============================================================================

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
    console.warn('[Quran DB] Firestore Tafseer fetch failed, using fallback:', error);
  }
  return null;
};
