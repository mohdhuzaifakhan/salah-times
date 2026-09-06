import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Play, Pause, Bookmark, Copy, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Ayah } from '@/lib/quran/api';
import { QuranScriptFont, QuranLineSpacing } from '@/lib/quran/context';
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
  showTransliteration?: boolean;
  scriptFont?: QuranScriptFont;
  lineSpacing?: QuranLineSpacing;
}

const SCRIPT_FONT_FAMILY_MAP: Record<QuranScriptFont, string> = {
  amiri: 'Amiri_400Regular',
  scheherazade: 'ScheherazadeNew_400Regular',
  lateef: 'Lateef_400Regular',
};

const LINE_SPACING_MULTIPLIER_MAP: Record<QuranLineSpacing, number> = {
  compact: 1.6,
  normal: 2.0,
  relaxed: 2.4,
};

const AyahItem: React.FC<AyahItemProps> = ({ 
  ayah, 
  surahName,
  isBookmarked, 
  onBookmark, 
  onPlay, 
  isPlaying,
  fontSize,
  showTranslation,
  showTransliteration = true,
  scriptFont = 'scheherazade',
  lineSpacing = 'normal',
}) => {
  const fontFamily = SCRIPT_FONT_FAMILY_MAP[scriptFont] || 'ScheherazadeNew_400Regular';
  const spacingMultiplier = LINE_SPACING_MULTIPLIER_MAP[lineSpacing] || 2.0;

  const calculatedFontSize = Math.max(22, fontSize * 1.15);
  const calculatedLineHeight = Math.max(38, calculatedFontSize * spacingMultiplier);

  const handleCopy = async () => {
    let copyText = `${ayah.text}\n`;
    if (ayah.transliteration) copyText += `\n[Transliteration]: ${ayah.transliteration}\n`;
    copyText += `\n[Translation]: ${ayah.translation}\n\n[${surahName} ${ayah.numberInSurah}]`;
    await Clipboard.setStringAsync(copyText);
  };

  const handleShare = async () => {
    let shareText = `${ayah.text}\n`;
    if (ayah.transliteration) shareText += `\n[Transliteration]: ${ayah.transliteration}\n`;
    shareText += `\n[Translation]: ${ayah.translation}\n\n[${surahName} ${ayah.numberInSurah}]`;
    await Share.share({ message: shareText });
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

      {/* Arabic Verse Container with Selected Calligraphy Font */}
      <View style={styles.arabicBox}>
        <Text
          style={[
            styles.arabicText,
            {
              fontFamily,
              fontSize: calculatedFontSize,
              lineHeight: calculatedLineHeight,
            },
          ]}
        >
          <AllahText
            text={ayah.text}
            highlightColor={Colors.error}
          />
          {` ﴿${ayah.numberInSurah}﴾ `}
        </Text>
      </View>

      {/* Transliteration Text for Non-Arabic Readers */}
      {showTransliteration && !!ayah.transliteration && (
        <View style={styles.transliterationContainer}>
          <Text style={styles.transliterationLabel}>Transliteration:</Text>
          <Text style={[styles.transliterationText, { fontSize: Math.max(13, fontSize * 0.65) }]}>
            {ayah.transliteration}
          </Text>
        </View>
      )}

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
    paddingHorizontal: 4,
  },
  arabicText: {
    width: '100%',
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  transliterationContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  transliterationLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  transliterationText: {
    fontFamily: 'Poppins_400Regular',
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
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
