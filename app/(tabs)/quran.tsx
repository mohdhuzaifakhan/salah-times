import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
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

const QuranHeader = React.memo(({ search, setSearch, recentRead, t }: any) => (
  <View style={styles.header}>
    <Text style={styles.title}>{t('quran')}</Text>

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
            <Text style={styles.recentAyah}>Ayah {recentRead.ayahNumber}</Text>
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
  </View>
));

export default function QuranHomeScreen() {
  const { t } = useLanguage();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { recentRead } = useQuran();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {loading ? (
          <QuranSkeleton />
        ) : (
          <FlatList
            data={filteredSurahs}
            keyExtractor={(item) => item.number.toString()}
            renderItem={({ item }) => (
              <SurahCard
                surah={item}
                onPress={() => router.push(`/quran/${item.number}`)}
              />
            )}
            ListHeaderComponent={
              <QuranHeader 
                search={search} 
                setSearch={setSearch} 
                recentRead={recentRead} 
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
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.primary,
    marginBottom: 20,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
});
