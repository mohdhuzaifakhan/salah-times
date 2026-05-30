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

// 15-Line Mushaf Page Interface
export interface MushafAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  translation?: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
  };
}

export interface MushafPage {
  pageNumber: number;
  ayahs: MushafAyah[];
  surahs: { [key: number]: any };
}

const CACHE_KEY_MUSHAF_PAGE = 'quran_mushaf_page_';
const CACHE_KEY_TAFSEER = 'quran_tafseer_';

// Fetch Quran page dynamically and cache it
export const fetchQuranPage = async (pageNumber: number, translationEdition: string = 'en.sahih'): Promise<MushafPage> => {
  const cacheKey = `${CACHE_KEY_MUSHAF_PAGE}${pageNumber}_${translationEdition}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch Uthmani Arabic text and translation in parallel
    const [arabicRes, translationRes] = await Promise.all([
      axios.get(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-uthmani`),
      axios.get(`https://api.alquran.cloud/v1/page/${pageNumber}/${translationEdition}`)
    ]);

    const arabicAyahs = arabicRes.data.data.ayahs;
    const translationAyahs = translationRes.data.data.ayahs;
    const surahs = arabicRes.data.data.surahs;

    // Merge Arabic & translation by index
    const mergedAyahs: MushafAyah[] = arabicAyahs.map((ayah: any, index: number) => ({
      number: ayah.number,
      text: ayah.text,
      numberInSurah: ayah.numberInSurah,
      juz: ayah.juz,
      page: ayah.page,
      translation: translationAyahs[index]?.text || '',
      surah: {
        number: ayah.surah.number,
        name: ayah.surah.name,
        englishName: ayah.surah.englishName,
        englishNameTranslation: ayah.surah.englishNameTranslation,
        numberOfAyahs: ayah.surah.numberOfAyahs,
        revelationType: ayah.surah.revelationType,
      }
    }));

    const result: MushafPage = {
      pageNumber,
      ayahs: mergedAyahs,
      surahs
    };

    // Save to cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`Error fetching Quran page ${pageNumber}:`, error);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    throw error;
  }
};

// Fetch Tafseer from Quran.com API with ID mapping
export const fetchTafseerFromAPI = async (
  scholar: string,
  surahId: number,
  ayahNumber: number,
  language: string = 'en'
): Promise<string> => {
  const cacheKey = `${CACHE_KEY_TAFSEER}${scholar}_${surahId}_${ayahNumber}_${language}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let tafseerText = '';

    // Handle Mufti Taqi Usmani (Translation with Explanatory Notes)
    if (scholar === 'taqi_usmani') {
      const translationId = language === 'ur' ? 151 : 84; // 151: Tafsir-e-Usmani, 84: English Taqi Usmani translation + brief notes
      const response = await axios.get(`https://api.quran.com/api/v4/verses/by_key/${surahId}:${ayahNumber}?translations=${translationId}`);
      const translation = response.data.verse?.translations?.[0]?.text;
      
      if (translation) {
        tafseerText = translation;
      }
    } else {
      // Map other scholars to Quran.com Tafseer IDs
      let tafseerId = 169; // Default Ibn Kathir English
      if (language === 'ur') {
        if (scholar === 'maududi') tafseerId = 158; // Maududi Urdu
        else if (scholar === 'maariful_quran' || scholar === 'mufti_shafi') tafseerId = 168; // Maariful Quran Urdu
        else if (scholar === 'ibn_kathir') tafseerId = 97; // Tafheem/Ibn Kathir Urdu equivalent
        else tafseerId = 158;
      } else {
        if (scholar === 'ibn_kathir') tafseerId = 169; // Ibn Kathir English
        else if (scholar === 'maududi') tafseerId = 97; // Maududi English (Tafheem)
        else if (scholar === 'jalalayn') tafseerId = 93; // Jalalayn English
        else if (scholar === 'sayyid_qutb') tafseerId = 149; // In the Shade of the Quran
        else if (scholar === 'maariful_quran' || scholar === 'mufti_shafi') tafseerId = 168; // Maarif Urdu
      }

      const response = await axios.get(`https://api.quran.com/api/v4/tafsirs/${tafseerId}/by_ayah/${surahId}:${ayahNumber}`);
      tafseerText = response.data.tafsir?.text || '';
    }

    // Clean up HTML tags if any (Quran.com Tafseer contains HTML tags)
    if (tafseerText) {
      // Replace paragraph and break tags with simple formatting, then remove remaining tags
      tafseerText = tafseerText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '') // remove tags
        .trim();
    }

    if (!tafseerText) {
      tafseerText = `Explanatory note / Tafseer is currently not available for this scholar in ${language.toUpperCase()}.`;
    }

    await AsyncStorage.setItem(cacheKey, JSON.stringify(tafseerText));
    return tafseerText;
  } catch (error) {
    console.error(`Error fetching Tafseer for ${scholar} ${surahId}:${ayahNumber}:`, error);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
    return `Failed to fetch Tafseer. Please check your internet connection.`;
  }
};

