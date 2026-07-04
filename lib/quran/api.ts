import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SURA_START_PAGES } from './constants';

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
      axios.get(`${BASE_URL}/surah/${surahNumber}/quran-indopak`),
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
  ruku?: number;
  surahRuku?: number;
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

const CACHE_KEY_MUSHAF_PAGE = 'quran_mushaf_page_v3_';
const CACHE_KEY_TAFSEER = 'quran_tafseer_';

const getSurahFromList = (surahNumber: number, surahList: Surah[]): any => {
  const surah = surahList?.find(s => s.number === surahNumber);
  if (surah) return surah;

  const staticSurah = SURA_START_PAGES.find(s => s.number === surahNumber);
  return {
    number: surahNumber,
    name: staticSurah?.name || '',
    englishName: staticSurah?.englishName || '',
    englishNameTranslation: '',
    numberOfAyahs: 7, // fallback
    revelationType: 'Meccan'
  };
};

const enrichMushafPage = (page: any, surahList: Surah[], startRukus: { [key: number]: number }): MushafPage => {
  const mappedAyahs = page.ayahs.map((ayah: any) => {
    if (ayah.surah && ayah.surah.name) return ayah; // backwards compatibility
    const surahNum = ayah.surahNumber || ayah.surah?.number;
    const startRuku = startRukus[surahNum] || 1;
    return {
      ...ayah,
      surahRuku: ayah.surahRuku || (ayah.ruku ? (ayah.ruku - startRuku + 1) : undefined),
      surah: getSurahFromList(surahNum, surahList)
    };
  });

  const pageSurahs: { [key: number]: any } = {};
  mappedAyahs.forEach((ayah: any) => {
    if (ayah.surah && ayah.surah.number) {
      pageSurahs[ayah.surah.number] = ayah.surah;
    }
  });

  return {
    pageNumber: page.pageNumber,
    ayahs: mappedAyahs,
    surahs: pageSurahs
  };
};

// Fetch Quran page dynamically and cache it
export const fetchQuranPage = async (pageNumber: number, translationEdition: string = 'en.sahih'): Promise<MushafPage> => {
  const cacheKey = `${CACHE_KEY_MUSHAF_PAGE}${pageNumber}_${translationEdition}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    // Load surahs list and start rukus to enrich details
    const [surahListStr, startRukusStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY_SURAH_LIST),
      AsyncStorage.getItem('quran_surah_start_rukus')
    ]);
    const surahList: Surah[] = surahListStr ? JSON.parse(surahListStr) : [];
    const startRukus: { [key: number]: number } = startRukusStr ? JSON.parse(startRukusStr) : {};

    if (cached) {
      const page = JSON.parse(cached);
      return enrichMushafPage(page, surahList, startRukus);
    }

    // Fetch Indo-Pak Arabic text and translation in parallel
    const [arabicRes, translationRes] = await Promise.all([
      axios.get(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-indopak`),
      axios.get(`https://api.alquran.cloud/v1/page/${pageNumber}/${translationEdition}`)
    ]);

    const arabicAyahs = arabicRes.data.data.ayahs;
    const translationAyahs = translationRes.data.data.ayahs;

    // Merge Arabic & translation by index (saving ONLY surahNumber to save space)
    const mergedAyahs = arabicAyahs.map((ayah: any, index: number) => ({
      number: ayah.number,
      text: ayah.text,
      numberInSurah: ayah.numberInSurah,
      juz: ayah.juz,
      page: ayah.page,
      ruku: ayah.ruku,
      translation: translationAyahs[index]?.text || '',
      surahNumber: ayah.surah.number,
    }));

    const resultToSave = {
      pageNumber,
      ayahs: mergedAyahs
    };

    // Save optimized page to cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(resultToSave));

    // Enrich before returning
    return enrichMushafPage(resultToSave, surahList, startRukus);
  } catch (error) {
    console.error(`Error fetching Quran page ${pageNumber}:`, error);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const [surahListStr, startRukusStr] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY_SURAH_LIST),
          AsyncStorage.getItem('quran_surah_start_rukus')
        ]);
        const surahList: Surah[] = surahListStr ? JSON.parse(surahListStr) : [];
        const startRukus = startRukusStr ? JSON.parse(startRukusStr) : {};
        return enrichMushafPage(JSON.parse(cached), surahList, startRukus);
      } catch {
        return JSON.parse(cached);
      }
    }
    return {
      pageNumber,
      ayahs: [],
      surahs: {},
      error: true
    } as any;
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

const OFFLINE_SYNC_KEY = 'quran_offline_synced_v3_';

export const isQuranSynced = async (translationEdition: string = 'en.sahih'): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem(`${OFFLINE_SYNC_KEY}${translationEdition}`);
    return status === 'true';
  } catch {
    return false;
  }
};

export const syncFullQuran = async (
  translationEdition: string = 'en.sahih',
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  try {
    onProgress?.(0.05);

    // Pre-fetch and cache the surah list first
    let surahList: Surah[] = [];
    try {
      surahList = await fetchSurahList();
    } catch (e) {
      console.warn("Failed to fetch surah list during sync:", e);
    }

    onProgress?.(0.1);

    // Fetch Arabic (Indo-Pak) and translation in parallel
    const [arabicRes, translationRes] = await Promise.all([
      axios.get(`https://api.alquran.cloud/v1/quran/quran-indopak`),
      axios.get(`https://api.alquran.cloud/v1/quran/${translationEdition}`)
    ]);

    onProgress?.(0.45);

    const arabicSurahs = arabicRes.data.data.surahs;
    const translationSurahs = translationRes.data.data.surahs;

    // Track starting ruku index of each surah
    const surahStartRukus: { [key: number]: number } = {};
    arabicSurahs.forEach((surah: any) => {
      if (surah.ayahs && surah.ayahs.length > 0) {
        surahStartRukus[surah.number] = surah.ayahs[0].ruku;
      }
    });
    await AsyncStorage.setItem('quran_surah_start_rukus', JSON.stringify(surahStartRukus));

    // Group ayahs by page number (1 to 604) without redundant metadata objects
    const pagesMap: { [page: number]: { pageNumber: number; ayahs: any[] } } = {};
    for (let p = 1; p <= 604; p++) {
      pagesMap[p] = { pageNumber: p, ayahs: [] };
    }

    onProgress?.(0.65);

    arabicSurahs.forEach((surah: any, surahIdx: number) => {
      const transSurah = translationSurahs[surahIdx];
      const startRuku = surahStartRukus[surah.number] || 1;

      surah.ayahs.forEach((ayah: any, ayahIdx: number) => {
        const transAyah = transSurah.ayahs[ayahIdx];
        const pageNum = ayah.page;

        if (pageNum >= 1 && pageNum <= 604) {
          const merged = {
            number: ayah.number,
            text: ayah.text,
            numberInSurah: ayah.numberInSurah,
            juz: ayah.juz,
            page: ayah.page,
            ruku: ayah.ruku,
            surahRuku: ayah.ruku - startRuku + 1,
            translation: transAyah?.text || '',
            surahNumber: surah.number
          };

          pagesMap[pageNum].ayahs.push(merged);
        }
      });
    });

    onProgress?.(0.8);

    // Save pages in chunks to AsyncStorage
    const chunk_size = 50;
    for (let i = 1; i <= 604; i += chunk_size) {
      const chunk: [string, string][] = [];
      for (let j = i; j < i + chunk_size && j <= 604; j++) {
        chunk.push([`${CACHE_KEY_MUSHAF_PAGE}${j}_${translationEdition}`, JSON.stringify(pagesMap[j])]);
      }
      await AsyncStorage.multiSet(chunk);
    }

    // Save sync status
    await AsyncStorage.setItem(`${OFFLINE_SYNC_KEY}${translationEdition}`, 'true');

    onProgress?.(1.0);
    return true;
  } catch (error) {
    console.error('Error syncing full Quran:', error);
    return false;
  }
};

