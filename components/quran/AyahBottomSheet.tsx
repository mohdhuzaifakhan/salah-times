import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fetchTafseerFromAPI, MushafAyah } from '@/lib/quran/api';
import { getTafseerFromFirestore } from '@/lib/quran/db';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

interface AyahBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  ayah: MushafAyah | null;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  onPlay: () => void;
  isPlaying: boolean;
  language: string;
}

const SCHOLARS = [
  { key: 'taqi_usmani', name: 'Taqi Usmani', title: 'Mufti Taqi Usmani' },
  { key: 'ibn_kathir', name: 'Ibn Kathir', title: 'Tafseer Ibn Kathir' },
  { key: 'maududi', name: 'Maududi', title: 'Tafheem-ul-Quran' },
  { key: 'jalalayn', name: 'Jalalayn', title: 'Tafseer Jalalayn' },
  { key: 'maariful_quran', name: 'Maariful Quran', title: 'Maarif-ul-Quran' },
];

export default function AyahBottomSheet({
  visible,
  onClose,
  ayah,
  isBookmarked,
  onBookmarkToggle,
  onPlay,
  isPlaying,
  language
}: AyahBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'options' | 'tafseer' | 'translation'>('options');
  const [selectedScholar, setSelectedScholar] = useState<string>('taqi_usmani');
  const [tafseerText, setTafseerText] = useState<string>('');
  const [loadingTafseer, setLoadingTafseer] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setActiveTab('options');
      setSelectedScholar('taqi_usmani');
    }
  }, [visible, ayah]);

  useEffect(() => {
    if (activeTab === 'tafseer' && ayah) {
      loadTafseer();
    }
  }, [activeTab, selectedScholar, ayah]);

  const loadTafseer = async () => {
    if (!ayah) return;
    try {
      setLoadingTafseer(true);

      // 1. Try fetching from Firestore first (as per architecture)
      let text = await getTafseerFromFirestore(selectedScholar, ayah.surah.number, ayah.numberInSurah);

      // 2. If empty or fails, fall back to Quran.com APIs
      if (!text) {
        // Map language
        const apiLang = language === 'ur' ? 'ur' : language === 'hi' ? 'hi' : 'en';
        text = await fetchTafseerFromAPI(selectedScholar, ayah.surah.number, ayah.numberInSurah, apiLang);
      }

      setTafseerText(text || 'Tafseer text is not available.');
    } catch (error) {
      console.error("Failed to load Tafseer:", error);
      setTafseerText("Failed to fetch Tafseer. Check your internet connection.");
    } finally {
      setLoadingTafseer(false);
    }
  };

  const handleCopy = async () => {
    if (!ayah) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(
      `${ayah.text}\n\n${ayah.translation}\n\n[Surah ${ayah.surah.englishName} : Ayat ${ayah.numberInSurah}]`
    );
    alert("Copied to clipboard!");
  };

  const handleShare = async () => {
    if (!ayah) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `${ayah.text}\n\n${ayah.translation}\n\n[Surah ${ayah.surah.englishName} : Ayat ${ayah.numberInSurah}]`,
    });
  };

  const toggleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBookmarkToggle();
  };

  const triggerPlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlay();
  };

  if (!ayah) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={[styles.sheetContent, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          {/* Handle Indicator */}
          <View style={styles.sheetHandle} />

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.surahTitle}>{ayah.surah.englishName} : {ayah.surah.name}</Text>
              <Text style={styles.ayahSub}>Ayat {ayah.numberInSurah} (Parah {ayah.juz})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Tab Selection */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'options' && styles.activeTabItem]}
              onPress={() => setActiveTab('options')}
            >
              <Text style={[styles.tabText, activeTab === 'options' && styles.activeTabText]}>Actions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'translation' && styles.activeTabItem]}
              onPress={() => setActiveTab('translation')}
            >
              <Text style={[styles.tabText, activeTab === 'translation' && styles.activeTabText]}>Translation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'tafseer' && styles.activeTabItem]}
              onPress={() => setActiveTab('tafseer')}
            >
              <Text style={[styles.tabText, activeTab === 'tafseer' && styles.activeTabText]}>Tafseer</Text>
            </TouchableOpacity>
          </View>

          {/* Content View */}
          <View style={styles.scrollArea}>
            {activeTab === 'options' && (
              <View style={styles.optionsGrid}>
                <TouchableOpacity style={styles.optionCard} onPress={triggerPlay}>
                  <View style={[styles.optionIconBadge, isPlaying && styles.activePlayBadge]}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={isPlaying ? '#fff' : Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{isPlaying ? "Pause Audio" : "Play Audio"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={toggleBookmark}>
                  <View style={styles.optionIconBadge}>
                    <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={isBookmarked ? Colors.accent : Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{isBookmarked ? "Bookmarked" : "Bookmark Ayat"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={() => setActiveTab('translation')}>
                  <View style={styles.optionIconBadge}>
                    <Ionicons name="language-outline" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>Translation</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={() => setActiveTab('tafseer')}>
                  <View style={styles.optionIconBadge}>
                    <Ionicons name="library-outline" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>Read Tafseer</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={handleCopy}>
                  <View style={styles.optionIconBadge}>
                    <Ionicons name="copy-outline" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>Copy Ayat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={handleShare}>
                  <View style={styles.optionIconBadge}>
                    <Ionicons name="share-social-outline" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.optionText}>Share Ayat</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'translation' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.textScrollView}>
                <Text style={styles.arabicTextDisplay}>{ayah.text}</Text>
                <View style={styles.divider} />
                <Text style={styles.translationLabel}>TRANSLATION</Text>
                <Text style={styles.translationTextDisplay}>{ayah.translation}</Text>
              </ScrollView>
            )}

            {activeTab === 'tafseer' && (
              <View style={{ flex: 1 }}>
                {/* Scholar Selector Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.scholarSelector}
                  contentContainerStyle={{ paddingRight: 20 }}
                >
                  {SCHOLARS.map((scholar) => (
                    <TouchableOpacity
                      key={scholar.key}
                      style={[
                        styles.scholarChip,
                        selectedScholar === scholar.key && styles.activeScholarChip
                      ]}
                      onPress={() => setSelectedScholar(scholar.key)}
                    >
                      <Text style={[
                        styles.scholarChipText,
                        selectedScholar === scholar.key && styles.activeScholarChipText
                      ]}>
                        {scholar.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Tafseer Scroll Text */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.textScrollView}>
                  <Text style={styles.tafseerTitle}>
                    {SCHOLARS.find(s => s.key === selectedScholar)?.title}
                  </Text>

                  {loadingTafseer ? (
                    <View style={styles.tafseerLoader}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loaderText}>Loading Tafseer commentary...</Text>
                    </View>
                  ) : (
                    <Text style={styles.tafseerContent}>{tafseerText}</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.85,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  surahTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  ayahSub: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  scrollArea: {
    minHeight: 280,
    maxHeight: height * 0.55,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  optionCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  optionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activePlayBadge: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
  },
  textScrollView: {
    paddingBottom: 20,
  },
  arabicTextDisplay: {
    fontSize: 24,
    color: Colors.text,
    lineHeight: 44,
    textAlign: 'right',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  translationLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  translationTextDisplay: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scholarSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginBottom: 16,
    maxHeight: 48,
  },
  scholarChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: 10,
    height: 38,
  },
  activeScholarChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scholarChipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activeScholarChipText: {
    color: '#fff',
  },
  tafseerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 12,
  },
  tafseerContent: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 24,
    textAlign: 'justify',
  },
  tafseerLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loaderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
  },
});
