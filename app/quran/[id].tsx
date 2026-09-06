import AudioPlayerControls from '@/components/quran/AudioPlayerControls';
import AyahItem from '@/components/quran/AyahItem';
import { CalligraphySettingsModal } from '@/components/quran/CalligraphySettingsModal';
import Colors from '@/constants/colors';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { fetchQuranPage, getAudioUrl, stripBismillahIfPresent, SurahDetail } from '@/lib/quran/api';
import { SURA_START_PAGES } from '@/lib/quran/constants';
import { useQuran } from '@/lib/quran/context';
import { addBookmark, removeBookmark } from '@/lib/quran/db';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Play,
  Search,
  Type,
  X
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SurahDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [verseSearch, setVerseSearch] = useState('');
  const [showCalligraphyModal, setShowCalligraphyModal] = useState(false);
  const { bookmarks, preferences, updatePreferences } = useQuran();
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
      setLoading(false);

      // Background fetch remaining pages of the Surah
      if (endPage > startPage) {
        let accumulatedAyahs = [...initialSurah.ayahs];
        for (let p = startPage + 1; p <= endPage; p++) {
          try {
            const pageData = await fetchQuranPage(p, preferences.translationLanguage);
            if (!isMounted) return;
            const pageAyahs = pageData.ayahs.filter(a => a.surah.number === surahNum);
            const formatted = pageAyahs.map(a => ({
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

            accumulatedAyahs = [...accumulatedAyahs, ...formatted];
            setSurah(prev => prev ? { ...prev, ayahs: accumulatedAyahs } : prev);
          } catch (pageErr) {
            console.error(`Error loading page ${p} for Surah ${surahNum}:`, pageErr);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load surah detail:', error);
      setLoading(false);
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
        translation: ayah.translation || '',
      });
    }
  };

  const handlePlayAyah = (ayah: any) => {
    const url = getAudioUrl(Number(id), ayah.number);
    if (isPlaying && currentUrl === url) {
      togglePlayback();
    } else {
      playAudio(url);
    }
  };

  const filteredAyahs = useMemo(() => {
    if (!surah?.ayahs) return [];
    if (!verseSearch.trim()) return surah.ayahs;
    const targetNum = parseInt(verseSearch.trim(), 10);
    if (isNaN(targetNum)) return surah.ayahs;
    return surah.ayahs.filter(a => a.numberInSurah === targetNum);
  }, [surah, verseSearch]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B497D" />
      </View>
    );
  }

  const mapping = SURA_START_PAGES.find(s => s.number === Number(id));

  const cycleFontSize = () => {
    const sizes = [18, 22, 26, 30];
    const currentIndex = sizes.indexOf(preferences.fontSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    updatePreferences({ fontSize: nextSize });
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Top Controls Header Bar (Reference Photo 1) */}
      <View style={styles.topControlHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>

        {/* Center Pill Mode Switcher: Mushaf vs Translation */}
        <View style={styles.modeSwitchPill}>
          <TouchableOpacity
            style={styles.modePillBtn}
            onPress={() => router.push(`/quran/mushaf?page=${mapping?.startPage || 1}`)}
          >
            <Text style={styles.modePillBtnText}>Mushaf</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePillBtn, styles.modePillBtnActive]}>
            <Text style={styles.modePillBtnTextActive}>Translation</Text>
          </TouchableOpacity>
        </View>

        {/* Right Icon Tools */}
        <View style={styles.toolIconGroup}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCalligraphyModal(true)}>
            <Type size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (surah?.ayahs?.[0]) handlePlayAyah(surah.ayahs[0]);
            }}
          >
            <Play size={18} color={Colors.primary} fill={isPlaying ? Colors.primary : "transparent"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar (Search verse number) */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search verse number (1-${surah?.numberOfAyahs || 200})`}
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={verseSearch}
            onChangeText={setVerseSearch}
          />
          {verseSearch ? (
            <TouchableOpacity onPress={() => setVerseSearch('')}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
          ref={listRef}
          data={filteredAyahs}
          keyExtractor={(item) => item.number.toString()}
          ListHeaderComponent={() => (
            <View style={styles.surahBannerCard}>
              {/* Calligraphic Surah Name */}
              <Text style={styles.bannerArabicTitle}>{surah?.name}</Text>
            </View>
          )}
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
              showTransliteration={preferences.showTransliteration}
              scriptFont={preferences.scriptFont}
              lineSpacing={preferences.lineSpacing}
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

      <CalligraphySettingsModal
        visible={showCalligraphyModal}
        onClose={() => setShowCalligraphyModal(false)}
      />
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
  topControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  iconBtn: {
    padding: 6,
  },
  modeSwitchPill: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    padding: 3,
  },
  modePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  modePillBtnActive: {
    backgroundColor: Colors.surface,
  },
  modePillBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modePillBtnTextActive: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  toolIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  surahBannerCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bannerHeaderRow: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  mosqueIcon: {
    fontSize: 18,
  },
  bannerArabicTitle: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 32,
    color: Colors.primary,
    marginBottom: 12,
  },
  bismillahText: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 22,
    color: Colors.primary,
    textAlign: 'center',
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
