import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fetchQuranPage, MushafAyah, MushafPage, getAudioUrl } from '@/lib/quran/api';
import { addBookmark, removeBookmark } from '@/lib/quran/db';
import { useQuran } from '@/lib/quran/context';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import AyahBottomSheet from '@/components/quran/AyahBottomSheet';
import { useLanguage } from '@/lib/language-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function MushafScreen() {
  const insets = useSafeAreaInsets();
  const { page } = useLocalSearchParams();
  const initialPage = page ? parseInt(page as string, 10) : 1;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAyah, setSelectedAyah] = useState<MushafAyah | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState<boolean>(false);

  const { preferences, bookmarks, pageBookmarks, togglePageBookmark, updateLastReadPage, refreshBookmarks } = useQuran();
  const { playAudio, isPlaying, togglePlayback, currentUrl } = useAudioPlayer();
  const { language } = useLanguage();

  // Gesture Ref for Horizontal Swipes
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadPage();
    // Auto-update reading progress in background
    updateLastReadPage(currentPage);
  }, [currentPage]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const data = await fetchQuranPage(currentPage, preferences.translationLanguage);
      setPageData(data);
    } catch (error) {
      console.error("Failed to load page:", error);
      Alert.alert("Error", "Failed to fetch Quran page. Make sure you are online.");
    } finally {
      setLoading(false);
    }
  };

  // Determine active Surahs on this page to show in the header
  const getPageHeaderInfo = () => {
    if (!pageData || pageData.ayahs.length === 0) return { surahNames: 'Quran', juz: 1 };

    const uniqueSurahs = Array.from(new Set(pageData.ayahs.map(a => a.surah.englishName)));
    const surahNames = uniqueSurahs.join(' & ');
    const juz = pageData.ayahs[0].juz;

    return { surahNames, juz };
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= 604) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPage(newPage);
      setSelectedAyah(null);
    }
  };

  // horizontal Swipe Detection (Arabic is RTL, so swipes are reversed!)
  // Left Swipe -> Move to Next Page (page + 1)
  // Right Swipe -> Move to Previous Page (page - 1)
  const handleTouchStart = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY };
  };

  const handleTouchEnd = (e: any) => {
    if (!touchStartRef.current) return;

    const { pageX, pageY } = e.nativeEvent;
    const diffX = pageX - touchStartRef.current.x;
    const diffY = pageY - touchStartRef.current.y;

    // Ignore minor vertical movements, focus on distinct horizontal swipes
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 100) {
      if (diffX > 0) {
        // Swipe Right: Page decreases (previous page)
        handlePageChange(currentPage - 1);
      } else {
        // Swipe Left: Page increases (next page)
        handlePageChange(currentPage + 1);
      }
    }

    touchStartRef.current = null;
  };

  const handleAyahTap = (ayah: MushafAyah) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAyah(ayah);
    setBottomSheetVisible(true);
  };

  const handlePageBookmarkToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePageBookmark(currentPage);
  };

  const showJumpPageAlert = () => {
    Alert.prompt(
      "Jump to Page",
      "Enter a page number from 1 to 604:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Go",
          onPress: (val?: string) => {
            const num = parseInt(val || '', 10);
            if (num >= 1 && num <= 604) {
              handlePageChange(num);
            } else {
              Alert.alert("Invalid Page", "Please enter a number between 1 and 604.");
            }
          }
        }
      ],
      "plain-text",
      ""
    );
  };

  const isAyahBookmarked = (ayah: MushafAyah) => {
    return bookmarks.some(b => b.surahNumber === ayah.surah.number && b.ayahNumber === ayah.numberInSurah);
  };

  const handleAyahBookmarkToggle = async () => {
    if (!selectedAyah) return;
    const isBookmarked = isAyahBookmarked(selectedAyah);

    if (isBookmarked) {
      await removeBookmark(selectedAyah.surah.number, selectedAyah.numberInSurah);
    } else {
      await addBookmark({
        surahNumber: selectedAyah.surah.number,
        ayahNumber: selectedAyah.numberInSurah,
        surahName: selectedAyah.surah.englishName,
        text: selectedAyah.text,
        translation: selectedAyah.translation || ''
      });
    }
    refreshBookmarks();
  };

  const handleAyahPlay = () => {
    if (!selectedAyah) return;
    const url = getAudioUrl(selectedAyah.surah.number, selectedAyah.number);
    playAudio(url);
  };

  const isSelectedAyahPlaying = () => {
    if (!selectedAyah) return false;
    const url = getAudioUrl(selectedAyah.surah.number, selectedAyah.number);
    return isPlaying && currentUrl === url;
  };

  const renderSurahBanner = (ayah: MushafAyah) => {
    return (
      <View style={styles.surahBannerContainer} key={`banner_${ayah.surah.number}`}>
        <View style={styles.bannerBorderLine} />
        <View style={styles.surahBannerCard}>
          <Text style={styles.bannerArabicTitle}>سُورَةُ {ayah.surah.name}</Text>
          <Text style={styles.bannerSubtitle}>
            {ayah.surah.englishName}  •  {ayah.surah.revelationType}  •  {ayah.surah.numberOfAyahs} Ayat
          </Text>
        </View>
        <View style={styles.bannerBorderLine} />
      </View>
    );
  };

  const { surahNames, juz } = getPageHeaderInfo();
  const isPageBookmarked = pageBookmarks.includes(currentPage);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Top Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfoContainer}>
          <Text style={styles.headerSurah} numberOfLines={1}>{surahNames}</Text>
          <Text style={styles.headerJuz}>Parah {juz}  •  Page {currentPage}</Text>
        </View>

        <View style={styles.rightHeaderActions}>
          <TouchableOpacity onPress={handlePageBookmarkToggle} style={styles.iconButton}>
            <Ionicons
              name={isPageBookmarked ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isPageBookmarked ? Colors.accent : Colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={showJumpPageAlert} style={styles.iconButton}>
            <Ionicons name="compass-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Swipable Book Canvas */}
      <View
        style={styles.bookCanvas}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loaderText}>Loading page {currentPage}...</Text>
          </View>
        ) : (
          <View style={styles.mushafPaper}>
            <View style={styles.decorativeFrame}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.quranContent}
              >
                {(() => {
                  if (!pageData || pageData.ayahs.length === 0) return null;

                  const uniqueSurahNumbers = Array.from(new Set(pageData.ayahs.map(a => a.surah.number)));

                  return uniqueSurahNumbers.map((surahNumber) => {
                    const surahAyahs = pageData.ayahs.filter(a => a.surah.number === surahNumber);
                    const firstAyah = surahAyahs[0];
                    const renderHeader = firstAyah.numberInSurah === 1;

                    return (
                      <View key={`surah_group_${surahNumber}`} style={styles.surahGroup}>
                        {renderHeader && renderSurahBanner(firstAyah)}
                        <Text style={styles.arabicParagraph}>
                          {surahAyahs.map((item) => (
                            <Text
                              key={item.number}
                              onPress={() => handleAyahTap(item)}
                              style={[
                                styles.ayahTextSegment,
                                selectedAyah?.number === item.number && styles.highlightedAyahText
                              ]}
                            >
                              {item.text}
                              <Text style={styles.ayahBadge}> ﴿{item.numberInSurah}﴾ </Text>
                            </Text>
                          ))}
                        </Text>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* Dynamic Swiper Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
        <TouchableOpacity
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={[styles.pageNavBtn, currentPage <= 1 && styles.disabledNavBtn]}
        >
          <Ionicons name="chevron-back" size={24} color={currentPage <= 1 ? Colors.textMuted : Colors.primary} />
          <Text style={[styles.navBtnText, currentPage <= 1 && styles.disabledBtnText]}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showJumpPageAlert} style={styles.pageIndicatorContainer}>
          <Text style={styles.pageIndicatorTitle}>PAGE</Text>
          <Text style={styles.pageIndicatorNumber}>{currentPage} / 604</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= 604}
          style={[styles.pageNavBtn, currentPage >= 604 && styles.disabledNavBtn]}
        >
          <Text style={[styles.navBtnText, currentPage >= 604 && styles.disabledBtnText]}>Next</Text>
          <Ionicons name="chevron-forward" size={24} color={currentPage >= 604 ? Colors.textMuted : Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tafseer & Actions Sheet */}
      <AyahBottomSheet
        visible={bottomSheetVisible}
        onClose={() => {
          setBottomSheetVisible(false);
          setSelectedAyah(null);
        }}
        ayah={selectedAyah}
        isBookmarked={selectedAyah ? isAyahBookmarked(selectedAyah) : false}
        onBookmarkToggle={handleAyahBookmarkToggle}
        onPlay={handleAyahPlay}
        isPlaying={isSelectedAyahPlaying()}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  headerInfoContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerSurah: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  headerJuz: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: Colors.primary,
    marginTop: 1,
  },
  rightHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookCanvas: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  mushafPaper: {
    flex: 1,
    backgroundColor: '#FAFBF6', // Warm off-white paper texture
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E8DF',
    overflow: 'hidden',
  },
  decorativeFrame: {
    flex: 1,
    margin: 6,
    borderWidth: 2,
    borderColor: '#D4A843', // Elegant Gold frame border
    borderRadius: 14,
    padding: 8,
  },
  quranContent: {
    paddingBottom: 20,
  },
  surahBannerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
  },
  bannerBorderLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#D4A843',
  },
  surahBannerCard: {
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#D4A843',
  },
  bannerArabicTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  arabicParagraph: {
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 58, // Standard height to resemble 15-line layout
    marginVertical: 6,
  },
  ayahTextSegment: {
    fontSize: 26,
    color: Colors.text,
    lineHeight: 58,
  },
  surahGroup: {
    width: '100%',
    marginBottom: 8,
  },
  highlightedAyahText: {
    backgroundColor: 'rgba(212, 168, 67, 0.25)', // Elegant soft golden overlay highlight
    borderRadius: 6,
  },
  ayahBadge: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  disabledNavBtn: {
    opacity: 0.4,
  },
  navBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  disabledBtnText: {
    color: Colors.textMuted,
  },
  pageIndicatorContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pageIndicatorTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  pageIndicatorNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.primary,
    marginTop: 1,
  },
});
