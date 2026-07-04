import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Pressable
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
import { SURA_START_PAGES, PARAH_LIST } from '@/lib/quran/constants';

const { width } = Dimensions.get('window');
const PAGES_ARRAY = Array.from({ length: 604 }, (_, i) => i + 1);

// Helper functions for header lookup
const getSurahForPage = (page: number) => {
  let activeSurah = SURA_START_PAGES[0];
  for (const s of SURA_START_PAGES) {
    if (s.startPage <= page) {
      activeSurah = s;
    } else {
      break;
    }
  }
  return activeSurah;
};

const getCurrentParah = (page: number) => {
  let activeParah = PARAH_LIST[0];
  for (const p of PARAH_LIST) {
    if (p.startPage <= page) {
      activeParah = p;
    } else {
      break;
    }
  }
  return activeParah;
};

const toArabicDigits = (num: number) => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(digit => arabicDigits[parseInt(digit)]).join('');
};

// Memoized Page Item component
const MushafPageItem = React.memo(({
  pageNumber,
  translationLanguage,
  onAyahTap,
  selectedAyah,
  fontSize,
  onPagePress
}: {
  pageNumber: number;
  translationLanguage: string;
  onAyahTap: (ayah: MushafAyah) => void;
  selectedAyah: MushafAyah | null;
  fontSize: number;
  onPagePress: () => void;
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const [nextPageData, setNextPageData] = useState<MushafPage | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPageData = async () => {
      try {
        setLoading(true);
        const data = await fetchQuranPage(pageNumber, translationLanguage);
        if (isMounted) {
          setPageData(data);
        }
      } catch (error) {
        console.error("Failed to load page " + pageNumber, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadPageData();
    return () => {
      isMounted = false;
    };
  }, [pageNumber, translationLanguage]);

  useEffect(() => {
    let isMounted = true;
    if (pageNumber < 604) {
      fetchQuranPage(pageNumber + 1, translationLanguage)
        .then(data => {
          if (isMounted) {
            setNextPageData(data);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [pageNumber, translationLanguage]);

  if (loading) {
    return (
      <View style={styles.pageItemContainer}>
        <View style={styles.mushafPaper}>
          <View style={styles.singleBorderFrame}>
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loaderText}>Loading page {pageNumber}...</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!pageData || pageData.ayahs.length === 0) {
    const isError = pageData && 'error' in pageData && (pageData as any).error;
    return (
      <View style={styles.pageItemContainer}>
        <View style={styles.mushafPaper}>
          <View style={styles.singleBorderFrame}>
            <View style={styles.loaderContainer}>
              {isError ? (
                <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 12 }} />
              ) : (
                <Ionicons name="book-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 12 }} />
              )}
              <Text style={styles.loaderText}>
                {isError 
                  ? "Failed to load page.\nPlease check your internet connection." 
                  : `Page ${pageNumber} is empty`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const uniqueSurahNumbers = Array.from(new Set(pageData.ayahs.map(a => a.surah.number)));

  return (
    <View style={styles.pageItemContainer}>
      <Pressable onPress={onPagePress} style={styles.mushafPaper}>
        <View style={styles.singleBorderFrame}>
          {/* Calligraphic Page Header inside paper border */}
          <View style={styles.innerPageHeader}>
            <Text style={styles.innerPageHeaderArabicText} numberOfLines={1}>
              {uniqueSurahNumbers.length > 0 
                ? pageData.ayahs.find(a => a.surah.number === uniqueSurahNumbers[0])?.surah.name 
                : ''}
            </Text>
            <Text style={styles.innerPageHeaderNumberText}>
              {toArabicDigits(pageNumber)}
            </Text>
            <Text style={styles.innerPageHeaderArabicText} numberOfLines={1}>
              {getCurrentParah(pageNumber).arabicName}
            </Text>
          </View>
          <View style={styles.innerPageHeaderDivider} />

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.quranContent}>
              {uniqueSurahNumbers.map((surahNumber) => {
                const surahAyahs = pageData.ayahs.filter(a => a.surah.number === surahNumber);
                const firstAyah = surahAyahs[0];
                const renderHeader = firstAyah.numberInSurah === 1;

                return (
                  <View key={`surah_group_${surahNumber}`} style={styles.surahGroup}>
                    {renderHeader && (
                      <View style={styles.surahBannerContainer}>
                        <View style={styles.surahBannerCard}>
                          <View style={styles.bannerOrnamentLeft} />
                          <View style={styles.bannerCenterContent}>
                            <Text style={styles.bannerArabicTitle}>{firstAyah.surah.name}</Text>
                          </View>
                          <View style={styles.bannerOrnamentRight} />
                        </View>
                        {/* Centered Bismillah Header (Not for Surah 1 or 9) */}
                        {firstAyah.surah.number !== 1 && firstAyah.surah.number !== 9 && (
                          <Text style={styles.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.surahTextContainer}>
                      <Text style={styles.quranTextParagraph}>
                        {surahAyahs.map((item, index) => {
                          const isHighlightedText = selectedAyah?.number === item.number;
                          const displayFontSize = Math.min(26, (fontSize * 0.95) + 4);
                          const displayLineHeight = displayFontSize * 1.95;

                          // Determine if a Ruku ends on this ayah
                          const isLastAyahOfSurah = item.numberInSurah === item.surah.numberOfAyahs;
                          const isRukuFinished = (() => {
                            if (item.ruku === undefined) return false;
                            const nextAyahOnPage = surahAyahs[index + 1];
                            if (nextAyahOnPage) {
                              return nextAyahOnPage.ruku !== item.ruku;
                            }
                            if (isLastAyahOfSurah) {
                              return true;
                            }
                            // If it's the last ayah of the page, check the first ayah of the next page
                            if (nextPageData && nextPageData.ayahs && nextPageData.ayahs.length > 0) {
                              const firstAyahNextPage = nextPageData.ayahs[0];
                              return firstAyahNextPage.ruku !== item.ruku;
                            }
                            return false;
                          })();

                          // Strip Bismillah prefix if not Surah 1 or 9 and it is the first ayah
                          let textToRender = item.text;
                          if (item.numberInSurah === 1 && item.surah.number !== 1 && item.surah.number !== 9) {
                            const BISMILLAH_REGEX = /^(بِسْمِ\s+اللَّهِ\s+الرَّحْمَٰنِ\s+الرَّحِيمِ|بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰنِ\s+ٱلرَّحِيمِ)\s*/;
                            textToRender = textToRender.replace(BISMILLAH_REGEX, "");
                          }

                          return (
                            <Text
                              key={item.number}
                              onPress={() => onAyahTap(item)}
                              style={[
                                styles.ayahInlineText,
                                { fontSize: displayFontSize, lineHeight: displayLineHeight },
                                isHighlightedText && styles.highlightedInlineAyahText
                              ]}
                            >
                              {textToRender}
                              <Text style={styles.ayahBadge}> ﴿{toArabicDigits(item.numberInSurah)}﴾ </Text>
                              {isRukuFinished && (
                                <Text style={styles.rukuInlineSign}>
                                  {item.surahRuku !== undefined ? ` ﴿ع/${toArabicDigits(item.surahRuku)}﴾ ` : " ﴿ع﴾ "}
                                </Text>
                              )}
                            </Text>
                          );
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </View>
  );
});

export default function MushafScreen() {
  const insets = useSafeAreaInsets();
  const { page } = useLocalSearchParams();
  const initialPage = page ? parseInt(page as string, 10) : 1;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [selectedAyah, setSelectedAyah] = useState<MushafAyah | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  
  // Custom Surah Dropdown selector state
  const [showSurahModal, setShowSurahModal] = useState<boolean>(false);
  const [surahSearch, setSurahSearch] = useState<string>('');

  const { preferences, bookmarks, pageBookmarks, togglePageBookmark, updateLastReadPage, refreshBookmarks } = useQuran();
  const { playAudio, pauseAudio, isPlaying, togglePlayback, currentUrl } = useAudioPlayer();
  const { language } = useLanguage();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto-update reading progress in background
    updateLastReadPage(currentPage);
  }, [currentPage]);

  // Background pre-fetching adjacent pages to improve swipe performance
  useEffect(() => {
    const prefetchAdjacent = async () => {
      const pagesToPrefetch = [
        currentPage - 1,
        currentPage + 1,
        currentPage - 2,
        currentPage + 2
      ];
      for (const p of pagesToPrefetch) {
        if (p >= 1 && p <= 604) {
          fetchQuranPage(p, preferences.translationLanguage).catch((err) => {
            console.log(`Background prefetch failed for page ${p}:`, err);
          });
        }
      }
    };
    const timer = setTimeout(prefetchAdjacent, 800);
    return () => clearTimeout(timer);
  }, [currentPage, preferences.translationLanguage]);

  // Scroll to initial page index on load
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: initialPage - 1,
        animated: false
      });
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= 604) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: newPage - 1,
        animated: false
      });
      setCurrentPage(newPage);
      setSelectedAyah(null);
    }
  };

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / width);
    const newPage = pageIndex + 1;
    if (newPage !== currentPage && newPage >= 1 && newPage <= 604) {
      setCurrentPage(newPage);
      setSelectedAyah(null);
    }
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
        translation: selectedAyah.translation || '',
        pageNumber: selectedAyah.page
      });
    }
    refreshBookmarks();
  };

  const handleAyahPlay = () => {
    if (!selectedAyah) return;
    const url = getAudioUrl(selectedAyah.surah.number, selectedAyah.number);
    // Pause currently playing audio if tapped again, otherwise play
    if (isPlaying && currentUrl === url) {
      pauseAudio();
    } else {
      playAudio(url);
    }
  };

  const isSelectedAyahPlaying = () => {
    if (!selectedAyah) return false;
    const url = getAudioUrl(selectedAyah.surah.number, selectedAyah.number);
    return isPlaying && currentUrl === url;
  };

  const currentSurahInfo = getSurahForPage(currentPage);
  const currentParahInfo = getCurrentParah(currentPage);
  const isPageBookmarked = pageBookmarks.includes(currentPage);

  // Filter Surah list for search within dropdown
  const filteredSurahList = useMemo(() => {
    return SURA_START_PAGES.filter(s =>
      s.englishName.toLowerCase().includes(surahSearch.toLowerCase()) ||
      s.name.includes(surahSearch) ||
      s.number.toString().includes(surahSearch)
    );
  }, [surahSearch]);

  const getItemLayout = (data: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const toggleFullScreen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFullScreen(!isFullScreen);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: isFullScreen ? 0 : insets.top }]}>
      <StatusBar hidden={isFullScreen} barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Layout matches Mockup 2 (Removed rounded bottom corners) */}
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center: Surah selector dropdown */}
          <TouchableOpacity
            onPress={() => {
              setSurahSearch('');
              setShowSurahModal(true);
            }}
            style={styles.headerDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.headerSurahText} numberOfLines={1}>
              {currentSurahInfo.englishName}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Right: Parah index */}
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={handlePageBookmarkToggle} style={[styles.iconButton, { marginRight: 4 }]}>
              <Ionicons
                name={isPageBookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={isPageBookmarked ? Colors.accentLight : "#FFFFFF"}
              />
            </TouchableOpacity>
            <Text style={styles.headerJuzText}>Parah {currentParahInfo.number}</Text>
          </View>
        </View>
      )}

      {/* Page swiper using Native Paging enabled FlatList (Inverted to flow RTL!) */}
      <FlatList
        ref={flatListRef}
        data={PAGES_ARRAY}
        horizontal
        pagingEnabled
        inverted
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <MushafPageItem
            pageNumber={item}
            translationLanguage={preferences.translationLanguage}
            onAyahTap={handleAyahTap}
            selectedAyah={selectedAyah}
            fontSize={preferences.fontSize}
            onPagePress={toggleFullScreen}
          />
        )}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        style={styles.bookCanvas}
      />

      {/* Dynamic Swiper Bottom Controls */}
      {!isFullScreen && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <TouchableOpacity
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={[styles.pageNavBtn, currentPage <= 1 && styles.disabledNavBtn]}
          >
            <Ionicons name="chevron-back" size={24} color={currentPage <= 1 ? Colors.textMuted : Colors.primary} />
            <Text style={[styles.navBtnText, currentPage <= 1 && styles.disabledBtnText]}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageIndicatorContainer}>
            <Text style={styles.pageIndicatorTitle}>PAGE</Text>
            <Text style={styles.pageIndicatorNumber}>{currentPage} / 604</Text>
          </View>

          <TouchableOpacity
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= 604}
            style={[styles.pageNavBtn, currentPage >= 604 && styles.disabledNavBtn]}
          >
            <Text style={[styles.navBtnText, currentPage >= 604 && styles.disabledBtnText]}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color={currentPage >= 604 ? Colors.textMuted : Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Surah Dropdown Selector Modal */}
      <Modal visible={showSurahModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Surah</Text>
              <TouchableOpacity onPress={() => setShowSurahModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search Surah..."
                value={surahSearch}
                onChangeText={setSurahSearch}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <FlatList
              data={filteredSurahList}
              keyExtractor={(item) => item.number.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalSurahItem}
                  onPress={() => {
                    setShowSurahModal(false);
                    setSurahSearch('');
                    handlePageChange(item.startPage);
                  }}
                >
                  <View style={styles.modalSurahNumber}>
                    <Text style={styles.modalSurahNumberText}>{item.number}</Text>
                  </View>
                  <Text style={styles.modalSurahName}>{item.englishName}</Text>
                  <Text style={styles.modalSurahArabic}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

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
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    zIndex: 10,
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: '55%',
  },
  headerSurahText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerJuzText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  bookCanvas: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
  },
  pageItemContainer: {
    width: width,
    height: '100%',
    padding: 4,
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
    backgroundColor: '#FAFBF6', // Elegant warm off-white paper
    overflow: 'hidden',
  },
  singleBorderFrame: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D4A843', // One single elegant gold border
    margin: 8,
    padding: 8,
    borderRadius: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  quranContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  surahBannerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  surahBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#D4A843',
    borderWidth: 1.5,
    borderRadius: 8,
    width: '94%',
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(212, 168, 67, 0.04)',
  },
  bannerOrnamentLeft: {
    width: 10,
    height: 10,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: '#D4A843',
    transform: [{ rotate: '-45deg' }],
  },
  bannerOrnamentRight: {
    width: 10,
    height: 10,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: '#D4A843',
    transform: [{ rotate: '45deg' }],
  },
  bannerCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerArabicTitle: {
    fontSize: 22,
    fontFamily: 'Amiri_700Bold',
    color: '#B08E35', // Premium dark gold title
    textAlign: 'center',
  },
  bismillahText: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 21,
    color: '#1A2E1A',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  arabicParagraph: {
    writingDirection: 'rtl',
    textAlign: 'center',
    marginVertical: 4,
  },
  ayahTextSegment: {
    fontFamily: 'Amiri_400Regular',
    color: '#1A2E1A',
    textAlign: 'center',
  },
  surahGroup: {
    width: '100%',
    marginBottom: 8,
  },
  surahTextContainer: {
    width: '100%',
    paddingHorizontal: 2,
    paddingVertical: 10,
    backgroundColor: '#FAFBF6',
  },
  quranTextParagraph: {
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  ayahInlineText: {
    fontFamily: 'Lateef_400Regular',
    color: '#1A2E1A',
  },
  highlightedInlineAyahText: {
    backgroundColor: 'rgba(212, 168, 67, 0.22)',
  },
  ayahBadge: {
    color: '#B08E35',
    fontSize: 18,
    fontFamily: 'Lateef_400Regular',
  },
  rukuInlineSign: {
    color: '#D4A843',
    fontSize: 18,
    fontFamily: 'Lateef_400Regular',
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
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
  // Modal Selector Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  modalSurahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalSurahNumber: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalSurahNumberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  modalSurahName: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  modalSurahArabic: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.primary,
  },
  innerPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    paddingHorizontal: 8,
    width: '100%',
  },
  innerPageHeaderArabicText: {
    fontFamily: 'Lateef_400Regular',
    fontSize: 22,
    color: Colors.primary,
  },
  innerPageHeaderNumberText: {
    fontFamily: 'Lateef_400Regular',
    fontSize: 20,
    color: '#D4A843',
    fontWeight: 'bold',
  },
  innerPageHeaderDivider: {
    height: 1.5,
    backgroundColor: '#D4A843',
    width: '100%',
    marginBottom: 8,
  },
});
