import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { HadithBook } from '@/lib/hadith/api';

interface HadithBookCardProps {
  book: HadithBook;
  onPress: () => void;
}

const HadithBookCard: React.FC<HadithBookCardProps> = ({ book, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name="library" size={24} color={Colors.primary} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{book.name}</Text>
        <Text style={styles.description} numberOfLines={1}>{book.description}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{book.count} Hadiths</Text>
        </View>
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#fff',
  },
});

export default HadithBookCard;
