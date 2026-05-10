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

export interface HadithBookmark {
  id: string;
  bookSlug: string;
  hadithNumber: number;
  bookName: string;
  text: string;
  arabicText: string;
  createdAt: any;
}

export interface RecentHadith {
  bookSlug: string;
  hadithNumber: number;
  bookName: string;
  updatedAt: any;
}

const COLLECTIONS = {
  BOOKMARKS: 'hadith_bookmarks',
  RECENT: 'recent_hadiths'
};

export const addHadithBookmark = async (bookmark: Omit<HadithBookmark, 'id' | 'createdAt'>) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${bookmark.bookSlug}_${bookmark.hadithNumber}`;
  
  const docRef = doc(db, COLLECTIONS.BOOKMARKS, id);
  await setDoc(docRef, {
    ...bookmark,
    userId,
    createdAt: serverTimestamp()
  });
};

export const removeHadithBookmark = async (bookSlug: string, hadithNumber: number) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const id = `${userId}_${bookSlug}_${hadithNumber}`;
  
  const docRef = doc(db, COLLECTIONS.BOOKMARKS, id);
  await deleteDoc(docRef);
};

export const getHadithBookmarks = async (): Promise<HadithBookmark[]> => {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;
  
  const q = query(
    collection(db, COLLECTIONS.BOOKMARKS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HadithBookmark));
};

export const updateRecentHadith = async (recent: Omit<RecentHadith, 'updatedAt'>) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.RECENT, userId);
  await setDoc(docRef, {
    ...recent,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getRecentHadith = async (): Promise<RecentHadith | null> => {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const docRef = doc(db, COLLECTIONS.RECENT, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as RecentHadith;
  }
  return null;
};
