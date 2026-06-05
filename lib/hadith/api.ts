import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

export interface HadithBook {
  name: string;
  slug: string;
  count: number;
  description: string;
}

export interface Hadith {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: { name: string; grade: string }[];
  reference: { book: number; hadith: number };
}

export const BOOKS: HadithBook[] = [
  { name: 'Sahih al-Bukhari', slug: 'eng-bukhari', count: 7563, description: 'The most authentic book of Hadith' },
  { name: 'Sahih Muslim', slug: 'eng-muslim', count: 7563, description: 'One of the Sahihayn' },
  { name: 'Sunan an-Nasa\'i', slug: 'eng-nasai', count: 5758, description: 'One of the Kutub al-Sittah' },
  { name: 'Sunan Abu Dawood', slug: 'eng-abudawood', count: 5274, description: 'Collected by Abu Dawood' },
  { name: 'Jami at-Tirmidhi', slug: 'eng-tirmidhi', count: 3956, description: 'Famous for its legal commentary' },
  { name: 'Sunan Ibn Majah', slug: 'eng-ibnmajah', count: 4341, description: 'One of the six major collections' },
];

const MEMORY_CACHE: Record<string, any> = {};

export const fetchHadithByNumber = async (slug: string, number: number, lang: string = 'eng'): Promise<any> => {
  try {
    const cacheKey = `h_${slug}_${number}_${lang}`;
    if (MEMORY_CACHE[cacheKey]) return MEMORY_CACHE[cacheKey];

    // Map common slug to specific language edition if needed
    // The slug provided is usually 'eng-bukhari'
    const editionSlug = slug.replace('eng-', `${lang}-`);

    let transRes, arabicRes;
    try {
      [transRes, arabicRes] = await Promise.all([
        axios.get(`${BASE_URL}/${editionSlug}/${number}.json`)
          .catch(() => axios.get(`${BASE_URL}/${slug}/${number}.json`)),
        axios.get(`${BASE_URL}/${slug.replace('eng-', 'ara-')}/${number}.json`)
          .catch(() => ({ data: { hadiths: [] } }))
      ]);
    } catch (apiError) {
      console.warn("API request failed:", apiError);
      return {
        hadithnumber: number,
        arabicnumber: number,
        text: "[Error loading Hadith. Please check your network connection.]",
        arabicText: "",
        grades: [],
        error: true
      };
    }

    const hadith = transRes?.data?.hadiths?.[0];
    if (!hadith) {
      return {
        hadithnumber: number,
        arabicnumber: number,
        text: "[Hadith not found.]",
        arabicText: "",
        grades: [],
        error: true
      };
    }

    const data = {
      ...hadith,
      arabicText: arabicRes?.data?.hadiths?.[0]?.text || '',
      metadata: transRes?.data?.metadata
    };

    MEMORY_CACHE[cacheKey] = data;
    return data;
  } catch (error) {
    console.error(`Error fetching hadith ${number} for ${slug}:`, error);
    return {
      hadithnumber: number,
      arabicnumber: number,
      text: "[Error loading Hadith. Please check your network connection.]",
      arabicText: "",
      grades: [],
      error: true
    };
  }
};

export const getDailyHadith = async (): Promise<any> => {
  const book = BOOKS[Math.floor(Math.random() * BOOKS.length)];
  const randomNum = Math.floor(Math.random() * book.count) + 1;
  const hadith = await fetchHadithByNumber(book.slug, randomNum);
  return { ...hadith, bookName: book.name, bookSlug: book.slug };
};
