import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from './translations';

interface LanguageContextType {
  language: Language;
  t: (key: keyof typeof translations['en']) => string;
  setLanguage: (lang: Language) => Promise<void>;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>('en');

  useEffect(() => {
    loadLang();
  }, []);

  const loadLang = async () => {
    const saved = await AsyncStorage.getItem('app_language');
    if (saved) setLang(saved as Language);
  };

  const setLanguage = async (lang: Language) => {
    setLang(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  const isRTL = language === 'ur';

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
