import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { fetchSurahDetail, SurahDetail, getAudioUrl } from '@/lib/quran/api';
import { addBookmark, removeBookmark, updateRecentRead } from '@/lib/quran/db';
import { useQuran } from '@/lib/quran/context';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import AyahItem from '@/components/quran/AyahItem';
import AudioPlayerControls from '@/components/quran/AudioPlayerControls';

const { width } = Dimensions.get('window');

export default function SurahDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { bookmarks, refreshBookmarks, preferences } = useQuran();
  const { playAudio, isPlaying, togglePlayback, isLoading: audioLoading, currentUrl } = useAudioPlayer();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await fetchSurahDetail(Number(id), preferences.translationLanguage);
      setSurah(data);
      
      // Update recent read
      await updateRecentRead({
        surahNumber: data.number,
        ayahNumber: 1,
        surahName: data.englishName
      });
    } catch (error) {
      console.error('Failed to load surah detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAyahBookmarked = (ayahNumber: number) => {
    return bookmarks.some(b => b.surahNumber === Number(id) && b.ayahNumber === ayahNumber);
  };

  const handleBookmark = async (ayah: any) => {
    if (isAyahBookmarked(ayah.numberInSurah)) {
      await removeBookmark(Number(id), ayah.numberInSurah);
    } else {
      await addBookmark({
        surahNumber: Number(id),
        ayahNumber: ayah.numberInSurah,
        surahName: surah?.englishName || '',
        text: ayah.text,
        translation: ayah.translation
      });
    }
    refreshBookmarks();
  };

  const handlePlayAyah = (ayah: any) => {
    const url = getAudioUrl(Number(id), ayah.number);
    playAudio(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{surah?.englishName}</Text>
          <Text style={styles.headerSubtitle}>{surah?.name}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <FlatList
          ref={listRef}
          data={surah?.ayahs}
          keyExtractor={(item) => item.number.toString()}
          renderItem={({ item }) => (
            <AyahItem 
              ayah={item}
              surahName={surah?.englishName || ''}
              isBookmarked={isAyahBookmarked(item.numberInSurah)}
              onBookmark={() => handleBookmark(item)}
              onPlay={() => handlePlayAyah(item)}
              isPlaying={isPlaying && currentUrl === getAudioUrl(Number(id), item.number)}
              fontSize={preferences.fontSize}
              showTranslation={preferences.showTranslation}
            />
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
        />

        <AudioPlayerControls 
          isPlaying={isPlaying}
          onToggle={togglePlayback}
          isLoading={audioLoading}
          title={surah?.englishName}
          subtitle="Mishary Rashid Alafasy"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
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
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
  settingsButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
