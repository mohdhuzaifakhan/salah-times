import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Surah } from '@/lib/quran/api';

interface SurahCardProps {
  surah: Surah;
  onPress: () => void;
}

const SurahCard: React.FC<SurahCardProps> = ({ surah, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{surah.number}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.englishName}>{surah.englishName}</Text>
        <Text style={styles.subInfo}>
          {surah.revelationType} • {surah.numberOfAyahs} Ayahs
        </Text>
      </View>

      <View style={styles.arabicContainer}>
        <Text style={styles.arabicName}>{surah.name}</Text>
        <Text style={styles.translation}>{surah.englishNameTranslation}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  infoContainer: {
    flex: 1,
  },
  englishName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  subInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  arabicContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  arabicName: {
    fontFamily: 'Poppins_600SemiBold', // Fallback, system will handle Arabic
    fontSize: 20,
    color: Colors.primary,
    marginBottom: 2,
  },
  translation: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
  },
});

export default SurahCard;
