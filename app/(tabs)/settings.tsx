import { AboutUsModal } from '@/components/AboutUsModal';
import { PremiumBannerAd } from '@/components/ads/PremiumBannerAd';
import AppUpdateModal from '@/components/AppUpdateModal';
import { ContactUsModal } from '@/components/ContactUsModal';
import { PrayerAlarmSettingsModal } from '@/components/PrayerAlarmSettingsModal';
import { ShareAppModal } from '@/components/ShareAppModal';
import Colors from '@/constants/colors';
import { showCustomAlert } from '@/lib/custom-alert';
import { auth } from '@/lib/firebaseConfig';
import { useHadith } from '@/lib/hadith/context';
import { useLanguage } from '@/lib/language-context';
import { useLocation } from '@/lib/location-context';
import { usePrimaryMasjid } from '@/lib/primary-masjid-context';
import { useQuran } from '@/lib/quran/context';
import { Language } from '@/lib/translations';
import { AppUpdateConfig, compareVersions, CURRENT_VERSION, fetchAppUpdateConfig } from '@/lib/updates';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { signOut } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { preferences: quranPrefs, updatePreferences: updateQuranPrefs } = useQuran();
  const { preferences: hadithPrefs, updatePreferences: updateHadithPrefs } = useHadith();
  const { language, setLanguage, t } = useLanguage();
  const { primaryMasjid, openSelectModal } = usePrimaryMasjid();
  const { selectedCity, selectedState, openLocationModal } = useLocation();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [alarmSettingsModalVisible, setAlarmSettingsModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [updateModalState, setUpdateModalState] = useState<{
    visible: boolean;
    config: AppUpdateConfig | null;
    isForced: boolean;
  }>({
    visible: false,
    config: null,
    isForced: false,
  });

  const handleManualUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Force fetch latest real data directly from Firestore server to bypass stale cache
      const config = await fetchAppUpdateConfig(true);
      if (!config.enabled) {
        showCustomAlert("Updates Disabled", "App update checks are currently disabled by server configuration.");
        return;
      }

      const isForced = compareVersions(CURRENT_VERSION, config.minVersion) < 0;
      const updateAvailable = compareVersions(CURRENT_VERSION, config.latestVersion) < 0;

      if (updateAvailable || isForced) {
        setUpdateModalState({
          visible: true,
          config,
          isForced,
        });
      } else {
        showCustomAlert(
          "Up to Date",
          `Salah Times is up to date!\n\nCurrent version: v${CURRENT_VERSION}\nLatest server release: v${config.latestVersion}`
        );
      }
    } catch (error) {
      console.error("Manual update check failed:", error);
      showCustomAlert("Check Failed", "Unable to check for updates at this time. Please check your network connection.");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    showCustomAlert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) }
      ]
    );
  };

  const handleAbout = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAboutModalVisible(true);
  };

  const handleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const storeUrl = 'https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes';
    Linking.openURL(storeUrl).catch((err) => {
      console.error("Failed to open rating store URL:", err);
      showCustomAlert("Error", "Could not open App Store link.");
    });
  };

  const handleShareApp = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareModalVisible(true);
  };

  const handleNotifications = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAlarmSettingsModalVisible(true);
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
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings')}</Text>
        </View>

        {/* <View style={styles.section}>
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
        </View> */}

        {/* <View style={styles.section}>
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
        </View> */}

        {/* 1. Namaz & Masjid Settings */}
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title={t('alarm_settings')}
            subtitle="Manage prayer alerts & Azaan sound"
            onPress={handleNotifications}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem
            icon="star-outline"
            title="Primary Masjid"
            subtitle={primaryMasjid ? primaryMasjid.name : "Select Primary Masjid"}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openSelectModal();
            }}
            rightElement={
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            }
          />
          <SettingItem
            icon="location-outline"
            title="App Location"
            subtitle={selectedCity ? `${selectedCity}, ${selectedState || ""}` : "Not Selected"}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openLocationModal();
            }}
            rightElement={
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            }
          />
        </View>

        {/* 2. Support & About Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support_section')}</Text>
          <SettingItem
            icon="mail-outline"
            title={t('contact_us')}
            subtitle="Report issues or send feedback"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setContactModalVisible(true);
            }}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem
            icon="information-circle-outline"
            title={t('about_us')}
            subtitle={`Version ${CURRENT_VERSION}`}
            onPress={handleAbout}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem
            icon="heart-outline"
            title={t('rate_app')}
            subtitle="Support us on Play Store"
            onPress={handleRate}
            rightElement={<Ionicons name="open-outline" size={20} color={Colors.textMuted} />}
          />
          <SettingItem
            icon="share-social-outline"
            title={t('share_app')}
            subtitle="Share with family & friends"
            onPress={handleShareApp}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
        </View>

        {/* 3. Preferences & App Updates */}
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
          <SettingItem
            icon="color-palette-outline"
            title={t('appearance')}
            subtitle="Light Mode"
            onPress={() => showCustomAlert(t('appearance'), 'Dark mode coming soon!')}
            rightElement={<Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          />
          <SettingItem
            icon="cloud-download-outline"
            title="Check for Updates"
            subtitle={`v${CURRENT_VERSION} • Tap to check for updates`}
            onPress={handleManualUpdateCheck}
            rightElement={
              checkingUpdate ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              )
            }
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
      <PrayerAlarmSettingsModal
        visible={alarmSettingsModalVisible}
        onClose={() => setAlarmSettingsModalVisible(false)}
        primaryMasjidName={primaryMasjid?.name}
      />
      <ContactUsModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
      />
      <ShareAppModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
      <AboutUsModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
      />
      {updateModalState.config && (
        <AppUpdateModal
          visible={updateModalState.visible}
          config={updateModalState.config}
          isForced={updateModalState.isForced}
          onClose={() => setUpdateModalState(prev => ({ ...prev, visible: false }))}
        />
      )}
      <PremiumBannerAd inTabBar={true} />
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
