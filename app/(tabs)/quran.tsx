import { QuranSkeleton } from '@/components/Skeleton';
import { PremiumBannerAd } from '@/components/ads/PremiumBannerAd';
import SurahCard from '@/components/quran/SurahCard';
import { VoiceSearchButton } from '@/components/voice-search-button';
import Colors from '@/constants/colors';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { useLanguage } from '@/lib/language-context';
import { fetchSurahList, isQuranSynced, Surah, syncFullQuran } from '@/lib/quran/api';
import { PARAH_LIST, ParahMapping, SURA_START_PAGES } from '@/lib/quran/constants';
import { useQuran } from '@/lib/quran/context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  Heart,
  Pin,
  Play,
  Search,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

export default function QuranHomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'surahs' | 'parah'>('surahs');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const { recentRead, lastReadPage } = useQuran();

  useEffect(() => {
    loadSurahs();
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    try {
      const synced = await isQuranSynced();
      if (!synced) {
        setSyncing(true);
        await syncFullQuran('en.sahih', (progress) => {
          setSyncProgress(progress);
        });
        setSyncing(false);
      }
    } catch (e) {
      console.warn("Failed to check or sync Quran offline:", e);
      setSyncing(false);
    }
  };

  const loadSurahs = async () => {
    try {
      setLoading(true);
      const data = await fetchSurahList();
      setSurahs(data);
    } catch (error) {
      console.error('Failed to load surahs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSurahs = useMemo(() => {
    if (!search) return surahs;
    return surahs.filter(s => {
      const combined = `${s.englishName} ${s.name} ${s.englishNameTranslation} ${s.number}`;
      return fuzzyMatch(combined, search);
    });
  }, [surahs, search]);

  const filteredParahs = useMemo(() => {
    if (!search) return PARAH_LIST;
    return PARAH_LIST.filter(p => {
      const combined = `${p.englishName} ${p.arabicName} parah ${p.number}`;
      return fuzzyMatch(combined, search);
    });
  }, [search]);

  const handleSuraPress = useCallback((surahNumber: number) => {
    const surahInfo = SURA_START_PAGES.find(s => s.number === surahNumber);
    const startPage = surahInfo ? surahInfo.startPage : 1;
    router.push(`/quran/mushaf?page=${startPage}`);
  }, []);

  const renderJuzItem = useCallback(({ item }: { item: ParahMapping }) => {
    const nextParahPage = item.number < 30 ? PARAH_LIST[item.number].startPage : 605;
    const juzSurahs = SURA_START_PAGES.filter(
      s => s.startPage >= item.startPage && s.startPage < nextParahPage
    );

    return (
      <View style={styles.juzCardContainer}>
        {/* Juz Header */}
        <View style={styles.juzHeaderRow}>
          <View>
            <Text style={styles.juzTitle}>Juz {item.number}</Text>
            <Text style={styles.juzSubtext}>{item.englishName}</Text>
          </View>
          <Text style={styles.juzPageText}>Page {item.startPage}</Text>
        </View>

        {/* Inner Surah Pills */}
        <View style={styles.juzSurahsGrid}>
          {juzSurahs.map((surah) => (
            <TouchableOpacity
              key={surah.number}
              style={styles.juzSurahPill}
              onPress={() => handleSuraPress(surah.number)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.miniSurahName} numberOfLines={1}>
                  {surah.englishName}
                </Text>
                <Text style={styles.miniSurahVerses}>
                  Start Pg {surah.startPage}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [handleSuraPress]);

  const renderItem = useCallback(({ item }: { item: Surah | ParahMapping }) => {
    if (activeTab === 'surahs') {
      const surah = item as Surah;
      return (
        <SurahCard
          surah={surah}
          onPress={() => handleSuraPress(surah.number)}
          isRecent={recentRead?.surahNumber === surah.number}
        />
      );
    }
    return renderJuzItem({ item: item as ParahMapping });
  }, [activeTab, handleSuraPress, recentRead, renderJuzItem]);

  const listData = activeTab === 'surahs' ? filteredSurahs : filteredParahs;

  const renderHeader = () => (
    <View>
      {/* Quick Action Pill Banner */}
      <View style={styles.quickActionPillContainer}>
        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => {
            if (lastReadPage) router.push(`/quran/mushaf?page=${lastReadPage}`);
          }}
        >
          <View style={styles.quickActionIconCircle}>
            <BookOpen size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Last Read</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem}>
          <View style={styles.quickActionIconCircle}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Last Listened</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem}>
          <View style={styles.quickActionIconCircle}>
            <Pin size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Pinned</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem}>
          <View style={styles.quickActionIconCircle}>
            <Heart size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Favorites</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher: Surah vs Juz */}
      <View style={styles.tabBarRow}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'surahs' && styles.segmentBtnActive]}
            onPress={() => {
              setActiveTab('surahs');
              setSearch('');
            }}
            activeOpacity={0.8}
          >
            {activeTab === 'surahs' && <Check size={16} color={Colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.segmentText, activeTab === 'surahs' && styles.segmentTextActive]}>
              Surah
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'parah' && styles.segmentBtnActive]}
            onPress={() => {
              setActiveTab('parah');
              setSearch('');
            }}
            activeOpacity={0.8}
          >
            {activeTab === 'parah' && <Check size={16} color={Colors.primary} style={{ marginRight: 4 }} />}
            <Text style={[styles.segmentText, activeTab === 'parah' && styles.segmentTextActive]}>
              Juz
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchTriggerBtn}
          onPress={() => setShowSearchInput(!showSearchInput)}
        >
          <Search size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Expandable Search Input */}
      {showSearchInput && (
        <View style={styles.searchInputContainer}>
          <Search size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search surah or juz..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <VoiceSearchButton onTranscript={setSearch} size={18} color={Colors.textMuted} />
          )}
        </View>
      )}

      {syncing && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.syncText}>
            Downloading Quran for offline reading... {Math.round(syncProgress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Top Navigation Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quran</Text>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bookmark size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <User size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <QuranSkeleton />
      ) : (
        <FlatList
          data={listData as any[]}
          keyExtractor={(item) => (activeTab === 'surahs' ? `surah_${(item as Surah).number}` : `juz_${(item as ParahMapping).number}`)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PremiumBannerAd inTabBar={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: Colors.text,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  quickActionPillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: Colors.primary,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 3,
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  segmentBtnActive: {
    backgroundColor: Colors.overlay,
  },
  segmentText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  searchTriggerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  syncText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  juzCardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  juzHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  juzTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: Colors.text,
  },
  juzSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  juzPageText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  juzSurahsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  juzSurahPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  miniSurahName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  miniSurahVerses: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
