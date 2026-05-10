import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Ayah } from '@/lib/quran/api';
import * as Clipboard from 'expo-clipboard';

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
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{ayah.numberInSurah}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity onPress={onPlay} style={styles.actionButton}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={20} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onBookmark} style={styles.actionButton}>
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isBookmarked ? Colors.accent : Colors.textMuted} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
            <Ionicons name="copy-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={[styles.arabicText, { fontSize: fontSize * 1.2 }]}>
        {ayah.text}
      </Text>
      
      {showTranslation && (
        <Text style={[styles.translationText, { fontSize: fontSize * 0.7 }]}>
          {ayah.translation}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
  },
  arabicText: {
    textAlign: 'right',
    color: Colors.text,
    lineHeight: 50,
    marginBottom: 16,
    // Add specific Arabic font if loaded
  },
  translationText: {
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});

export default AyahItem;
