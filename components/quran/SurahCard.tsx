import Colors from '@/constants/colors';
import { Surah } from '@/lib/quran/api';
import { Bookmark, Play } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SurahCardProps {
  surah: Surah;
  onPress: () => void;
  isRecent?: boolean;
}

const SurahCard: React.FC<SurahCardProps> = ({ surah, onPress, isRecent }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {/* Left 8-pointed scalloped star badge */}
      <View style={styles.numberBadgeWrap}>
        <Svg width={40} height={40} viewBox="0 0 36 40">
          <Path
            d="M18 2 L22 6 L27 4 L28 9 L33 11 L31 16 L35 20 L31 24 L33 29 L28 31 L27 36 L22 34 L18 38 L14 34 L9 36 L8 31 L3 29 L5 24 L1 20 L5 16 L3 11 L8 9 L9 4 L14 6 Z"
            fill="none"
            stroke={Colors.primary}
            strokeWidth="1.5"
          />
        </Svg>
        <Text style={styles.numberText}>{surah.number}</Text>
      </View>

      {/* Middle Surah Info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.englishName}>{surah.englishName}</Text>
          {isRecent && (
            <Bookmark size={14} color={Colors.accent} fill={Colors.accent} style={styles.bookmarkIcon} />
          )}
        </View>
        <Text style={styles.subInfo}>
          {surah.numberOfAyahs} verses • Page {surah.number}
        </Text>
      </View>

      {/* Right Arabic Calligraphy & Play Circle */}
      <View style={styles.rightContainer}>
        <Text style={styles.arabicName}>{surah.name}</Text>
        <TouchableOpacity style={styles.playButton} onPress={onPress}>
          <Play size={14} color={Colors.primary} fill={Colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  numberBadgeWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  numberText: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
    includeFontPadding: false,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mosqueIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  englishName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  bookmarkIcon: {
    marginLeft: 6,
  },
  subInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arabicName: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 18,
    color: Colors.primary,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});

export default SurahCard;
