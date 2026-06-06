import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fetchSurahDetail, SurahDetail, getAudioUrl, fetchQuranPage } from '@/lib/quran/api';
import { SURA_START_PAGES } from '@/lib/quran/constants';
import { addBookmark, removeBookmark, updateRecentRead } from '@/lib/quran/db';
import { useQuran } from '@/lib/quran/context';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import AyahItem from '@/components/quran/AyahItem';
import AudioPlayerControls from '@/components/quran/AudioPlayerControls';

const { width } = Dimensions.get('window');

export default function SurahDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bgLoading, setBgLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { bookmarks, refreshBookmarks, preferences } = useQuran();
  const { playAudio, isPlaying, togglePlayback, isLoading: audioLoading, currentUrl } = useAudioPlayer();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;
    if (id) loadDetail(isMounted);
    return () => {
      isMounted = false;
    };
  }, [id]);

  const loadDetail = async (isMounted: boolean) => {
    try {
      setLoading(true);
      const surahNum = Number(id);

      const surahIndex = SURA_START_PAGES.findIndex(s => s.number === surahNum);
      if (surahIndex === -1) {
        throw new Error(`Surah ${surahNum} mapping not found.`);
      }

      const mapping = SURA_START_PAGES[surahIndex];
      const startPage = mapping.startPage;
      const nextStartPage = surahIndex < SURA_START_PAGES.length - 1 
        ? SURA_START_PAGES[surahIndex + 1].startPage 
        : 605;
      const endPage = Math.max(startPage, nextStartPage - 1);
      
      const pageCount = endPage - startPage + 1;
      if (isMounted) {
        setTotalPages(pageCount);
        setLoadedPages(1);
      }

      // Fetch first page immediately for instant display
      const firstPageData = await fetchQuranPage(startPage, preferences.translationLanguage);
      if (!isMounted) return;

      const firstPageAyahs = firstPageData.ayahs.filter(a => a.surah.number === surahNum);

      const initialSurah: SurahDetail = {
        number: mapping.number,
        name: mapping.name,
        englishName: mapping.englishName,
        englishNameTranslation: mapping.englishName,
        numberOfAyahs: firstPageAyahs[0]?.surah.numberOfAyahs || 0,
        revelationType: firstPageAyahs[0]?.surah.revelationType || "",
        ayahs: firstPageAyahs.map(a => ({
          number: a.number,
          text: a.text,
          numberInSurah: a.numberInSurah,
          juz: a.juz,
          page: a.page,
          translation: a.translation || '',
          audio: getAudioUrl(mapping.number, a.number),
          audioSecondary: [],
          manzil: 0,
          ruku: 0,
          hizbQuarter: 0,
          sajda: false
        }))
      };

      setSurah(initialSurah);
      setLoading(false); // Disable spinner so user can start reading immediately

      // Update recent read in database
      await updateRecentRead({
        surahNumber: initialSurah.number,
        ayahNumber: 1,
        surahName: initialSurah.englishName
      });

      // Stream the remaining pages in the background
      if (pageCount > 1) {
        if (isMounted) setBgLoading(true);

        let accumulatedAyahs = [...initialSurah.ayahs];

        for (let p = startPage + 1; p <= endPage; p++) {
          try {
            const pageData = await fetchQuranPage(p, preferences.translationLanguage);
            if (!isMounted) return;

            const pageAyahs = pageData.ayahs.filter(a => a.surah.number === surahNum);
            if (pageAyahs.length > 0) {
              const mapped = pageAyahs.map(a => ({
                number: a.number,
                text: a.text,
                numberInSurah: a.numberInSurah,
                juz: a.juz,
                page: a.page,
                translation: a.translation || '',
                audio: getAudioUrl(mapping.number, a.number),
                audioSecondary: [],
                manzil: 0,
                ruku: 0,
                hizbQuarter: 0,
                sajda: false
              }));

              accumulatedAyahs = [...accumulatedAyahs, ...mapped];
              setSurah(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  ayahs: accumulatedAyahs
                };
              });
            }

            if (isMounted) {
              setLoadedPages(p - startPage + 1);
            }
          } catch (pageErr) {
            console.error(`Error loading background page ${p} for Surah ${surahNum}:`, pageErr);
          }
        }

        if (isMounted) setBgLoading(false);
      }
    } catch (error) {
      console.error('Failed to load surah detail:', error);
      if (isMounted) setLoading(false);
    }
  };

  const isAyahBookmarked = (ayahNumber: number) => {
    return bookmarks.some(b => b.surahNumber === Number(id) && b.ayahNumber === ayahNumber);
  };

  const handleBookmark = async (ayah: any) => {
    if (isAyahBookmarked(ayah.numberInSurah)) {
      await removeBookmark(Number(id), ayah.numberInSurah);
    } else {
      await addBookmark({
        surahNumber: Number(id),
        ayahNumber: ayah.numberInSurah,
        surahName: surah?.englishName || '',
        text: ayah.text,
        translation: ayah.translation
      });
    }
    refreshBookmarks();
  };

  const handlePlayAyah = (ayah: any) => {
    const url = getAudioUrl(Number(id), ayah.number);
    if (isPlaying && currentUrl === url) {
      togglePlayback();
    } else {
      playAudio(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{surah?.englishName}</Text>
          {bgLoading ? (
            <Text style={[styles.headerSubtitle, { color: Colors.accent, fontFamily: 'Poppins_600SemiBold' }]}>
              Downloading... {Math.round((loadedPages / totalPages) * 100)}%
            </Text>
          ) : (
            <Text style={styles.headerSubtitle}>{surah?.name}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <FlatList
          ref={listRef}
          data={surah?.ayahs}
          keyExtractor={(item) => item.number.toString()}
          renderItem={({ item }) => (
            <AyahItem 
              ayah={item}
              surahName={surah?.englishName || ''}
              isBookmarked={isAyahBookmarked(item.numberInSurah)}
              onBookmark={() => handleBookmark(item)}
              onPlay={() => handlePlayAyah(item)}
              isPlaying={isPlaying && currentUrl === getAudioUrl(Number(id), item.number)}
              fontSize={preferences.fontSize}
              showTranslation={preferences.showTranslation}
            />
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
        />

        <AudioPlayerControls 
          isPlaying={isPlaying}
          onToggle={togglePlayback}
          isLoading={audioLoading}
          title={surah?.englishName}
          subtitle="Mishary Rashid Alafasy"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
  settingsButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
