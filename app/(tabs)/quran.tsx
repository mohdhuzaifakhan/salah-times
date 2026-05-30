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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { fetchSurahList, Surah } from '@/lib/quran/api';
import SurahCard from '@/components/quran/SurahCard';
import { useQuran } from '@/lib/quran/context';
import { useLanguage } from '@/lib/language-context';
import { QuranSkeleton } from '@/components/Skeleton';
import { PremiumBannerAd } from '@/components/ads/PremiumBannerAd';

const QuranHeader = React.memo(({ search, setSearch, recentRead, activeTab, setActiveTab, t }: any) => (
  <View style={styles.header}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <Text style={[styles.title, { marginBottom: 0 }]}>{t('quran')}</Text>
      <TouchableOpacity
        style={styles.globalSearchBtn}
        onPress={() => router.push('/quran/search')}
      >
        <Ionicons name="search" size={22} color={Colors.primary} />
      </TouchableOpacity>
    </View>

    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'surahs' && styles.activeTabButton]}
        onPress={() => setActiveTab('surahs')}
      >
        <Ionicons name="list" size={18} color={activeTab === 'surahs' ? '#fff' : Colors.primary} />
        <Text style={[styles.tabText, activeTab === 'surahs' && styles.activeTabText]}>
          {t('surahs')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'mushaf' && styles.activeTabButton]}
        onPress={() => setActiveTab('mushaf')}
      >
        <Ionicons name="book" size={18} color={activeTab === 'mushaf' ? '#fff' : Colors.primary} />
        <Text style={[styles.tabText, activeTab === 'mushaf' && styles.activeTabText]}>
          15-Line Quran
        </Text>
      </TouchableOpacity>
    </View>

    {activeTab === 'surahs' ? (
      <>
        {recentRead && (
          <TouchableOpacity
            style={styles.recentCard}
            onPress={() => router.push(`/quran/${recentRead.surahNumber}`)}
          >
            <View style={styles.recentInfo}>
              <Ionicons name="book-outline" size={24} color="#fff" />
              <View style={styles.recentTexts}>
                <Text style={styles.recentLabel}>{t('recent_reading')}</Text>
                <Text style={styles.recentSurah}>{recentRead.surahName}</Text>
                <Text style={styles.recentAyah}>Ayat {recentRead.ayahNumber}</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_surah')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </>
    ) : null}
  </View>
));

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => {
  const pages = [
    1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
    201, 221, 242, 262, 282, 302, 322, 342, 362, 382,
    402, 422, 442, 462, 482, 502, 522, 542, 562, 582
  ];
  return {
    number: i + 1,
    startPage: pages[i]
  };
});

export default function QuranHomeScreen() {
  const { t } = useLanguage();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'surahs' | 'mushaf'>('surahs');
  const [mushafPageSearch, setMushafPageSearch] = useState('');
  const { recentRead, lastReadPage, pageBookmarks } = useQuran();

  useEffect(() => {
    loadSurahs();
  }, []);

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
      s.name.includes(search)
    );
  }, [surahs, search]);

  const handleJumpToMushafPage = (pageStr: string) => {
    const pageNum = parseInt(pageStr, 10);
    if (pageNum >= 1 && pageNum <= 604) {
      router.push(`/quran/mushaf?page=${pageNum}`);
    }
  };

  const renderMushafDashboard = () => {
    const resumePage = lastReadPage || 1;
    return (
      <View style={styles.mushafContainer}>
        {/* Continue Reading Card */}
        <TouchableOpacity
          style={styles.mushafResumeCard}
          onPress={() => router.push(`/quran/mushaf?page=${resumePage}`)}
        >
          <View style={styles.mushafResumeInfo}>
            <View style={styles.resumeIconBadge}>
              <Ionicons name="book" size={22} color={Colors.primary} />
            </View>
            <View style={styles.mushafResumeTexts}>
              <Text style={styles.mushafResumeLabel}>CONTINUE READING</Text>
              <Text style={styles.mushafResumeTitle}>Page {resumePage}</Text>
              <Text style={styles.mushafResumeSubtitle}>15-Line Printed Style Quran</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Search / Jump to page input */}
        <View style={styles.mushafSearchBox}>
          <Ionicons name="enter-outline" size={22} color={Colors.primary} />
          <TextInput
            style={styles.mushafSearchInput}
            placeholder="Type page number to jump (1 - 604)..."
            keyboardType="number-pad"
            value={mushafPageSearch}
            onChangeText={(val) => {
              setMushafPageSearch(val);
              if (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 604) {
                handleJumpToMushafPage(val);
                setMushafPageSearch('');
              }
            }}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Page Bookmarks */}
        {pageBookmarks.length > 0 && (
          <View style={styles.mushafSection}>
            <Text style={styles.mushafSectionTitle}>Bookmarked Pages</Text>
            <FlatList
              data={pageBookmarks}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pageBookmarkChip}
                  onPress={() => router.push(`/quran/mushaf?page=${item}`)}
                >
                  <Ionicons name="bookmark" size={16} color={Colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.pageBookmarkChipText}>Page {item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
            />
          </View>
        )}

        {/* Juz Grid Selection */}
        <View style={[styles.mushafSection, { marginTop: 10 }]}>
          <Text style={styles.mushafSectionTitle}>Jump to Parah</Text>
          <View style={styles.juzGrid}>
            {JUZ_LIST.map((juz) => (
              <TouchableOpacity
                key={juz.number}
                style={styles.juzCard}
                onPress={() => router.push(`/quran/mushaf?page=${juz.startPage}`)}
              >
                <View style={styles.juzNumberBadge}>
                  <Text style={styles.juzNumberText}>{juz.number}</Text>
                </View>
                <Text style={styles.juzTitle}>Parah {juz.number}</Text>
                <Text style={styles.juzPage}>Page {juz.startPage}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
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
                onPress={() => router.push(`/quran/${item.number}`)}
              />
            )}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListHeaderComponent={
              <QuranHeader
                search={search}
                setSearch={setSearch}
                recentRead={recentRead}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                t={t}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={[1]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => renderMushafDashboard()}
            ListHeaderComponent={
              <QuranHeader
                search={search}
                setSearch={setSearch}
                recentRead={recentRead}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                t={t}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <PremiumBannerAd inTabBar={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 20,
  },
  globalSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.primary,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  recentCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTexts: {
    marginLeft: 15,
  },
  recentLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  recentSurah: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  recentAyah: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 140,
  },
  mushafContainer: {
    width: '100%',
  },
  mushafResumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mushafResumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resumeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mushafResumeTexts: {
    flex: 1,
  },
  mushafResumeLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  mushafResumeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  mushafResumeSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  mushafSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  mushafSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  mushafSection: {
    marginBottom: 20,
  },
  mushafSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 10,
  },
  pageBookmarkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pageBookmarkChipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  juzGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  juzCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  juzNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  juzNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: Colors.primary,
  },
  juzTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  juzPage: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

