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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { BOOKS, HadithBook, getDailyHadith } from '@/lib/hadith/api';
import HadithBookCard from '@/components/hadith/HadithBookCard';
import { useHadith } from '@/lib/hadith/context';
import { useLanguage } from '@/lib/language-context';
import { HadithSkeleton } from '@/components/Skeleton';
import { PremiumBannerAd } from '@/components/ads/PremiumBannerAd';
import { NativeHadithAdCard } from '@/components/ads/NativeHadithAdCard';

const HadithHeader = React.memo(({ search, setSearch, dailyHadith, recentRead, t }: any) => (
  <View style={styles.header}>
    <Text style={styles.title}>{t('hadith_books')}</Text>

    {dailyHadith && (
      <View style={styles.dailyCard}>
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyLabel}>{t('hadith_of_day')}</Text>
          <Text style={styles.dailyBook}>{dailyHadith.bookName}</Text>
        </View>
        <Text style={styles.dailyText} numberOfLines={4}>
          {dailyHadith.text}
        </Text>
        <TouchableOpacity
          style={styles.dailyAction}
          onPress={() => router.push(`/hadith/book/${BOOKS.find(b => b.name === dailyHadith.bookName)?.slug}`)}
        >
          <Text style={styles.dailyActionText}>{t('read_more')}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    )}

    {recentRead && (
      <TouchableOpacity
        style={styles.recentRow}
        onPress={() => router.push(`/hadith/book/${recentRead.bookSlug}`)}
      >
        <Ionicons name="time-outline" size={20} color={Colors.primary} />
        <Text style={styles.recentText}>Continue: {recentRead.bookName} #{recentRead.hadithNumber}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    )}

    <View style={styles.searchBar}>
      <Ionicons name="search" size={20} color={Colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder={t('search_hadith')}
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  </View>
));

export default function HadithHomeScreen() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [dailyHadith, setDailyHadith] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { recentRead } = useHadith();

  useEffect(() => {
    loadDaily();
  }, []);

  const loadDaily = async () => {
    try {
      const h = await getDailyHadith();
      setDailyHadith(h);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return BOOKS.filter(b =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const booksWithAds = useMemo(() => {
    const result: (HadithBook | { isAd: true; slug: string })[] = [];
    filteredBooks.forEach((item, index) => {
      result.push(item);
      // Inject native ad after the second book card
      if (index === 1) {
        result.push({ isAd: true, slug: `ad-${item.slug}` });
      }
    });
    return result;
  }, [filteredBooks]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <HadithSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <FlatList
          data={booksWithAds}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => {
            if ('isAd' in item) {
              return <NativeHadithAdCard />;
            }
            return (
              <HadithBookCard
                book={item}
                onPress={() => router.push(`/hadith/book/${item.slug}`)}
              />
            );
          }}
          ListHeaderComponent={
            <HadithHeader 
              search={search} 
              setSearch={setSearch} 
              dailyHadith={dailyHadith} 
              recentRead={recentRead} 
              t={t} 
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 140 }} />}
        />
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
  dailyCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dailyBook: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  dailyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 16,
  },
  dailyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  dailyActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#fff',
    marginRight: 6,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recentText: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: Colors.text,
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
    paddingBottom: 20,
  },
});
