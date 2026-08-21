import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Play, Pause, Bookmark, Copy, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Ayah } from '@/lib/quran/api';
import * as Clipboard from 'expo-clipboard';
import AllahText from './AllahText';
import AyahEndBadge from './AyahEndBadge';

interface AyahItemProps {
  ayah: Ayah;
  surahName: string;
  isBookmarked: boolean;
  onBookmark: () => void;
  onPlay: () => void;
  isPlaying: boolean;
  fontSize: number;
  showTranslation: boolean;
}

const AyahItem: React.FC<AyahItemProps> = ({ 
  ayah, 
  surahName,
  isBookmarked, 
  onBookmark, 
  onPlay, 
  isPlaying,
  fontSize,
  showTranslation
}) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(`${ayah.text}\n\n${ayah.translation}\n\n[${surahName} ${ayah.numberInSurah}]`);
  };

  const handleShare = async () => {
    await Share.share({
      message: `${ayah.text}\n\n${ayah.translation}\n\n[${surahName} ${ayah.numberInSurah}]`,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.verseBadge}>
          <Text style={styles.verseBadgeText}>
            {ayah.numberInSurah} ({ayah.page || 1})
          </Text>
        </View>

        <View style={styles.actionsToolbar}>
          <TouchableOpacity onPress={onPlay} style={styles.actionBtn}>
            {isPlaying ? (
              <Pause size={17} color={Colors.primary} />
            ) : (
              <Play size={17} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCopy} style={styles.actionBtn}>
            <Copy size={17} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Share2 size={17} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onBookmark} style={styles.actionBtn}>
            <Bookmark 
              size={17} 
              color={isBookmarked ? Colors.accent : Colors.textMuted} 
              fill={isBookmarked ? Colors.accent : "transparent"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Arabic Verse Container with Red Allah Highlighting & Scalloped Ayah Badge */}
      <View style={styles.arabicBox}>
        <Text style={[styles.arabicText, { fontSize: Math.max(22, fontSize * 1.15), lineHeight: Math.max(42, fontSize * 2.0) }]}>
          <AllahText
            text={ayah.text}
            highlightColor={Colors.error}
          />
          {` ﴿${ayah.numberInSurah}﴾ `}
        </Text>
      </View>

      {/* Translation Text */}
      {showTranslation && (
        <View style={styles.translationContainer}>
          <Text style={[styles.translationText, { fontSize: Math.max(14, fontSize * 0.78), lineHeight: Math.max(22, fontSize * 1.35) }]}>
            {ayah.translation}
          </Text>
          <Text style={styles.scholarText}>Sahih International</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  verseBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verseBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  actionsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  arabicBox: {
    width: '100%',
    marginVertical: 8,
  },
  arabicText: {
    width: '100%',
    fontFamily: 'Amiri_400Regular',
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  translationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  translationText: {
    width: '100%',
    fontFamily: 'Poppins_400Regular',
    color: Colors.text,
    textAlign: 'left',
  },
  scholarText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default AyahItem;
