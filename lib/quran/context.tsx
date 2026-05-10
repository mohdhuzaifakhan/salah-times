import React, { createContext, useContext, useState, useEffect } from 'react';
import { getRecentRead, getUserPreferences, getBookmarks, Bookmark, RecentRead } from './db';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

interface QuranPreferences {
  fontSize: number;
  showTranslation: boolean;
  mushafMode: boolean;
  translationLanguage: string;
}

interface QuranContextType {
  bookmarks: Bookmark[];
  recentRead: RecentRead | null;
  preferences: QuranPreferences;
  loading: boolean;
  refreshBookmarks: () => Promise<void>;
  updatePreferences: (prefs: Partial<QuranPreferences>) => void;
  setRecentRead: (recent: RecentRead) => void;
}

const QuranContext = createContext<QuranContextType | undefined>(undefined);

export const QuranProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [recentRead, setRecentReadState] = useState<RecentRead | null>(null);
  const [preferences, setPreferences] = useState<QuranPreferences>({
    fontSize: 24,
    showTranslation: true,
    mushafMode: false,
    translationLanguage: 'eng-sahih',
  });
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [b, r, p] = await Promise.all([
        getBookmarks(),
        getRecentRead(),
        getUserPreferences()
      ]);

      setBookmarks(b);
      setRecentReadState(r);
      if (p) setPreferences(prev => ({ ...prev, ...p }));
    } catch (error) {
      console.error('Error loading Quran data:', error);
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
    const b = await getBookmarks();
    setBookmarks(b);
  };

  const updatePreferences = (prefs: Partial<QuranPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
    // Ideally debounced save to Firestore
  };

  const setRecentRead = (recent: RecentRead) => {
    setRecentReadState(recent);
  };

  return (
    <QuranContext.Provider value={{
      bookmarks,
      recentRead,
      preferences,
      loading,
      refreshBookmarks,
      updatePreferences,
      setRecentRead
    }}>
      {children}
    </QuranContext.Provider>
  );
};

export const useQuran = () => {
  const context = useContext(QuranContext);
  if (context === undefined) {
    throw new Error('useQuran must be used within a QuranProvider');
  }
  return context;
};
