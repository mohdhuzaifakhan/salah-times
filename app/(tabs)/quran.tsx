import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { fetchSurahList, Surah, isQuranSynced, syncFullQuran } from '@/lib/quran/api';
import { SURA_START_PAGES, PARAH_LIST, ParahMapping } from '@/lib/quran/constants';
import SurahCard from '@/components/quran/SurahCard';
import { useQuran } from '@/lib/quran/context';
import { useLanguage } from '@/lib/language-context';
import { QuranSkeleton } from '@/components/Skeleton';
import { PremiumBannerAd } from '@/components/ads/PremiumBannerAd';

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

export default function QuranHomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'surahs' | 'parah'>('surahs');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
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
        const success = await syncFullQuran('en.sahih', (progress) => {
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
    return surahs.filter(s =>
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.includes(search) ||
      s.englishNameTranslation.toLowerCase().includes(search.toLowerCase())
    );
  }, [surahs, search]);

  const filteredParahs = useMemo(() => {
    return PARAH_LIST.filter(p =>
      p.englishName.toLowerCase().includes(search.toLowerCase()) ||
      p.arabicName.includes(search) ||
      `parah ${p.number}`.includes(search.toLowerCase())
    );
  }, [search]);

  const handleSuraPress = (surahNumber: number) => {
    const mapping = SURA_START_PAGES.find(s => s.number === surahNumber);
    const startPage = mapping ? mapping.startPage : 1;
    router.push(`/quran/mushaf?page=${startPage}`);
  };

  const handleParahPress = (parah: ParahMapping) => {
    router.push(`/quran/mushaf?page=${parah.startPage}`);
  };

  const renderParahItem = ({ item }: { item: ParahMapping }) => {
    return (
      <TouchableOpacity
        style={styles.juzCard}
        onPress={() => handleParahPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{item.number}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.juzTitle}>Parah {item.number}</Text>
          <Text style={styles.subInfo}>
            {item.englishName} • Page {item.startPage}
          </Text>
        </View>

        <View style={styles.arabicContainer}>
          <Text style={styles.arabicName}>{item.arabicName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Solid Teal Header Block (Removed rounded bottom corners) */}
      <View style={[styles.greenHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Al-Quran</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => {
              setActiveTab('surahs');
              setSearch('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'surahs' && styles.activeTabText]}>
              Surah
            </Text>
            {activeTab === 'surahs' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => {
              setActiveTab('parah');
              setSearch('');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'parah' && styles.activeTabText]}>
              Parah
            </Text>
            {activeTab === 'parah' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (Below Header Block) */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
          <Ionicons name="search" size={20} color={Colors.textMuted} />
        </View>
      </View>

      {syncing && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.syncText}>
            Downloading Quran for offline reading... {Math.round(syncProgress * 100)}%
          </Text>
        </View>
      )}

      {lastReadPage && (
        <TouchableOpacity
          style={styles.continueCard}
          onPress={() => router.push(`/quran/mushaf?page=${lastReadPage}`)}
          activeOpacity={0.85}
        >
          <View style={styles.continueCardHeader}>
            <View style={styles.continueCardBadge}>
              <Ionicons name="book-outline" size={14} color={Colors.accentLight} />
              <Text style={styles.continueCardBadgeText}>Continue Reading</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>

          <View style={styles.continueCardBody}>
            <View>
              <Text style={styles.continueCardTitle}>
                Surah {getSurahForPage(lastReadPage).englishName}
              </Text>
              <Text style={styles.continueCardSubtitle}>
                Parah {getCurrentParah(lastReadPage).number} • Page {lastReadPage}
              </Text>
            </View>
            <Text style={styles.arabicNameText}>
              {getSurahForPage(lastReadPage).name}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Main Content Area */}
      <View style={styles.container}>
        {loading ? (
          <QuranSkeleton />
        ) : activeTab === 'surahs' ? (
          <FlatList
            data={filteredSurahs}
            keyExtractor={(item) => item.number.toString()}
            renderItem={({ item }) => (
              <SurahCard
                surah={item}
                onPress={() => handleSuraPress(item.number)}
                isRecent={recentRead?.surahNumber === item.number}
              />
            )}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={filteredParahs}
            keyExtractor={(item) => item.number.toString()}
            renderItem={renderParahItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <PremiumBannerAd inTabBar={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  greenHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
    marginBottom: 16,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  tabButton: {
    paddingVertical: 6,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -6,
    height: 3,
    width: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  juzCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  juzTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 2,
  },
  subInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  arabicContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  arabicName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: '#1A2E1A',
  },
  continueCard: {
    backgroundColor: Colors.primaryDark,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  continueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  continueCardBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  continueCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  continueCardTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  continueCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  arabicNameText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: Colors.accentLight,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlay,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  syncText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
});
