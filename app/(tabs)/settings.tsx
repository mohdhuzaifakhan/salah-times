import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, SafeAreaView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useQuran } from '@/lib/quran/context';
import { useHadith } from '@/lib/hadith/context';
import { useLanguage } from '@/lib/language-context';
import { Language } from '@/lib/translations';
import { auth } from '@/lib/firebaseConfig';
import { signOut } from 'firebase/auth';
import { getPrimaryMasjidId, getMasjidById, savePrimaryMasjidId } from '@/lib/store';
import { clearScheduledNotifications } from '@/lib/notifications';

export default function SettingsScreen() {
  const { preferences: quranPrefs, updatePreferences: updateQuranPrefs } = useQuran();
  const { preferences: hadithPrefs, updatePreferences: updateHadithPrefs } = useHadith();
  const { language, setLanguage, t } = useLanguage();

  const [primaryMasjidName, setPrimaryMasjidName] = useState<string | null>(null);
  const [primaryMasjidId, setPrimaryMasjidId] = useState<string | null>(null);

  const loadPrimaryMasjid = useCallback(async () => {
    try {
      const id = await getPrimaryMasjidId();
      setPrimaryMasjidId(id);
      if (id) {
        const msjd = await getMasjidById(id);
        setPrimaryMasjidName(msjd ? msjd.name : "Unknown Masjid");
      } else {
        setPrimaryMasjidName(null);
      }
    } catch (error) {
      console.error("Failed to load settings primary masjid:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrimaryMasjid();
    }, [loadPrimaryMasjid])
  );

  const handleUnlinkPrimary = async () => {
    Alert.alert(
      "Unlink Primary Masjid",
      "Are you sure you want to remove your primary masjid? You will no longer see its quick access dashboard on the Home tab.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await savePrimaryMasjidId(null);
            setPrimaryMasjidId(null);
            setPrimaryMasjidName(null);
            await clearScheduledNotifications();
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      t('about_us'),
      'Salah Time App v1.0.0\n\nA comprehensive Islamic companion for prayer times, Quran, and Hadith.\n\nDeveloped with ❤️ for the Ummah.',
      [{ text: 'OK' }]
    );
  };

  const handleRate = () => {
    Alert.alert(
      t('rate_app'),
      'Redirecting to Store...',
      [{ text: 'OK' }]
    );
  };

  const handleNotifications = () => {
    Alert.alert(
      t('notifications'),
      'Notification settings are currently managed globally. You will receive alerts for all prayer times.',
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({ icon, title, subtitle, rightElement, onPress }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quran')}</Text>
          
          <SettingItem 
            icon="text-outline"
            title="Arabic Font Size"
            subtitle={`${quranPrefs.fontSize}px`}
            rightElement={
              <View style={styles.fontControls}>
                <TouchableOpacity 
                  onPress={() => updateQuranPrefs({ fontSize: Math.max(16, quranPrefs.fontSize - 2) })}
                  style={styles.controlButton}
                >
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => updateQuranPrefs({ fontSize: Math.min(48, quranPrefs.fontSize + 2) })}
                  style={styles.controlButton}
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            }
          />

          <SettingItem 
            icon="language-outline"
            title={t('quran_translation')}
            subtitle={quranPrefs.translationLanguage === 'en.sahih' ? 'English' : quranPrefs.translationLanguage === 'hi.farooq' ? 'Hindi' : 'Urdu'}
            rightElement={
              <View style={styles.langContainerSmall}>
                {['en.sahih', 'hi.farooq', 'ur.maududi'].map((ed) => (
                  <TouchableOpacity
                    key={ed}
                    style={[styles.langBtnSmall, quranPrefs.translationLanguage === ed && styles.langBtnSmallActive]}
                    onPress={() => updateQuranPrefs({ translationLanguage: ed })}
                  >
                    <Text style={[styles.langBtnSmallText, quranPrefs.translationLanguage === ed && styles.langBtnSmallTextActive]}>
                      {ed.split('.')[0].toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('hadith')}</Text>
          
          <SettingItem 
            icon="text-outline"
            title="Text Size"
            subtitle={`${hadithPrefs.fontSize}px`}
            rightElement={
              <View style={styles.fontControls}>
                <TouchableOpacity 
                  onPress={() => updateHadithPrefs({ fontSize: Math.max(12, hadithPrefs.fontSize - 2) })}
                  style={styles.controlButton}
                >
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => updateHadithPrefs({ fontSize: Math.min(32, hadithPrefs.fontSize + 2) })}
                  style={styles.controlButton}
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            }
          />

          <SettingItem 
            icon="eye-outline"
            title={t('show_arabic')}
            rightElement={
              <Switch 
                value={hadithPrefs.showArabic}
                onValueChange={(val) => updateHadithPrefs({ showArabic: val })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            }
          />

          <SettingItem 
            icon="language-outline"
            title={t('hadith_translation')}
            subtitle={hadithPrefs.language.toUpperCase()}
            rightElement={
              <View style={styles.langContainerSmall}>
                {['eng', 'hin', 'urd'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langBtnSmall, hadithPrefs.language === lang && styles.langBtnSmallActive]}
                    onPress={() => updateHadithPrefs({ language: lang as any })}
                  >
                    <Text style={[styles.langBtnSmallText, hadithPrefs.language === lang && styles.langBtnSmallTextActive]}>
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('app_section')}</Text>
          <SettingItem 
            icon="star-outline"
            title="Primary Masjid"
            subtitle={primaryMasjidName || "None (Select from Explore)"}
            onPress={primaryMasjidId ? handleUnlinkPrimary : undefined}
            rightElement={
              primaryMasjidId ? (
                <TouchableOpacity onPress={handleUnlinkPrimary} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              )
            }
          />
          <SettingItem 
            icon="notifications-outline"
            title={t('notifications')}
            subtitle="Manage prayer alerts"
            onPress={handleNotifications}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem 
            icon="color-palette-outline"
            title={t('appearance')}
            subtitle="Light Mode"
            onPress={() => Alert.alert(t('appearance'), 'Dark mode coming soon!')}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <View style={styles.langContainer}>
            {(['en', 'hi', 'ur'] as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langButton,
                  language === lang && styles.langButtonActive
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[
                  styles.langButtonText,
                  language === lang && styles.langButtonTextActive
                ]}>
                  {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'اردو'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support_section')}</Text>
          <SettingItem 
            icon="heart-outline"
            title={t('about_us')}
            onPress={handleAbout}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem 
            icon="star-outline"
            title={t('rate_app')}
            onPress={handleRate}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
        </View>

        {auth.currentUser && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FF4444" />
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  settingSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  langButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  langButtonTextActive: {
    color: '#fff',
  },
  langContainerSmall: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  langBtnSmallActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langBtnSmallText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: Colors.textSecondary,
  },
  langBtnSmallTextActive: {
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F1',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    gap: 10,
  },
  logoutText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FF4444',
  },
});
