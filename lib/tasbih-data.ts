import AsyncStorage from "@react-native-async-storage/async-storage";

export type TasbihCategory =
  | "all"
  | "fatimi"
  | "tahmeed"
  | "istighfar"
  | "salawat"
  | "kalimah"
  | "protection";

export interface TasbihItem {
  id: string;
  name: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  meaningUrdu: string;
  defaultTarget: number;
  virtue: string;
  category: TasbihCategory;
}

export const TASBIH_CATEGORIES: { id: TasbihCategory; label: string }[] = [
  { id: "all", label: "All Tasbih" },
  { id: "fatimi", label: "Tasbih Fatimi" },
  { id: "tahmeed", label: "Praise (Tahmeed)" },
  { id: "istighfar", label: "Istighfar" },
  { id: "salawat", label: "Durood / Salawat" },
  { id: "kalimah", label: "Kalimat" },
  { id: "protection", label: "Duas & Protection" },
];

export const TASBIH_ITEMS: TasbihItem[] = [
  // 1. Tasbih Fatimi - SubhanAllah
  {
    id: "subhanallah",
    name: "SubhanAllah",
    arabic: "سُبْحَانَ اللَّهِ",
    transliteration: "SubhanAllah",
    meaning: "Glory be to Allah",
    meaningUrdu: "اللہ پاک و بے عیب ہے",
    defaultTarget: 33,
    virtue: "Recited 33 times after every fardh salah as taught by the Prophet ﷺ to Sayyidah Fatima (RA). (Sahih Bukhari)",
    category: "fatimi",
  },
  // 2. Tasbih Fatimi - Alhamdulillah
  {
    id: "alhamdulillah",
    name: "Alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    meaning: "All praise is due to Allah",
    meaningUrdu: "تمام تعریفیں اللہ کے لیے ہیں",
    defaultTarget: 33,
    virtue: "The best supplication is Alhamdulillah and it fills the scale of good deeds. (Sahih Muslim)",
    category: "fatimi",
  },
  // 3. Tasbih Fatimi - Allahu Akbar
  {
    id: "allahuakbar",
    name: "Allahu Akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    meaning: "Allah is the Greatest",
    meaningUrdu: "اللہ سب سے بڑا ہے",
    defaultTarget: 34,
    virtue: "Completes the 100 beads of Tasbih Fatimi before sleep and after prayer. (Sahih Bukhari)",
    category: "fatimi",
  },
  // 4. Astaghfirullah
  {
    id: "astaghfirullah",
    name: "Astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّهَ",
    transliteration: "Astaghfirullah",
    meaning: "I seek forgiveness from Allah",
    meaningUrdu: "میں اللہ سے معافی مانگتا ہوں",
    defaultTarget: 100,
    virtue: "The Prophet ﷺ said: 'Seek Allah's forgiveness, for I seek His forgiveness more than seventy times a day.' (Sahih Bukhari)",
    category: "istighfar",
  },
  // 5. Astaghfirullah wa Atubu Ilayh
  {
    id: "astaghfirullah_atubu",
    name: "Astaghfirullah wa Atubu Ilayh",
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullah wa atubu ilayh",
    meaning: "I seek the forgiveness of Allah and I repent to Him",
    meaningUrdu: "میں اللہ سے بخشش طلب کرتا ہوں اور اسی کی طرف توبہ کرتا ہوں",
    defaultTarget: 100,
    virtue: "The Messenger of Allah ﷺ said: 'O people, repent to Allah, for I repent to Him one hundred times a day.' (Sahih Muslim)",
    category: "istighfar",
  },
  // 6. Sayyidul Istighfar
  {
    id: "sayyidul_istighfar",
    name: "Sayyidul Istighfar (Master of Forgiveness)",
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u laka bidhanbi faghfir li, fa-innahu la yaghfirudh-dhunuba illa Anta",
    meaning: "O Allah, You are my Lord; there is none worthy of worship except You. You created me and I am Your servant, and I abide by Your covenant as best I can. Forgive me, for none forgives sins except You.",
    meaningUrdu: "اے اللہ! تو میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں...",
    defaultTarget: 7,
    virtue: "Whoever recites this with firm conviction during the day or night and dies will be among the people of Paradise. (Sahih Bukhari)",
    category: "istighfar",
  },
  // 7. Durood-e-Ibrahimi
  {
    id: "durood_ibrahimi",
    name: "Durood-e-Ibrahimi",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala aali Muhammadin kama sallayta 'ala Ibrahima wa 'ala aali Ibrahima innaka Hamidum-Majeed",
    meaning: "O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy, Full of Glory.",
    meaningUrdu: "اے اللہ! محمد (ﷺ) اور ان کی آل پر رحمت نازل فرما جیسے تو نے ابراہیم (علیہ السلام) اور ان کی آل پر رحمت نازل فرمائی",
    defaultTarget: 33,
    virtue: "The most authentic and complete Salawat taught directly by the Holy Prophet ﷺ in response to the companions. (Sahih Bukhari)",
    category: "salawat",
  },
  // 8. Short Salawat
  {
    id: "salawat_short",
    name: "Sallallahu 'Alayhi Wasallam",
    arabic: "صَلَّى اللّٰهُ عَلَيْهِ وَسَلَّمَ",
    transliteration: "Sallallahu 'alayhi wa sallam",
    meaning: "May Allah send peace and blessings upon him",
    meaningUrdu: "اللہ تعالیٰ ان پر درود و سلام نازل فرمائے",
    defaultTarget: 100,
    virtue: "Whoever sends blessings upon the Prophet ﷺ once, Allah sends ten blessings upon him and erases ten sins. (Sunan an-Nasa'i)",
    category: "salawat",
  },
  // 9. Durood Tunajjina
  {
    id: "durood_tunajjina",
    name: "Durood Tunajjina",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ صَلَاةً تُنَجِّينَا بِهَا مِنْ جَمِيعِ الْأَهْوَالِ وَالْآفَاتِ، وَتَقْضِي لَنَا بِهَا جَمِيعَ الْحَاجَاتِ",
    transliteration: "Allahumma salli 'ala sayyidina Muhammadin salatan tunajjina biha min jamee'il ahwali wal aafat, wa taqdi lana biha jamee'al hajat",
    meaning: "O Allah, bless our master Muhammad with a prayer by which You deliver us from all fears and calamities, and fulfill all our needs.",
    meaningUrdu: "اے اللہ! ہمارے آقا محمد (ﷺ) پر ایسی رحمت نازل فرما جس کے ذریعے تو ہمیں تمام خوف اور آفات سے نجات دے...",
    defaultTarget: 33,
    virtue: "Renowned supplication of Salawat recited for the removal of hardship and distress.",
    category: "salawat",
  },
  // 10. Kalimah Tayyibah
  {
    id: "kalimah_tayyibah",
    name: "Kalimah Tayyibah (1st Kalimah)",
    arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ مُحَمَّدٌ رَّسُولُ اللّٰهِ",
    transliteration: "La ilaha illallahu Muhammadur Rasulullah",
    meaning: "There is no God but Allah; Muhammad is the Messenger of Allah",
    meaningUrdu: "اللہ کے سوا کوئی معبود نہیں، محمد (ﷺ) اللہ کے رسول ہیں",
    defaultTarget: 100,
    virtue: "The foundation of Islam. Whoever recites it sincerely from the heart, Paradise is guaranteed for them. (Sahih Bukhari)",
    category: "kalimah",
  },
  // 11. Tahlil
  {
    id: "tahlil",
    name: "La Ilaha Illallah",
    arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ",
    transliteration: "La ilaha illallah",
    meaning: "There is no deity worthy of worship except Allah",
    meaningUrdu: "اللہ کے سوا کوئی عبادت کے لائق نہیں",
    defaultTarget: 100,
    virtue: "The Prophet ﷺ said: 'The best dhikr is La ilaha illallah.' (Sunan al-Tirmidhi)",
    category: "kalimah",
  },
  // 12. 3rd Kalimah (Tamjeed)
  {
    id: "kalimah_tamjeed",
    name: "3rd Kalimah (Tamjeed)",
    arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلٰهَ إِلَّا اللّٰهُ وَاللَّهُ أَكْبَرُ",
    transliteration: "SubhanAllahi wal-hamdulillahi wa la ilaha illallahu wallahu Akbar",
    meaning: "Glory be to Allah, all praise is to Allah, there is no God but Allah, and Allah is the Greatest",
    meaningUrdu: "اللہ پاک ہے، سب تعریفیں اللہ کے لیے ہیں، اللہ کے سوا کوئی معبود نہیں اور اللہ سب سے بڑا ہے",
    defaultTarget: 33,
    virtue: "Reciting these four phrases is dearer to the Prophet ﷺ than everything upon which the sun rises. (Sahih Muslim)",
    category: "tahmeed",
  },
  // 13. SubhanAllahi wa biHamdihi
  {
    id: "subhanallahi_bihamdihi",
    name: "SubhanAllahi wa biHamdihi",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    transliteration: "SubhanAllahi wa bihamdihi, SubhanAllahil 'Azeem",
    meaning: "Glory be to Allah and His is the praise; Glory be to Allah the Almighty",
    meaningUrdu: "اللہ پاک ہے اپنی تعریف کے ساتھ، اللہ پاک ہے بڑی عظمت والا",
    defaultTarget: 100,
    virtue: "Two statements that are light on the tongue, heavy on the balance, and beloved to the Most Merciful. (Sahih Bukhari)",
    category: "tahmeed",
  },
  // 14. 4th Kalimah (Tawheed)
  {
    id: "kalimah_tawheed",
    name: "4th Kalimah (Tawheed)",
    arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu, wa Huwa 'ala kulli shay'in Qadeer",
    meaning: "There is no God but Allah alone without partner. His is sovereignty and praise, and He has power over all things.",
    meaningUrdu: "اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں، اسی کی بادشاہی ہے اور ہر چیز پر قادر ہے",
    defaultTarget: 100,
    virtue: "Whoever recites this 100 times in a day receives the reward of freeing 10 slaves and 100 sins are erased. (Sahih Bukhari)",
    category: "kalimah",
  },
  // 15. Ayat al-Karima (Dua of Prophet Yunus AS)
  {
    id: "ayat_karima",
    name: "Ayat al-Karima (Dua of Yunus AS)",
    arabic: "لَا إِلٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    transliteration: "La ilaha illa Anta subhanaka inni kuntu minaz-zalimin",
    meaning: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
    meaningUrdu: "تیرے سوا کوئی معبود نہیں، تو پاک ہے، بے شک میں ہی قصوروار تھا",
    defaultTarget: 100,
    virtue: "No Muslim supplicates with this in any difficulty except that Allah removes their difficulty. (Sunan al-Tirmidhi)",
    category: "protection",
  },
  // 16. Hawqalah
  {
    id: "hawqalah",
    name: "Hawqalah (La Hawla)",
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
    transliteration: "La hawla wa la quwwata illa billahil 'Aliyyil 'Azeem",
    meaning: "There is no power and no might except with Allah, the Most High, the Supreme",
    meaningUrdu: "گناہوں سے بچنے اور نیکی کرنے کی طاقت صرف بلند و عظمت والے اللہ ہی کی توفیق سے ہے",
    defaultTarget: 100,
    virtue: "It is a treasure from beneath the Throne of Allah and a cure for 99 ailments, the least of which is anxiety. (Al-Mustadrak)",
    category: "protection",
  },
  // 17. Hasbunallahu wa Ni'mal Wakeel
  {
    id: "hasbunallah",
    name: "Hasbunallah wa Ni'mal Wakeel",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal wakeel",
    meaning: "Allah is sufficient for us, and He is the best Disposer of affairs",
    meaningUrdu: "ہمیں اللہ کافی ہے اور وہ بہترین کارساز ہے",
    defaultTarget: 100,
    virtue: "Recited by Prophet Ibrahim (AS) when cast into fire, and by the Sahabah when confronted by armies. (Sahih Bukhari)",
    category: "protection",
  },
  // 18. Rabbi Zidni 'Ilma
  {
    id: "rabbi_zidni_ilma",
    name: "Rabbi Zidni 'Ilma",
    arabic: "رَّبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidni 'ilma",
    meaning: "My Lord, increase me in knowledge",
    meaningUrdu: "اے میرے رب! میرے علم میں اضافہ فرما",
    defaultTarget: 33,
    virtue: "Quranic prayer commanded by Allah to His Prophet ﷺ in Surah Ta-Ha (20:114).",
    category: "protection",
  },
];

// Target options for presets
export const TARGET_OPTIONS = [33, 99, 100, 313, 1000, 0]; // 0 represents Unlimited (∞)

// Storage Keys
const COUNTS_STORAGE_KEY = "@tasbih_counts_v2";
const STATS_STORAGE_KEY = "@tasbih_stats_v2";
const SETTINGS_STORAGE_KEY = "@tasbih_settings_v2";
export const TASBIH_MONTHLY_KEY_PREFIX = "@tasbih_month_";

// Backward compatibility alias
export const ALL_TASBIH_LIST = TASBIH_ITEMS;

export interface TasbihStats {
  todayCount: number;
  totalCount: number;
  lastDate: string; // YYYY-MM-DD
}

export interface TasbihSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: TasbihSettings = {
  soundEnabled: false,
  vibrationEnabled: true,
};

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export async function loadTasbihCounts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(COUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveTasbihCount(tasbihId: string, count: number): Promise<void> {
  try {
    const counts = await loadTasbihCounts();
    counts[tasbihId] = count;
    await AsyncStorage.setItem(COUNTS_STORAGE_KEY, JSON.stringify(counts));
  } catch (err) {
    console.error("Failed to save tasbih count:", err);
  }
}

export async function loadTasbihStats(): Promise<TasbihStats> {
  const today = getTodayDateString();
  try {
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      return { todayCount: 0, totalCount: 0, lastDate: today };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { todayCount: 0, totalCount: 0, lastDate: today };
    }
    // If date changed, reset today's count
    if (parsed.lastDate !== today) {
      return {
        todayCount: 0,
        totalCount: typeof parsed.totalCount === "number" ? parsed.totalCount : 0,
        lastDate: today,
      };
    }
    return {
      todayCount: typeof parsed.todayCount === "number" ? parsed.todayCount : 0,
      totalCount: typeof parsed.totalCount === "number" ? parsed.totalCount : 0,
      lastDate: parsed.lastDate || today,
    };
  } catch {
    return { todayCount: 0, totalCount: 0, lastDate: today };
  }
}

export function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export async function getTasbihMonthCount(monthKey?: string): Promise<number> {
  try {
    const key = `${TASBIH_MONTHLY_KEY_PREFIX}${monthKey || getCurrentMonthKey()}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return 0;
    const num = parseInt(raw, 10);
    return isNaN(num) ? 0 : num;
  } catch {
    return 0;
  }
}

export async function incrementTasbihStats(amount: number = 1): Promise<TasbihStats> {
  try {
    const current = await loadTasbihStats();
    const today = getTodayDateString();
    const updated: TasbihStats = {
      todayCount: (current.todayCount || 0) + amount,
      totalCount: (current.totalCount || 0) + amount,
      lastDate: today,
    };
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updated));

    // Also track monthly counts
    const monthKey = getCurrentMonthKey();
    const monthStorageKey = `${TASBIH_MONTHLY_KEY_PREFIX}${monthKey}`;
    const rawMonth = await AsyncStorage.getItem(monthStorageKey);
    const currentMonthTotal = rawMonth ? parseInt(rawMonth, 10) || 0 : 0;
    await AsyncStorage.setItem(monthStorageKey, (currentMonthTotal + amount).toString());

    return updated;
  } catch {
    return { todayCount: 0, totalCount: 0, lastDate: getTodayDateString() };
  }
}

export async function decrementTasbihStats(amount: number = 1): Promise<TasbihStats> {
  try {
    const current = await loadTasbihStats();
    const updated: TasbihStats = {
      todayCount: Math.max(0, (current.todayCount || 0) - amount),
      totalCount: Math.max(0, (current.totalCount || 0) - amount),
      lastDate: current.lastDate,
    };
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updated));

    // Also adjust monthly counts
    const monthKey = getCurrentMonthKey();
    const monthStorageKey = `${TASBIH_MONTHLY_KEY_PREFIX}${monthKey}`;
    const rawMonth = await AsyncStorage.getItem(monthStorageKey);
    const currentMonthTotal = rawMonth ? parseInt(rawMonth, 10) || 0 : 0;
    await AsyncStorage.setItem(monthStorageKey, Math.max(0, currentMonthTotal - amount).toString());

    return updated;
  } catch {
    return { todayCount: 0, totalCount: 0, lastDate: getTodayDateString() };
  }
}

export async function loadTasbihSettings(): Promise<TasbihSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveTasbihSettings(patch: Partial<TasbihSettings>): Promise<TasbihSettings> {
  try {
    const current = await loadTasbihSettings();
    const updated = { ...current, ...patch };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

