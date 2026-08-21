import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  BellRing,
  Smartphone,
  Play,
  AlertTriangle,
  Sunrise,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  Clock,
  Volume2,
  VolumeX,
  X,
  RotateCw,
} from "lucide-react-native";
import {
  AlarmSettings,
  DEFAULT_ALARM_SETTINGS,
  getAlarmSettings,
  OFFSET_OPTIONS,
  PRAYER_DISPLAY_NAMES,
  PRAYER_KEYS,
  PrayerKey,
  updateGlobalAlarmSetting,
  updatePrayerAlarmConfig,
} from "@/lib/alarm-settings";
import { refreshPrimaryMasjidNotifications, triggerPrayerAlarm } from "@/lib/notifications";

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryMasjidName?: string;
}

export const PrayerAlarmSettingsModal: React.FC<Props> = ({
  visible,
  onClose,
  primaryMasjidName,
}) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_ALARM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [hasExactAlarmPerm, setHasExactAlarmPerm] = useState<boolean>(true);
  const [checkingPerms, setCheckingPerms] = useState<boolean>(false);

  const loadSettingsAndPermissions = async () => {
    setLoading(true);
    setCheckingPerms(true);
    try {
      const data = await getAlarmSettings();
      setSettings(data);

      if (Platform.OS === "android") {
        const perms = await Notifications.getPermissionsAsync();
        const isGranted = perms.status === "granted";
        setHasExactAlarmPerm(isGranted);
      } else {
        setHasExactAlarmPerm(true);
      }
    } catch {
      setHasExactAlarmPerm(true);
    } finally {
      setLoading(false);
      setCheckingPerms(false);
    }
  };

  // Initial load and AppState listener so returning from System Settings refreshes status immediately
  useEffect(() => {
    if (!visible) return;

    void loadSettingsAndPermissions();

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        void loadSettingsAndPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  const handleToggleGlobal = async (val: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await updateGlobalAlarmSetting({ globalEnabled: val });
    setSettings(updated);
    void refreshPrimaryMasjidNotifications();
  };

  const handleToggleVibrate = async (val: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await updateGlobalAlarmSetting({ vibrate: val });
    setSettings(updated);
    void refreshPrimaryMasjidNotifications();
  };

  const handleTogglePrayer = async (prayer: PrayerKey, val: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await updatePrayerAlarmConfig(prayer, { enabled: val });
    setSettings(updated);
    void refreshPrimaryMasjidNotifications();
  };

  const handleSelectOffset = async (prayer: PrayerKey, offsetMinutes: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await updatePrayerAlarmConfig(prayer, { offsetMinutes });
    setSettings(updated);
    void refreshPrimaryMasjidNotifications();
  };

  const handleSelectSound = async (
    prayer: PrayerKey,
    sound: "azaan" | "default" | "silent"
  ) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await updatePrayerAlarmConfig(prayer, { sound });
    setSettings(updated);
    void refreshPrimaryMasjidNotifications();
  };

  const handleRequestOrOpenSettings = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status === "granted") {
        setHasExactAlarmPerm(true);
        void loadSettingsAndPermissions();
        return;
      }
    } catch (e) {
      console.log("Failed to request permissions directly:", e);
    }

    if (Platform.OS === "android") {
      try {
        void IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
          {
            extra: { "android.provider.extra.APP_PACKAGE": "com.huzaifa.salahtimes" },
          }
        );
      } catch {
        void IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          {
            data: "package:com.huzaifa.salahtimes",
          }
        );
      }
    }
  };

  const handleTestAzaan = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void triggerPrayerAlarm("Test Prayer", primaryMasjidName || "Primary Masjid");
  };

  const getPrayerIcon = (key: PrayerKey, color: string) => {
    switch (key) {
      case "fajr":
        return <Sunrise size={20} color={color} />;
      case "dhuhr":
        return <Sun size={20} color={color} />;
      case "asr":
        return <CloudSun size={20} color={color} />;
      case "maghrib":
        return <Sunset size={20} color={color} />;
      case "isha":
        return <Moon size={20} color={color} />;
      default:
        return <Sun size={20} color={color} />;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Bell size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Namaz Alarm Settings</Text>
              <Text style={styles.headerSubtitle}>
                Configure Azaan & reminders for each prayer
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Master Controls Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardRowLeft}>
                <View style={styles.iconCircle}>
                  <BellRing size={20} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardRowTitle}>Master Prayer Alarms</Text>
                  <Text style={styles.cardRowSubtitle}>
                    Enable or disable all Namaz alarms
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.globalEnabled}
                onValueChange={handleToggleGlobal}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.cardRow}>
              <View style={styles.cardRowLeft}>
                <View style={styles.iconCircle}>
                  <Smartphone size={20} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardRowTitle}>Alarm Vibration</Text>
                  <Text style={styles.cardRowSubtitle}>Vibrate phone when alarm triggers</Text>
                </View>
              </View>
              <Switch
                value={settings.vibrate}
                onValueChange={handleToggleVibrate}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.testButton} onPress={handleTestAzaan} activeOpacity={0.85}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Azaan Audio Alarm</Text>
            </TouchableOpacity>
          </View>

          {/* Android Exact Alarm / Notification Permission Warning Banner */}
          {Platform.OS === "android" && !hasExactAlarmPerm && (
            <View style={styles.warningBanner}>
              <View style={styles.warningIconWrap}>
                <AlertTriangle size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Notification Permission Needed</Text>
                <Text style={styles.warningText}>
                  To ensure exact Azaan alarms ring on time when the app is closed, please grant notification permissions in system settings.
                </Text>
                
                <View style={styles.warningActionRow}>
                  <TouchableOpacity style={styles.warningBtn} onPress={handleRequestOrOpenSettings}>
                    <Text style={styles.warningBtnText}>Grant / Open Settings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recheckBtn}
                    onPress={() => loadSettingsAndPermissions()}
                    disabled={checkingPerms}
                  >
                    <RotateCw size={14} color="#78350F" style={checkingPerms ? { opacity: 0.5 } : undefined} />
                    <Text style={styles.recheckBtnText}>
                      {checkingPerms ? "Checking..." : "Re-check"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Per-Prayer Settings */}
          <Text style={styles.sectionHeading}>INDIVIDUAL NAMAZ ALARMS</Text>

          {PRAYER_KEYS.map((prayerKey) => {
            const config = settings.prayers[prayerKey];
            const isEnabled = settings.globalEnabled && config.enabled;

            return (
              <View key={prayerKey} style={[styles.prayerCard, !isEnabled && styles.prayerCardDisabled]}>
                <View style={styles.prayerHeader}>
                  <View style={styles.prayerTitleWrap}>
                    <View style={[styles.prayerIconCircle, isEnabled && styles.prayerIconCircleActive]}>
                      {getPrayerIcon(prayerKey, isEnabled ? Colors.primary : Colors.textMuted)}
                    </View>
                    <Text style={[styles.prayerName, !isEnabled && styles.textDisabled]}>
                      {PRAYER_DISPLAY_NAMES[prayerKey]}
                    </Text>
                  </View>
                  <Switch
                    value={config.enabled}
                    disabled={!settings.globalEnabled}
                    onValueChange={(val) => handleTogglePrayer(prayerKey, val)}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {config.enabled && settings.globalEnabled && (
                  <View style={styles.prayerBody}>
                    <View style={styles.labelRow}>
                      <Clock size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                      <Text style={styles.label}>Reminder Timing Offset:</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                      {OFFSET_OPTIONS.map((opt) => {
                        const isSelected = config.offsetMinutes === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.pill, isSelected && styles.pillActive]}
                            onPress={() => handleSelectOffset(prayerKey, opt.value)}
                          >
                            <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={[styles.labelRow, { marginTop: 14 }]}>
                      <Volume2 size={13} color={Colors.textSecondary} style={{ marginRight: 5 }} />
                      <Text style={styles.label}>Alarm Ringtone Sound:</Text>
                    </View>

                    <View style={styles.soundRow}>
                      {[
                        { label: "Full Azaan", value: "azaan", icon: <Volume2 size={14} color={config.sound === "azaan" ? "#FFFFFF" : Colors.primary} /> },
                        { label: "System Bell", value: "default", icon: <Bell size={14} color={config.sound === "default" ? "#FFFFFF" : Colors.primary} /> },
                        { label: "Silent", value: "silent", icon: <VolumeX size={14} color={config.sound === "silent" ? "#FFFFFF" : Colors.textMuted} /> },
                      ].map((snd) => {
                        const isSelected = config.sound === snd.value;
                        return (
                          <TouchableOpacity
                            key={snd.value}
                            style={[styles.soundBtn, isSelected && styles.soundBtnActive]}
                            onPress={() => handleSelectSound(prayerKey, snd.value as any)}
                          >
                            {snd.icon}
                            <Text style={[styles.soundBtnText, isSelected && styles.soundBtnTextActive]}>
                              {snd.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRowTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  cardRowSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  testButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  testButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  warningBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  warningIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#92400E",
  },
  warningText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#78350F",
    marginTop: 3,
    lineHeight: 18,
  },
  warningActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  warningBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  warningBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  recheckBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  recheckBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#78350F",
  },
  sectionHeading: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  prayerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  prayerCardDisabled: {
    opacity: 0.6,
  },
  prayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prayerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerIconCircleActive: {
    backgroundColor: Colors.overlay,
  },
  prayerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  prayerBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pillsScroll: {
    flexDirection: "row",
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.text,
  },
  pillTextActive: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  soundRow: {
    flexDirection: "row",
    gap: 8,
  },
  soundBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  soundBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  soundBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.text,
  },
  soundBtnTextActive: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
});
