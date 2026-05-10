import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fetchHadithByNumber, BOOKS } from '@/lib/hadith/api';
import { addHadithBookmark, removeHadithBookmark, updateRecentHadith } from '@/lib/hadith/db';
import { useHadith } from '@/lib/hadith/context';
import { useLanguage } from '@/lib/language-context';
import HadithItem from '@/components/hadith/HadithItem';

const LazyHadithItem = ({ number, slug, bookName, isBookmarked, onBookmark, fontSize, showArabic, language }: any) => {
  const [hadith, setHadith] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const h = await fetchHadithByNumber(slug, number, language);
        if (isMounted) {
          setHadith(h);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [number, slug, language]);

  if (loading) {
    return (
      <View style={styles.itemPlaceholder}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.placeholderText}>Loading Hadith #{number}...</Text>
      </View>
    );
  }

  if (!hadith) return null;

  return (
    <HadithItem 
      hadith={hadith}
      bookName={bookName}
      isBookmarked={isBookmarked}
      onBookmark={() => onBookmark(hadith)}
      fontSize={fontSize}
      showArabic={showArabic}
    />
  );
};

export default function HadithListScreen() {
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams();
  const [search, setSearch] = useState('');
  const { bookmarks, refreshBookmarks, preferences } = useHadith();
  const { t } = useLanguage();

  const bookInfo = BOOKS.find(b => b.slug === slug);

  const numbers = useMemo(() => {
    if (!bookInfo) return [];
    const count = bookInfo.count;
    const arr = [];
    for (let i = 1; i <= count; i++) {
      if (!search || String(i).includes(search)) {
        arr.push(i);
      }
    }
    return arr;
  }, [bookInfo, search]);

  const isBookmarked = (hadithNumber: number) => {
    return bookmarks.some(b => b.bookSlug === slug && b.hadithNumber === hadithNumber);
  };

  const handleBookmark = async (hadith: any) => {
    if (isBookmarked(hadith.hadithnumber)) {
      await removeHadithBookmark(String(slug), hadith.hadithnumber);
    } else {
      await addHadithBookmark({
        bookSlug: String(slug),
        hadithNumber: hadith.hadithnumber,
        bookName: bookInfo?.name || '',
        text: hadith.text,
        arabicText: hadith.arabicText
      });
    }
    refreshBookmarks();
  };

  if (!bookInfo) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{bookInfo.name}</Text>
          <Text style={styles.headerSubtitle}>{bookInfo.count} {t('hadith')}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="options-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by number..."
            value={search}
            onChangeText={setSearch}
            keyboardType="numeric"
          />
        </View>

        <FlatList
          data={numbers}
          keyExtractor={(item) => item.toString()}
          renderItem={({ item }) => (
            <LazyHadithItem 
              number={item}
              slug={String(slug)}
              bookName={bookInfo.name}
              isBookmarked={isBookmarked(item)}
              onBookmark={handleBookmark}
              fontSize={preferences.fontSize}
              showArabic={preferences.showArabic}
              language={preferences.language}
            />
          )}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
  settingsButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
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
    paddingBottom: 40,
  },
  itemPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginBottom: 1,
  },
  placeholderText: {
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
