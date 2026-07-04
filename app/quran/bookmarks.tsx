import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useQuran } from '@/lib/quran/context';
import { removeBookmark } from '@/lib/quran/db';
import axios from 'axios';
import { SURA_START_PAGES } from '@/lib/quran/constants';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { bookmarks, refreshBookmarks } = useQuran();
  const [loadingBookmarkId, setLoadingBookmarkId] = useState<string | null>(null);

  const handleRemove = async (surahNumber: number, ayahNumber: number) => {
    await removeBookmark(surahNumber, ayahNumber);
    refreshBookmarks();
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarked Ayat</Text>
        <View style={{ width: 40 }} />
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={80} color={Colors.border} />
          <Text style={styles.emptyTitle}>No Bookmarked Ayat Yet</Text>
          <Text style={styles.emptySubtitle}>Ayat you bookmark will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.bookmarkCard}
              disabled={loadingBookmarkId !== null}
              onPress={async () => {
                if (item.pageNumber) {
                  router.push(`/quran/mushaf?page=${item.pageNumber}`);
                  return;
                }
                try {
                  setLoadingBookmarkId(item.id);
                  const response = await axios.get(`https://api.quran.com/api/v4/verses/by_key/${item.surahNumber}:${item.ayahNumber}`);
                  const pageNumber = response.data.verse?.page_number;
                  if (pageNumber) {
                    router.push(`/quran/mushaf?page=${pageNumber}`);
                  } else {
                    const fallbackMapping = SURA_START_PAGES.find(s => s.number === item.surahNumber);
                    router.push(`/quran/mushaf?page=${fallbackMapping ? fallbackMapping.startPage : 1}`);
                  }
                } catch (e) {
                  const fallbackMapping = SURA_START_PAGES.find(s => s.number === item.surahNumber);
                  router.push(`/quran/mushaf?page=${fallbackMapping ? fallbackMapping.startPage : 1}`);
                } finally {
                  setLoadingBookmarkId(null);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.surahName}>{item.surahName} • Ayat {item.ayahNumber}</Text>
                  {loadingBookmarkId === item.id && (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemove(item.surahNumber, item.ayahNumber)} disabled={loadingBookmarkId !== null}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.arabicText} numberOfLines={2}>{item.text}</Text>
              <Text style={styles.translationText} numberOfLines={2}>{item.translation}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  bookmarkCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  surahName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  arabicText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 8,
  },
  translationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: Colors.text,
    marginTop: 20,
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
