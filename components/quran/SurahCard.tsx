import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Surah } from '@/lib/quran/api';

interface SurahCardProps {
  surah: Surah;
  onPress: () => void;
  isRecent?: boolean;
}

const SurahCard: React.FC<SurahCardProps> = ({ surah, onPress, isRecent }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{surah.number}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.englishName}>{surah.englishName}</Text>
          {isRecent && (
            <Ionicons name="bookmark" size={14} color={Colors.accent} style={styles.bookmarkIcon} />
          )}
        </View>
        <Text style={styles.subInfo}>
          {surah.englishNameTranslation} ({surah.numberOfAyahs})
        </Text>
      </View>

      <View style={styles.arabicContainer}>
        <Text style={styles.arabicName}>{surah.name}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  englishName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 2,
  },
  bookmarkIcon: {
    marginLeft: 6,
  },
  subInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  arabicContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  arabicName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: '#1A2E1A',
  },
});

export default SurahCard;
