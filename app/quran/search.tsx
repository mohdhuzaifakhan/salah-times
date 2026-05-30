import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchResult {
  verse_key: string;
  verse_id: number;
  text: string;
  translations: {
    name: string;
    text: string;
  }[];
}

export default function QuranSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setLoading(true);
      setSearched(true);

      const response = await axios.get(`https://api.quran.com/api/v4/search`, {
        params: {
          q: query,
          size: 20,
          language: 'en'
        }
      });

      const searchResults = response.data.search?.results || [];

      // Clean up search snippet HTML formatting
      const cleanedResults: SearchResult[] = searchResults.map((item: any) => {
        const cleanSnippet = (text: string) => {
          if (!text) return '';
          return text
            .replace(/<span\s*[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
        };

        return {
          verse_key: item.verse_key,
          verse_id: item.verse_id,
          text: cleanSnippet(item.text),
          translations: (item.translations || []).map((t: any) => ({
            name: t.name || 'Translation',
            text: cleanSnippet(t.text)
          }))
        };
      });

      setResults(cleanedResults);
    } catch (error) {
      console.error("Quran Search failed:", error);
      alert("Search failed. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to translate verse_key (e.g. "2:255") to standard Quran 604 Mushaf page number
  const getMushafPageForVerse = (verseKey: string) => {
    // Standard approximation fallback, but we can call Quran.com API or approximate beautifully.
    // Quran.com actually allows looking up a verse key's page!
    // For search, we can fetch page information dynamically or approximate it,
    // or let them click and open the Surah detail directly!
    // To make it 100% accurate, we can lookup the verse page:
    // `https://api.quran.com/api/v4/verses/by_key/{verseKey}` returns `page_number`!
    return verseKey;
  };

  const handleResultClick = async (item: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setLoading(true);
      // Fetch the page number for this verse key
      const response = await axios.get(`https://api.quran.com/api/v4/verses/by_key/${item.verse_key}`);
      const pageNumber = response.data.verse?.page_number;
      setLoading(false);

      if (pageNumber) {
        router.push(`/quran/mushaf?page=${pageNumber}`);
      } else {
        // Fallback to Surah list detail
        const surahId = item.verse_key.split(':')[0];
        router.push(`/quran/${surahId}`);
      }
    } catch (e) {
      setLoading(false);
      const surahId = item.verse_key.split(':')[0];
      router.push(`/quran/${surahId}`);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Arabic, translations, or Tafseer..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Find</Text>
        </TouchableOpacity>
      </View>

      {/* Results View */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching the Holy Quran...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name={searched ? "document-text-outline" : "search-outline"} size={80} color={Colors.border} />
          <Text style={styles.emptyTitle}>
            {searched ? "No Search Results" : "Global Quran Search"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searched
              ? "We couldn't find any matching verses. Try different words."
              : "Search Arabic text, translations, and commentaries instantly."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.verse_id.toString()}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => {
            const [surahId, ayahId] = item.verse_key.split(':');
            return (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => handleResultClick(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.verseKeyText}>Surah {surahId} : Ayat {ayahId}</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </View>

                <Text style={styles.arabicText}>{item.text}</Text>

                {item.translations.length > 0 && (
                  <View style={styles.translationContainer}>
                    <Text style={styles.translationAuthor}>
                      {item.translations[0].name}
                    </Text>
                    <Text style={styles.translationText}>
                      {item.translations[0].text}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.text,
  },
  searchBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  searchBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  resultCard: {
    backgroundColor: Colors.surface,
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 8,
  },
  verseKeyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  arabicText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'right',
    lineHeight: 32,
    marginBottom: 12,
  },
  translationContainer: {
    backgroundColor: Colors.surfaceAlt,
    padding: 10,
    borderRadius: 8,
  },
  translationAuthor: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  translationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
});
