import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

interface HadithItemProps {
  hadith: any;
  bookName: string;
  isBookmarked: boolean;
  onBookmark: () => void;
  fontSize: number;
  showArabic: boolean;
}

const HadithItem: React.FC<HadithItemProps> = ({ 
  hadith, 
  bookName,
  isBookmarked, 
  onBookmark,
  fontSize,
  showArabic
}) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(
      `${showArabic ? hadith.arabicText + '\n\n' : ''}${hadith.text}\n\n[${bookName} ${hadith.hadithnumber}]`
    );
  };

  const handleShare = async () => {
    await Share.share({
      message: `${showArabic ? hadith.arabicText + '\n\n' : ''}${hadith.text}\n\n[${bookName} ${hadith.hadithnumber}]`,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{hadith.hadithnumber}</Text>
        </View>
        
        <View style={styles.actions}>
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

      {showArabic && hadith.arabicText && (
        <Text style={[styles.arabicText, { fontSize: fontSize * 1.3 }]}>
          {hadith.arabicText}
        </Text>
      )}
      
      <Text style={[styles.englishText, { fontSize: fontSize }]}>
        {hadith.text}
      </Text>

      {hadith.grades && (
        <View style={styles.gradesContainer}>
          {hadith.grades.map((g: any, i: number) => (
            <View key={i} style={styles.gradeBadge}>
              <Text style={styles.gradeLabel}>{g.name}: </Text>
              <Text style={[styles.gradeValue, { color: g.grade.toLowerCase() === 'sahih' ? Colors.success : Colors.accent }]}>
                {g.grade}
              </Text>
            </View>
          ))}
        </View>
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
    width: 40,
    height: 32,
    borderRadius: 8,
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
    fontFamily: 'Amiri_400Regular',
    textAlign: 'right',
    color: Colors.text,
    lineHeight: 48,
    marginBottom: 20,
  },
  englishText: {
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    lineHeight: 28,
  },
  gradesContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  gradeValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
});

export default HadithItem;
