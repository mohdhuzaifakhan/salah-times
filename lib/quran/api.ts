import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.alquran.cloud/v1';

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  audio: string;
  audioSecondary: string[];
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  translation?: string;
}

export interface SurahDetail extends Surah {
  ayahs: Ayah[];
  edition?: any;
}

const CACHE_KEY_SURAH_LIST = 'quran_surah_list';
const CACHE_KEY_SURAH_DETAIL = 'quran_surah_detail_';

export const fetchSurahList = async (): Promise<Surah[]> => {
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(CACHE_KEY_SURAH_LIST);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const response = await axios.get(`${BASE_URL}/surah`);
    const surahs = response.data.data;
    
    // Save to cache
    await AsyncStorage.setItem(CACHE_KEY_SURAH_LIST, JSON.stringify(surahs));
    
    return surahs;
  } catch (error) {
    console.error('Error fetching surah list:', error);
    // If offline and no cache, return empty list or throw
    const cachedData = await AsyncStorage.getItem(CACHE_KEY_SURAH_LIST);
    if (cachedData) return JSON.parse(cachedData);
    throw error;
  }
};

export const fetchSurahDetail = async (surahNumber: number, edition: string = 'en.sahih'): Promise<SurahDetail> => {
  try {
    const cacheKey = `${CACHE_KEY_SURAH_DETAIL}${surahNumber}_${edition}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Fetch Arabic and translation in parallel
    const [arabicRes, translationRes] = await Promise.all([
      axios.get(`${BASE_URL}/surah/${surahNumber}/ar.alafasy`),
      axios.get(`${BASE_URL}/surah/${surahNumber}/${edition}`)
    ]);

    const surahData = arabicRes.data.data;
    const translationData = translationRes.data.data;

    // Merge translation into ayahs
    const ayahsWithTranslation = surahData.ayahs.map((ayah: any, index: number) => ({
      ...ayah,
      translation: translationData.ayahs[index].text
    }));

    const result = {
      ...surahData,
      ayahs: ayahsWithTranslation
    };

    // Save to cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error(`Error fetching surah ${surahNumber} detail:`, error);
    const cacheKey = `${CACHE_KEY_SURAH_DETAIL}${surahNumber}_${edition}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) return JSON.parse(cachedData);
    throw error;
  }
};

export const getAudioUrl = (surahNumber: number, ayahNumber?: number) => {
  if (ayahNumber) {
    return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahNumber}.mp3`;
  }
  return `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`;
};
