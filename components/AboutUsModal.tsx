import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface AboutUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutUsModal({ visible, onClose }: AboutUsModalProps) {
  const insets = useSafeAreaInsets();

  const handleOpenLink = (url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open link:", err);
    });
  };

  const teamMembers = [
    {
      name: 'Mohd Huzaifa',
      role: 'Founder',
      icon: 'code-slash-outline',
      qualification: 'B.Tech in Computer Science & M.Tech in CS & AI/ML from Jamia Millia Islamia University, Delhi',
      expertise: 'Software Engineer with expertise in Software Engineering and Artificial Intelligence.',
    },
    {
      name: 'Mohd Suhail',
      role: 'Co-Founder',
      icon: 'calculator-outline',
      qualification: 'B.A in English (Honors)',
      expertise: 'GST & Tax Filing Specialist, working on GST and Accounting.',
    },
    {
      name: 'Sadaqat Ali',
      role: 'Sales Executive & Product Researcher',
      icon: 'analytics-outline',
      qualification: 'B.A in Political Science',
      expertise: 'Expert in Data Analytics and Marketing Research.',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
              <Text style={styles.headerTitle}>About Us</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Company Badge Header */}
            <View style={styles.companyBadgeCard}>
              <Text style={styles.appName}>Salah Times</Text>
              <View style={styles.companyTag}>
                <Ionicons name="cube-outline" size={16} color={Colors.accent} />
                <Text style={styles.companyTagText}>Built under UnifiedStack</Text>
              </View>
              <Text style={styles.appDescription}>
                A modern, accurate Islamic companion for prayer timetables, Quran, Hadith, and community announcements.
              </Text>
            </View>

            {/* Quick Contact & Social Links */}
            <Text style={styles.sectionHeader}>Connect with UnifiedStack</Text>
            
            <View style={styles.linksGrid}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink('https://unifiedstack.vercel.app/')}
              >
                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                <Text style={styles.linkButtonText}>Website</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textMuted} style={styles.linkArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink('tel:8433043426')}
              >
                <Ionicons name="call-outline" size={20} color="#27AE60" />
                <Text style={styles.linkButtonText}>8433043426</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink('https://www.instagram.com/unifiedstack?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==')}
              >
                <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                <Text style={styles.linkButtonText}>Instagram</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textMuted} style={styles.linkArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink('https://www.facebook.com/profile.php?id=61592602577601&rdid=5RfwM5czeqJ6cdjP&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19Gnxgke9Q%2F#')}
              >
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                <Text style={styles.linkButtonText}>Facebook</Text>
                <Ionicons name="open-outline" size={14} color={Colors.textMuted} style={styles.linkArrow} />
              </TouchableOpacity>
            </View>

            {/* Leadership & Team Section */}
            <Text style={styles.sectionHeader}>Leadership & Team</Text>
            
            {teamMembers.map((member, index) => (
              <View key={index} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name={member.icon as any} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.memberTitleBox}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>{member.role}</Text>
                  </View>
                </View>

                <View style={styles.memberInfoRow}>
                  <Text style={styles.infoLabel}>Qualification:</Text>
                  <Text style={styles.infoValue}>{member.qualification}</Text>
                </View>

                <View style={styles.memberInfoRow}>
                  <Text style={styles.infoLabel}>Expertise:</Text>
                  <Text style={styles.infoValue}>{member.expertise}</Text>
                </View>
              </View>
            ))}

            <View style={styles.footerSpace} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  scrollContent: {
    marginTop: 16,
  },
  companyBadgeCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.primary,
  },
  companyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  companyTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  appDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  sectionHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    flexGrow: 1,
    minWidth: '45%',
  },
  linkButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  linkArrow: {
    marginLeft: 'auto',
  },
  memberCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberTitleBox: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  memberRole: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
  },
  memberInfoRow: {
    marginTop: 6,
  },
  infoLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  footerSpace: {
    height: 20,
  },
});
