import React, { createContext, useContext, useState, useEffect } from 'react';
import { getHadithBookmarks, getRecentHadith, HadithBookmark, RecentHadith } from './db';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

interface HadithPreferences {
  fontSize: number;
  showArabic: boolean;
  language: 'eng' | 'hin' | 'urd';
}

interface HadithContextType {
  bookmarks: HadithBookmark[];
  recentRead: RecentHadith | null;
  preferences: HadithPreferences;
  loading: boolean;
  refreshBookmarks: () => Promise<void>;
  updatePreferences: (prefs: Partial<HadithPreferences>) => void;
  setRecentRead: (recent: RecentHadith) => void;
}

const HadithContext = createContext<HadithContextType | undefined>(undefined);

export const HadithProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<HadithBookmark[]>([]);
  const [recentRead, setRecentReadState] = useState<RecentHadith | null>(null);
  const [preferences, setPreferences] = useState<HadithPreferences>({
    fontSize: 18,
    showArabic: true,
    language: 'eng',
  });
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [b, r] = await Promise.all([
        getHadithBookmarks(),
        getRecentHadith()
      ]);

      setBookmarks(b);
      setRecentReadState(r);
    } catch (error) {
      console.error('Error loading Hadith data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadUserData();
      } else {
        setBookmarks([]);
        setRecentReadState(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshBookmarks = async () => {
    const b = await getHadithBookmarks();
    setBookmarks(b);
  };

  const updatePreferences = (prefs: Partial<HadithPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const setRecentRead = (recent: RecentHadith) => {
    setRecentReadState(recent);
  };

  return (
    <HadithContext.Provider value={{
      bookmarks,
      recentRead,
      preferences,
      loading,
      refreshBookmarks,
      updatePreferences,
      setRecentRead
    }}>
      {children}
    </HadithContext.Provider>
  );
};

export const useHadith = () => {
  const context = useContext(HadithContext);
  if (context === undefined) {
    throw new Error('useHadith must be used within a HadithProvider');
  }
  return context;
};
