import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DuaItem {
  id: string;
  category: string;
  title: string;
  arabicTitle?: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  virtue?: string;
  count: number; // Prescribed repetition (1, 3, 7, 33, 100)
}

export interface DuaCategory {
  id: string;
  name: string;
  arabicName: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const DUA_CATEGORIES: DuaCategory[] = [
  { id: "all", name: "All Duas", arabicName: "جميع الأدعية", icon: "grid-outline", color: "#0D7377", bgColor: "#EAF4F4" },
  { id: "morning", name: "Morning Azkar", arabicName: "أذكار الصباح", icon: "sunny-outline", color: "#D97706", bgColor: "#FFFBEB" },
  { id: "evening", name: "Evening Azkar", arabicName: "أذكار المساء", icon: "moon-outline", color: "#4F46E5", bgColor: "#EEF2FF" },
  { id: "daily", name: "Daily Routine", arabicName: "أدعية يومية", icon: "time-outline", color: "#0D7377", bgColor: "#EAF4F4" },
  { id: "quran", name: "Quranic Duas (Rabbana)", arabicName: "أدعية قرآنية", icon: "book-outline", color: "#059669", bgColor: "#ECFDF5" },
  { id: "salah", name: "After Salah", arabicName: "أذكار بعد الصلاة", icon: "fitness-outline", color: "#0284C7", bgColor: "#F0F9FF" },
  { id: "anxiety", name: "Anxiety & Distress", arabicName: "الهم والحزن", icon: "shield-checkmark-outline", color: "#DC2626", bgColor: "#FEF2F2" },
  { id: "shifa", name: "Shifa & Health", arabicName: "الشفاء والعافية", icon: "heart-outline", color: "#E11D48", bgColor: "#FFF1F2" },
  { id: "istighfar", name: "Forgiveness & Tawbah", arabicName: "الاستغفار والتوبة", icon: "sparkles-outline", color: "#7C3AED", bgColor: "#F5F3FF" },
  { id: "travel", name: "Travel & Journey", arabicName: "أدعية السفر", icon: "airplane-outline", color: "#2563EB", bgColor: "#EFF6FF" },
  { id: "family", name: "Home & Family", arabicName: "البيت والأهل", icon: "home-outline", color: "#16A34A", bgColor: "#F0FDF4" },
  { id: "hajj", name: "Hajj & Umrah", arabicName: "الحج والعمرة", icon: "business-outline", color: "#B45309", bgColor: "#FEF3C7" },
];

export const ALL_DUAS: DuaItem[] = [
  // ===================== MORNING AZKAR =====================
  {
    id: "morn_1",
    category: "Morning Azkar",
    title: "Protection Against All Calamity & Harm",
    arabicTitle: "الحماية من كل ضرر",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa huwas-Samee'ul-'Aleem",
    translation: "In the Name of Allah, with Whose Name nothing on the earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.",
    reference: "Sunan Abu Dawud (5088), Jami` at-Tirmidhi (3388)",
    virtue: "Whoever recites this 3 times in the morning and 3 times in the evening, nothing shall harm them.",
    count: 3,
  },
  {
    id: "morn_2",
    category: "Morning Azkar",
    title: "Sayyidul Istighfar (The Master Supplication for Forgiveness)",
    arabicTitle: "سيد الاستغفار",
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'oodhu bika min sharri ma sana'tu, aboo'u laka bini'matika 'alayya, wa aboo'u laka bidhanbee faghfir lee fa-innahu la yaghfirudh-dhunooba illa Anta",
    translation: "O Allah, You are my Lord, there is no deity worthy of worship except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have committed. I acknowledge Your blessings upon me, and I confess my sins to You; so forgive me, for none forgives sins except You.",
    reference: "Sahih al-Bukhari (6306)",
    virtue: "Whoever says this with conviction in the morning and dies before evening will be among the people of Paradise.",
    count: 1,
  },
  {
    id: "morn_3",
    category: "Morning Azkar",
    title: "Pleasure with Allah, Islam, and the Prophet",
    arabicTitle: "الرضا بالله رباً",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
    transliteration: "Radeetu billahi Rabba, wa bil-Islami deena, wa bi-Muhammadin sallallahu 'alayhi wa sallama Nabiyya",
    translation: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace and blessings of Allah be upon him) as my Prophet.",
    reference: "Sunan Abi Dawud (5072), Jami` at-Tirmidhi (3389)",
    virtue: "Allah has promised to satisfy and delight anyone who repeats this 3 times in the morning and evening.",
    count: 3,
  },
  {
    id: "morn_4",
    category: "Morning Azkar",
    title: "Morning Praises & Universal Kingship",
    arabicTitle: "أصبحنا وأصبح الملك لله",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadeer",
    translation: "We have entered the morning and the entire dominion belongs to Allah. All praise is due to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and to Him belongs all praise, and He is over all things Competent.",
    reference: "Sahih Muslim (2723)",
    virtue: "A foundational morning supplication acknowledging Allah's supreme authority upon starting a new day.",
    count: 1,
  },
  {
    id: "morn_5",
    category: "Morning Azkar",
    title: "Seeking Well-Being in Religion, World & Body",
    arabicTitle: "العافية في الدين والدنيا",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي",
    transliteration: "Allahumma innee as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah. Allahumma innee as'alukal-'afwa wal-'afiyata fee deenee wa dunyaya wa ahlee wa malee. Allahummas-tur 'awratee wa amin raw'atee",
    translation: "O Allah, I ask You for pardon and well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family, and my wealth. O Allah, conceal my faults and calm my anxieties.",
    reference: "Sunan Abu Dawud (5074), Sunan Ibn Majah (3871)",
    virtue: "The Messenger of Allah (PBUH) never omitted these supplications in the morning and evening.",
    count: 1,
  },
  {
    id: "morn_6",
    category: "Morning Azkar",
    title: "Glorification Matching the Measure of All Creation",
    arabicTitle: "سبحان الله وبحمده عدد خلقه",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    transliteration: "Subhanallahi wa bihamdihi, 'adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatih",
    translation: "Glory is to Allah and praise is to Him, to the extent of the number of His creation, according to His pleasure, in weight equal to His Throne, and by the ink of His words.",
    reference: "Sahih Muslim (2726)",
    virtue: "The Prophet (PBUH) said reciting this 3 times outweighs hours of continuous remembrance.",
    count: 3,
  },

  // ===================== EVENING AZKAR =====================
  {
    id: "eve_1",
    category: "Evening Azkar",
    title: "Evening Entry & Protection from Night Evil",
    arabicTitle: "أمسينا وأمسى الملك لله",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadeer",
    translation: "We have reached the evening and the entire kingdom belongs to Allah. All praise is for Allah. There is no deity worthy of worship except Allah alone, without partner.",
    reference: "Sahih Muslim (2723)",
    virtue: "Shields the believer throughout the night until morning arrives.",
    count: 1,
  },
  {
    id: "eve_2",
    category: "Evening Azkar",
    title: "Protection Against the Evil of Creation",
    arabicTitle: "الاستعاذة بكلمات الله التامات",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'oodhu bi-kalimatil-lahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of that which He has created.",
    reference: "Sahih Muslim (2709)",
    virtue: "Whoever recites this 3 times in the evening will not be harmed by any poison or pest during the night.",
    count: 3,
  },
  {
    id: "eve_3",
    category: "Evening Azkar",
    title: "Evening Surrender & Entrustment to Allah",
    arabicTitle: "اللهم بك أمسينا",
    arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
    transliteration: "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namootu, wa ilaykal-maseer",
    translation: "O Allah, by You we enter the evening, and by You we enter the morning, by You we live, by You we die, and unto You is our final return.",
    reference: "Jami` at-Tirmidhi (3391)",
    virtue: "Expresses absolute reliance and acknowledgement of Allah's control over life, evening, and destiny.",
    count: 1,
  },

  // ===================== DAILY ROUTINE DUAS =====================
  {
    id: "daily_wake",
    category: "Daily Routine",
    title: "Upon Waking Up from Sleep",
    arabicTitle: "دعاء الاستيقاظ من النوم",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alhamdu lillahil-ladhee ahyana ba'da ma amatana wa ilayhin-nushoor",
    translation: "All praise is for Allah Who gave us life after causing us to die, and unto Him is the resurrection.",
    reference: "Sahih al-Bukhari (6312)",
    virtue: "Sunnah of the Prophet (PBUH) upon waking up to begin the day with grateful remembrance.",
    count: 1,
  },
  {
    id: "daily_sleep",
    category: "Daily Routine",
    title: "Before Sleeping at Night",
    arabicTitle: "دعاء النوم",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amootu wa ahya",
    translation: "In Your Name, O Allah, I die and I live.",
    reference: "Sahih al-Bukhari (6324)",
    virtue: "Entrusts your soul into Allah's protection during sleep, which is the lesser death.",
    count: 1,
  },
  {
    id: "daily_aytul_kursi",
    category: "Daily Routine",
    title: "Ayat al-Kursi (The Throne Verse - Ultimate Protection)",
    arabicTitle: "آية الكرسي",
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhee yashfa'u 'indahu illa bi-idhnihi. Ya'lamu ma bayna aydeehim wa ma khalfahum, wa la yuheetoona bi-shay'im-min 'ilmihi illa bima sha'a. Wasi'a kursiyyuhus-samawati wal-arda, wa la ya'ooduhu hifzuhuma, wa Huwal-'Aliyyul-'Azeem",
    translation: "Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    reference: "Surah Al-Baqarah (2:255), Sahih al-Bukhari (2311)",
    virtue: "Reciting Ayat al-Kursi before sleep appoints a guardian angel over you and no devil can approach until morning.",
    count: 1,
  },
  {
    id: "daily_eat_before",
    category: "Daily Routine",
    title: "Before Starting a Meal",
    arabicTitle: "الدعاء قبل الأكل",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah",
    translation: "In the Name of Allah.",
    reference: "Sahih al-Bukhari (5376)",
    virtue: "Blesses the sustenance and prevents Satan from sharing the meal.",
    count: 1,
  },
  {
    id: "daily_eat_forgot",
    category: "Daily Routine",
    title: "If Forgetting Bismillah at the Start of Meal",
    arabicTitle: "إذا نسي التسمية في أول الطعام",
    arabic: "بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ",
    transliteration: "Bismillahi awwalahu wa akhirahu",
    translation: "In the Name of Allah, at its beginning and its end.",
    reference: "Sunan Abu Dawud (3767), Jami` at-Tirmidhi (1858)",
    virtue: "The Prophet (PBUH) smiled and noted that Satan is forced to vomit whatever he had shared.",
    count: 1,
  },
  {
    id: "daily_eat_after",
    category: "Daily Routine",
    title: "After Finishing a Meal",
    arabicTitle: "الدعاء بعد الفراغ من الطعام",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdu lillahil-ladhee at'amanee hadha wa razaqaneehi min ghayri hawlin minnee wa la quwwatin",
    translation: "Praise be to Allah Who has fed me this and provided it for me without any power or strength on my part.",
    reference: "Sunan Abu Dawud (4023), Jami` at-Tirmidhi (3458)",
    virtue: "Whoever recites this after eating will have all their past minor sins forgiven.",
    count: 1,
  },
  {
    id: "daily_home_leave",
    category: "Daily Routine",
    title: "Leaving the House (Total Protection)",
    arabicTitle: "دعاء الخروج من المنزل",
    arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "Bismillahi, tawakkaltu 'alallahi, wa la hawla wa la quwwata illa billah",
    translation: "In the Name of Allah, I place my trust in Allah; there is no might and no power except with Allah.",
    reference: "Sunan Abu Dawud (5095), Jami` at-Tirmidhi (3426)",
    virtue: "An angel proclaims: 'You are guided, defended, and protected', and Satan moves far away.",
    count: 1,
  },
  {
    id: "daily_home_enter",
    category: "Daily Routine",
    title: "Entering the House",
    arabicTitle: "دعاء الدخول إلى المنزل",
    arabic: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna",
    translation: "In the Name of Allah we enter, and in the Name of Allah we leave, and upon our Lord we rely.",
    reference: "Sunan Abu Dawud (5096)",
    virtue: "Prevents Satan from entering or spending the night in your home.",
    count: 1,
  },
  {
    id: "daily_toilet_enter",
    category: "Daily Routine",
    title: "Entering the Washroom / Restroom",
    arabicTitle: "دعاء دخول الخلاء",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    transliteration: "Allahumma innee a'oodhu bika minal-khubuthi wal-khaba'ith",
    translation: "O Allah, I seek refuge in You from impure male and female evil spirits.",
    reference: "Sahih al-Bukhari (142), Sahih Muslim (375)",
    virtue: "Forms a veil between the jinn and the private parts of the believer.",
    count: 1,
  },
  {
    id: "daily_toilet_leave",
    category: "Daily Routine",
    title: "Leaving the Washroom / Restroom",
    arabicTitle: "دعاء الخروج من الخلاء",
    arabic: "غُفْرَانَكَ",
    transliteration: "Ghufranaka",
    translation: "I seek Your forgiveness, O Allah.",
    reference: "Sunan Abu Dawud (30), Jami` at-Tirmidhi (7)",
    virtue: "Sunnah gratitude for relief from body impurities alongside spiritual cleansing.",
    count: 1,
  },
  {
    id: "daily_masjid_enter",
    category: "Daily Routine",
    title: "Entering the Masjid (Mosque)",
    arabicTitle: "دعاء دخول المسجد",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    transliteration: "Allahummaf-tah lee abwaba rahmatik",
    translation: "O Allah, open the gates of Your Mercy for me.",
    reference: "Sahih Muslim (713)",
    virtue: "Enter with the right foot invoking Allah's mercy inside His sacred houses.",
    count: 1,
  },
  {
    id: "daily_masjid_leave",
    category: "Daily Routine",
    title: "Exiting the Masjid (Mosque)",
    arabicTitle: "دعاء الخروج من المسجد",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    transliteration: "Allahumma innee as'aluka min fadlik",
    translation: "O Allah, I ask You of Your bounty and grace.",
    reference: "Sahih Muslim (713)",
    virtue: "Step out with the left foot seeking halal provision and blessings in the world.",
    count: 1,
  },

  // ===================== QURANIC DUAS (RABBANA) =====================
  {
    id: "quran_good_both",
    category: "Quranic Duas (Rabbana)",
    title: "Dua for Goodness in This Life & the Hereafter",
    arabicTitle: "ربنا آتنا في الدنيا حسنة",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translation: "Our Lord, give us in this world that which is good and in the Hereafter that which is good, and protect us from the punishment of the Fire.",
    reference: "Surah Al-Baqarah (2:201)",
    virtue: "The most frequent supplication made by the Prophet Muhammad (PBUH) (Sahih al-Bukhari 6389).",
    count: 1,
  },
  {
    id: "quran_guidance_heart",
    category: "Quranic Duas (Rabbana)",
    title: "Steadfastness of the Heart upon Guidance",
    arabicTitle: "ربنا لا تزغ قلوبنا",
    arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ",
    transliteration: "Rabbana la tuzigh quloobana ba'da idh hadaytana wa hab lana min ladunka rahmah, innaka Antal-Wahhab",
    translation: "Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.",
    reference: "Surah Ali 'Imran (3:8)",
    virtue: "Supplication of those firmly grounded in sacred knowledge seeking eternal faith.",
    count: 1,
  },
  {
    id: "quran_yunus",
    category: "Quranic Duas (Rabbana)",
    title: "Dua of Prophet Yunus (For Removing All Distress)",
    arabicTitle: "دعاء ذي النون (يونس عليه السلام)",
    arabic: "لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ",
    transliteration: "La ilaha illa Anta subhanaka innee kuntu minaz-zalimeen",
    translation: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
    reference: "Surah Al-Anbiya (21:87)",
    virtue: "The Prophet (PBUH) said: 'No Muslim supplicates with this in any distress except that Allah relieves him.'",
    count: 1,
  },
  {
    id: "quran_parents",
    category: "Quranic Duas (Rabbana)",
    title: "Dua for Parents (Mercy & Kindness)",
    arabicTitle: "دعاء للوالدين",
    arabic: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    transliteration: "Rabbi irhamhuma kama rabbayanee sagheera",
    translation: "My Lord, have mercy upon them as they brought me up when I was small.",
    reference: "Surah Al-Isra (17:24)",
    virtue: "A divinely commanded supplication to honor and repay the selfless love of parents.",
    count: 1,
  },
  {
    id: "quran_patience_victory",
    category: "Quranic Duas (Rabbana)",
    title: "Dua for Patience, Firm Feet & Victory",
    arabicTitle: "ربنا أفرغ علينا صبرا",
    arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    transliteration: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana wansurna 'alal-qawmil-kafireen",
    translation: "Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.",
    reference: "Surah Al-Baqarah (2:250)",
    virtue: "Supplication made by the army of Talut against Goliath seeking divine fortitude.",
    count: 1,
  },
  {
    id: "quran_musa_speech",
    category: "Quranic Duas (Rabbana)",
    title: "Dua of Prophet Musa for Ease & Eloquence",
    arabicTitle: "رب اشرح لي صدري",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي",
    transliteration: "Rabbish-rah lee sadree, wa yassir lee amree, wahlul 'uqdatam-mil-lisanee, yafqahoo qawlee",
    translation: "My Lord, expand for me my chest, and ease for me my task, and untie the knot from my tongue that they may understand my speech.",
    reference: "Surah Ta-Ha (20:25-28)",
    virtue: "Powerful supplication before public speaking, exams, interviews, and daunting challenges.",
    count: 1,
  },
  {
    id: "quran_musa_needy",
    category: "Quranic Duas (Rabbana)",
    title: "Dua for Halal Provision, Marriage & Shelter",
    arabicTitle: "دعاء موسى عليه السلام للرزق",
    arabic: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
    transliteration: "Rabbi innee lima anzalta ilayya min khayrin faqeer",
    translation: "My Lord, indeed I am, for whatever good You would send down to me, in need.",
    reference: "Surah Al-Qasas (28:24)",
    virtue: "Prophet Musa recited this in Madyan without food or home, and Allah blessed him with shelter, marriage, and provision.",
    count: 1,
  },
  {
    id: "quran_family_spouse",
    category: "Quranic Duas (Rabbana)",
    title: "Dua for Righteous Spouse & Children",
    arabicTitle: "قرّة أعين للأزواج والذرية",
    arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqeena imama",
    translation: "Our Lord, grant us from among our spouses and offspring comfort to our eyes and make us an example for the righteous.",
    reference: "Surah Al-Furqan (25:74)",
    virtue: "Supplication of the beloved Servants of the Most Merciful ('Ibadur-Rahman).",
    count: 1,
  },
  {
    id: "quran_maintain_prayer",
    category: "Quranic Duas (Rabbana)",
    title: "Dua of Prophet Ibrahim for Establishing Prayer",
    arabicTitle: "رب اجعلني مقيم الصلاة",
    arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ",
    transliteration: "Rabbij-'alnee muqeemas-salati wa min dhurriyyatee, Rabbana wa taqabbal du'a'",
    translation: "My Lord, make me an establisher of prayer, and many from my descendants. Our Lord, and accept my supplication.",
    reference: "Surah Ibrahim (14:40)",
    virtue: "Ensures steadfastness in 5 daily prayers across oneself and future generations.",
    count: 1,
  },

  // ===================== AFTER SALAH AZKAR =====================
  {
    id: "salah_istighfar",
    category: "After Salah",
    title: "Astaghfirullah & Supplication for Peace",
    arabicTitle: "الاستغفار بعد الصلاة والسلام",
    arabic: "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    transliteration: "Astaghfirullah (3x). Allahumma Antas-Salamu wa minkas-salam, tabarakta ya Dhal-Jalali wal-Ikram",
    translation: "I seek the forgiveness of Allah (3 times). O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honor.",
    reference: "Sahih Muslim (591)",
    virtue: "Recited immediately upon completing the final Tasleem of every obligatory prayer.",
    count: 3,
  },
  {
    id: "salah_tasbih_fatima",
    category: "After Salah",
    title: "Tasbih after Fard Prayer (SubhanAllah, Alhamdulillah, Allahu Akbar)",
    arabicTitle: "التسبيح والتحميد والتكبير",
    arabic: "سُبْحَانَ اللَّهِ (٣٣)، الْحَمْدُ لِلَّهِ (٣٣)، اللَّهُ أَكْبَرُ (٣٤)",
    transliteration: "SubhanAllah (33x), Alhamdulillah (33x), Allahu Akbar (34x)",
    translation: "Glory be to Allah (33 times), All praise is due to Allah (33 times), Allah is the Greatest (34 times).",
    reference: "Sahih al-Bukhari (843), Sahih Muslim (597)",
    virtue: "Whoever recites this after every prayer will have all their sins forgiven, even if as vast as the foam of the sea.",
    count: 33,
  },
  {
    id: "salah_tahlil",
    category: "After Salah",
    title: "Tahlil & Submission to Divine Decree",
    arabicTitle: "التهليل والتوحيد",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
    transliteration: "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadeer. Allahumma la mani'a lima a'tayta, wa la mu'tiya lima mana'ta, wa la yanfa'u dhal-jaddi minkal-jadd",
    translation: "None has the right to be worshipped except Allah alone, with no partner. His is the sovereignty and His is the praise, and He can do all things. O Allah, none can withhold what You give, and none can give what You withhold, and no wealth or majesty can benefit a person against You.",
    reference: "Sahih al-Bukhari (844), Sahih Muslim (593)",
    virtue: "Established practice of the Prophet (PBUH) after finishing each Fard prayer.",
    count: 1,
  },

  // ===================== ANXIETY, DEBT & DISTRESS =====================
  {
    id: "anx_worry_grief",
    category: "Anxiety & Distress",
    title: "Seeking Protection from Worry, Grief, Debt & Inability",
    arabicTitle: "الاستعاذة من الهم والحزن والديْن",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
    transliteration: "Allahumma innee a'oodhu bika minal-hammi wal-hazan, wal-'ajzi wal-kasal, wal-bukhli wal-jubn, wa dala'id-dayni wa ghalabatir-rijal",
    translation: "O Allah, I seek refuge in You from anxiety and grief, from incapacity and laziness, from stinginess and cowardice, from the burden of debt and being overpowered by people.",
    reference: "Sahih al-Bukhari (2893)",
    virtue: "Anas (RA) reported that the Prophet (PBUH) made this supplication constantly.",
    count: 1,
  },
  {
    id: "anx_ya_hayyu",
    category: "Anxiety & Distress",
    title: "Supplication in Extreme Difficulty (Ya Hayyu Ya Qayyum)",
    arabicTitle: "يا حي يا قيوم برحمتك أستغيث",
    arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Ya Hayyu Ya Qayyoomu birahmatika astagheeth, aslih lee sha'nee kullahu, wa la takilnee ila nafsee tarfata 'ayn",
    translation: "O Ever-Living, O Sustainer, in Your mercy I seek relief. Rectify for me all of my affairs, and do not leave me to myself even for the blink of an eye.",
    reference: "Sunan an-Nasa'i (Al-Kubra 10405), Al-Hakim (1/545)",
    virtue: "The greatest names of Allah (Al-Hayy, Al-Qayyum) through which prayers are directly answered.",
    count: 1,
  },
  {
    id: "anx_hasbunallah",
    category: "Anxiety & Distress",
    title: "Hasbunallahu wa Ni'mal Wakeel (Ultimate Trust)",
    arabicTitle: "حسبنا الله ونعم الوكيل",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal-wakeel",
    translation: "Allah is sufficient for us, and He is the best Disposer of affairs.",
    reference: "Surah Ali 'Imran (3:173), Sahih al-Bukhari (4563)",
    virtue: "Recited by Prophet Ibrahim when thrown into the fire, and by Prophet Muhammad (PBUH) when threatened by massive armies.",
    count: 7,
  },
  {
    id: "anx_calamity",
    category: "Anxiety & Distress",
    title: "When Stricken by Loss, Affliction or Bad News",
    arabicTitle: "دعاء المصيبة وإنا لله",
    arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا",
    transliteration: "Inna lillahi wa inna ilayhi raji'oon, Allahumma-jurnee fee museebatee wa akhlif lee khayran minha",
    translation: "Indeed to Allah we belong and to Him we shall return. O Allah, reward me for my affliction and replace it with something better for me.",
    reference: "Sahih Muslim (918)",
    virtue: "Whoever says this in affliction, Allah guarantees to grant them something far superior.",
    count: 1,
  },

  // ===================== SHIFA & HEALTH =====================
  {
    id: "shifa_body_pain",
    category: "Shifa & Health",
    title: "Placing Hand on Pain in the Body (Bismillah & Refuge)",
    arabicTitle: "دعاء الألم ووجع الجسد",
    arabic: "بِسْمِ اللَّهِ (ثَلَاثًا)\nأَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ (سَبْعًا)",
    transliteration: "Bismillah (3x). A'oodhu billahi wa qudratihi min sharri ma ajidu wa uhadhir (7x)",
    translation: "In the Name of Allah (3 times). I seek refuge in Allah and His Power from the evil of what I feel and fear (7 times).",
    reference: "Sahih Muslim (2202)",
    virtue: "Place your right hand where it hurts on your body and recite as instructed by the Prophet (PBUH).",
    count: 7,
  },
  {
    id: "shifa_cure_sick",
    category: "Shifa & Health",
    title: "Dua for Healing the Sick (Lord of Mankind)",
    arabicTitle: "دعاء شفاء المريض",
    arabic: "اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَاسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا",
    transliteration: "Allahumma Rabban-nasi, adh-hibil-ba'sa, ishfihi wa Antash-Shafee, la shifa'a illa shifa'uka, shifa'an la yughadiru saqama",
    translation: "O Allah, Lord of mankind, remove the disease and bring about recovery. You are the Healer, there is no healing except Yours, a healing that leaves behind no ailment.",
    reference: "Sahih al-Bukhari (5743), Sahih Muslim (2191)",
    virtue: "The Prophet (PBUH) wiped his right hand over the sick person while reciting this prayer.",
    count: 1,
  },
  {
    id: "shifa_visiting_sick",
    category: "Shifa & Health",
    title: "Visiting the Sick (Purification Insha'Allah)",
    arabicTitle: "عيادة المريض طهور إن شاء الله",
    arabic: "لَا بَأْسَ، طَهُورٌ إِنْ شَاءَ اللَّهُ",
    transliteration: "La ba'sa, tahoorun in sha' Allah",
    translation: "No harm, it is a purification, if Allah wills.",
    reference: "Sahih al-Bukhari (3616)",
    virtue: "The Sunnah greeting of reassurance and hope whenever visiting anyone who is ill.",
    count: 1,
  },

  // ===================== FORGIVENESS & TAWBAH =====================
  {
    id: "ist_astaghfirullah",
    category: "Forgiveness & Tawbah",
    title: "Regular Istighfar & Repentance to Allah",
    arabicTitle: "الاستغفار اليومي",
    arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ، وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullahal-'Azeemal-ladhee la ilaha illa Huwal-Hayyul-Qayyoomu wa atoobu ilayh",
    translation: "I seek forgiveness from Allah the Almighty, besides Whom there is no deity, the Ever-Living, the Sustainer, and I repent unto Him.",
    reference: "Sunan Abu Dawud (1517), Jami` at-Tirmidhi (3577)",
    virtue: "Whoever says this, his sins are forgiven even if he had fled from the battlefield.",
    count: 3,
  },
  {
    id: "ist_prophet_istighfar",
    category: "Forgiveness & Tawbah",
    title: "Frequent Istighfar in Gatherings",
    arabicTitle: "رب اغفر لي وتب علي",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ، إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    transliteration: "Rabbigh-fir lee wa tub 'alayya, innaka Antat-Tawwabur-Raheem",
    translation: "My Lord, forgive me and accept my repentance, indeed You are the Ever-Relenting, the Most Merciful.",
    reference: "Sunan Abu Dawud (1516), Jami` at-Tirmidhi (3434)",
    virtue: "Ibn Umar (RA) reported: We used to count the Messenger of Allah (PBUH) saying this 100 times in a single gathering.",
    count: 100,
  },

  // ===================== TRAVEL & JOURNEY =====================
  {
    id: "travel_vehicle",
    category: "Travel & Journey",
    title: "Boarding a Vehicle, Car, Plane or Train",
    arabicTitle: "دعاء ركوب الدابة والسيارة",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ",
    transliteration: "Subhanal-ladhee sakh-khara lana hadha wa ma kunna lahu muqrineen, wa inna ila Rabbina lamunqaliboon",
    translation: "Glory be to Him Who has subjected this to us, though we could not have subdued it ourselves, and indeed, unto our Lord we shall return.",
    reference: "Surah Az-Zukhruf (43:13-14), Sahih Muslim (1342)",
    virtue: "Guarantees safety and remembrance of the ultimate return to Allah during travel.",
    count: 1,
  },
  {
    id: "travel_full_journey",
    category: "Travel & Journey",
    title: "Comprehensive Dua for the Traveler",
    arabicTitle: "دعاء السفر الكامل",
    arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَٰذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَٰذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
    transliteration: "Allahumma inna nas'aluka fee safarina hadhal-birra wat-taqwa, wa minal-'amali ma tarda. Allahumma hawwin 'alayna safarana hadha watwi 'anna bu'dah. Allahumma Antas-Sahibu fis-safari wal-Khaleefatu fil-ahl",
    translation: "O Allah, we ask You in this journey of ours for righteousness and piety, and for deeds that please You. O Allah, ease this journey for us and shorten its distance. O Allah, You are the Companion on the journey and the Protector of the family.",
    reference: "Sahih Muslim (1342)",
    virtue: "Places the traveler and their loved ones left behind under Allah's divine guardianship.",
    count: 1,
  },

  // ===================== HOME & FAMILY =====================
  {
    id: "fam_children_protection",
    category: "Home & Family",
    title: "Protection of Children from Evil Eye & Devils",
    arabicTitle: "تعويذ الأولاد من العين والشيطان",
    arabic: "أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
    transliteration: "U'eedhukuma bi-kalimatil-lahit-tammati min kulli shaytanin wa hammah, wa min kulli 'aynin lammah",
    translation: "I seek refuge for you both in the perfect words of Allah from every devil and poisonous creature and from every evil eye.",
    reference: "Sahih al-Bukhari (3371)",
    virtue: "The Prophet (PBUH) recited this to protect his grandchildren Al-Hasan and Al-Husayn.",
    count: 1,
  },
  {
    id: "fam_new_clothes",
    category: "Home & Family",
    title: "Wearing New Clothes or Shoes",
    arabicTitle: "دعاء لبس الثوب الجديد",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَٰذَا الثَّوْبَ وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdu lillahil-ladhee kasanee hadhath-thawba wa razaqaneehi min ghayri hawlin minnee wa la quwwah",
    translation: "All praise is due to Allah Who has clothed me with this garment and provided it for me without any power or might on my part.",
    reference: "Sunan Abu Dawud (4023)",
    virtue: "Expresses humility and gratitude for clothing, resulting in forgiveness of sins.",
    count: 1,
  },

  // ===================== HAJJ & UMRAH =====================
  {
    id: "hajj_talbiyah",
    category: "Hajj & Umrah",
    title: "The Talbiyah (Here I am at Your Service, O Allah)",
    arabicTitle: "التلبية في الحج والعمرة",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
    transliteration: "Labbayk Allahumma labbayk, labbayka la shareeka laka labbayk. Innal-hamda wan-ni'mata laka wal-mulk, la shareeka lak",
    translation: "Here I am at Your service, O Allah, here I am! Here I am, You have no partner, here I am! Verily all praise, blessings, and sovereignty belong to You. You have no partner!",
    reference: "Sahih al-Bukhari (1549), Sahih Muslim (1184)",
    virtue: "The sacred anthem of the pilgrim resounding throughout the plains of Makkah and Arafah.",
    count: 1,
  },
  {
    id: "hajj_tawaf_corners",
    category: "Hajj & Umrah",
    title: "Between the Yemeni Corner and the Black Stone (Kaaba)",
    arabicTitle: "الدعاء بين الركن اليماني والحجر الأسود",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translation: "Our Lord, give us in this world that which is good and in the Hereafter that which is good, and protect us from the torment of the Fire.",
    reference: "Sunan Abu Dawud (1892)",
    virtue: "Recited during every circuit of Tawaf between the Yemeni Corner (Rukn Yamani) and the Black Stone.",
    count: 1,
  },
];

// ============================================================================
// DUA RECITATION TRACKING & LOCAL CACHE
// ============================================================================

export const DUA_TRACKING_KEYS = {
  CURRENT_COUNTERS: "@dua_current_counter_state",
  TOTAL_RECITATIONS: "@dua_recited_total_count",
  MONTHLY_RECITATIONS_PREFIX: "@dua_recited_month_", // e.g. @dua_recited_month_2026-10
  DUA_BREAKDOWN_PREFIX: "@dua_counts_breakdown", // map of duaId -> number
};

export async function loadDuaCounters(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(DUA_TRACKING_KEYS.CURRENT_COUNTERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveDuaCounters(counters: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(DUA_TRACKING_KEYS.CURRENT_COUNTERS, JSON.stringify(counters));
  } catch (err) {
    console.error("[Dua Tracking] Failed to save counters:", err);
  }
}

export async function incrementDuaRecitation(duaId: string, monthKey?: string): Promise<void> {
  try {
    const mKey = monthKey || new Date().toISOString().substring(0, 7); // YYYY-MM
    // 1. Total lifetime recitations
    const totalRaw = await AsyncStorage.getItem(DUA_TRACKING_KEYS.TOTAL_RECITATIONS);
    const total = totalRaw ? parseInt(totalRaw, 10) || 0 : 0;
    await AsyncStorage.setItem(DUA_TRACKING_KEYS.TOTAL_RECITATIONS, (total + 1).toString());

    // 2. Month recitations
    const monthKeyFull = `${DUA_TRACKING_KEYS.MONTHLY_RECITATIONS_PREFIX}${mKey}`;
    const monthRaw = await AsyncStorage.getItem(monthKeyFull);
    const monthTotal = monthRaw ? parseInt(monthRaw, 10) || 0 : 0;
    await AsyncStorage.setItem(monthKeyFull, (monthTotal + 1).toString());

    // 3. Breakdown per duaId
    const breakdownRaw = await AsyncStorage.getItem(DUA_TRACKING_KEYS.DUA_BREAKDOWN_PREFIX);
    const breakdown: Record<string, number> = breakdownRaw ? JSON.parse(breakdownRaw) : {};
    breakdown[duaId] = (breakdown[duaId] || 0) + 1;
    await AsyncStorage.setItem(DUA_TRACKING_KEYS.DUA_BREAKDOWN_PREFIX, JSON.stringify(breakdown));
  } catch (err) {
    console.error("[Dua Tracking] Failed to increment recitation:", err);
  }
}

export async function getDuaRecitationsMonth(monthKey?: string): Promise<number> {
  try {
    const mKey = monthKey || new Date().toISOString().substring(0, 7);
    const monthKeyFull = `${DUA_TRACKING_KEYS.MONTHLY_RECITATIONS_PREFIX}${mKey}`;
    const monthRaw = await AsyncStorage.getItem(monthKeyFull);
    return monthRaw ? parseInt(monthRaw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function getDuaRecitationsTotal(): Promise<number> {
  try {
    const totalRaw = await AsyncStorage.getItem(DUA_TRACKING_KEYS.TOTAL_RECITATIONS);
    return totalRaw ? parseInt(totalRaw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

