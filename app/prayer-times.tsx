import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { useLocation } from "@/lib/location-context";
import { useAuth } from "@/lib/auth-context";
import { usePrayerCountdown } from "@/lib/prayer-timer";
import { calculateSolarPrayerTimes, getCoordsForCity } from "@/lib/prayer-calculation";
import {
  getAlarmSettings,
  updatePrayerAlarmConfig,
  AlarmSettings,
  PrayerKey,
} from "@/lib/alarm-settings";
import { refreshPrimaryMasjidNotifications } from "@/lib/notifications";
import { showCustomAlert } from "@/lib/custom-alert";
import { Timetable } from "@/lib/types";

// Helper: Format 24-hour database time string into readable 12-hour AM/PM format
function formatDisplayTime(timeStr?: string): string {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const parts = timeStr.trim().split(":");
  const hour = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function PrayerTimesDetailScreen() {
  const insets = useSafeAreaInsets();
  const {
    primaryMasjid,
    isLoading: isMasjidLoading,
    openSelectModal,
    refreshPrimaryMasjid,
  } = usePrimaryMasjid();
  const { selectedCity } = useLocation();
  const { admin } = useAuth();

  const cityCoords = useMemo(
    () => getCoordsForCity(primaryMasjid?.city || selectedCity),
    [primaryMasjid?.city, selectedCity]
  );
  const solarTimes = useMemo(() => calculateSolarPrayerTimes(new Date(), cityCoords), [cityCoords]);

  const [refreshing, setRefreshing] = useState(false);
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings | null>(null);

  // Load alarm notification preferences from storage
  const loadAlarmConfig = useCallback(async () => {
    try {
      const settings = await getAlarmSettings();
      setAlarmSettings(settings);
    } catch (err) {
      console.error("Error loading alarm settings:", err);
    }
  }, []);

  useEffect(() => {
    loadAlarmConfig();
  }, [loadAlarmConfig]);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshPrimaryMasjid();
      await loadAlarmConfig();
    } catch (err) {
      console.error("Failed to refresh prayer data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle notification/alarm sound for a specific prayer
  const toggleSound = async (prayerKey: PrayerKey) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!alarmSettings) return;

    const currentEnabled = alarmSettings.prayers[prayerKey]?.enabled ?? true;
    const newEnabled = !currentEnabled;

    try {
      const updated = await updatePrayerAlarmConfig(prayerKey, { enabled: newEnabled });
      setAlarmSettings(updated);
      await refreshPrimaryMasjidNotifications();
    } catch (err) {
      console.error("Failed to toggle prayer notification:", err);
    }
  };

  // Check if current user is admin of the selected masjid
  const isMasjidAdmin =
    !!admin &&
    (admin.role === "super_admin" ||
      (admin.role === "masjid_admin" &&
        (!admin.masjidId || admin.masjidId === primaryMasjid?.id)));

  // Current masjid timetable (strictly dynamic from primaryMasjid)
  const timetable: Timetable | null = primaryMasjid?.timetable || null;
  const countdown = usePrayerCountdown(timetable);

  // Check if today is Friday (Jummah day)
  const isFriday = new Date().getDay() === 5;

  // Build the 5 core prayers (plus Jummah)
  const prayers = [
    {
      key: "fajr" as PrayerKey,
      name: "Fajr",
      time: timetable?.fajr || "",
      icon: "sunny-outline" as const,
      iconColor: "#D4A843",
    },
    {
      key: "dhuhr" as PrayerKey,
      name: isFriday ? "Jummah / Dhuhr" : "Dhuhr",
      time: isFriday && timetable?.jummah ? timetable.jummah : timetable?.dhuhr || "",
      icon: isFriday ? ("people-outline" as const) : ("sunny" as const),
      iconColor: "#F39C12",
    },
    {
      key: "asr" as PrayerKey,
      name: "Asr",
      time: timetable?.asr || "",
      icon: "partly-sunny-outline" as const,
      iconColor: "#14A3A8",
    },
    {
      key: "maghrib" as PrayerKey,
      name: "Maghrib",
      time: timetable?.maghrib || "",
      icon: "cloudy-night-outline" as const,
      iconColor: "#C0392B",
    },
    {
      key: "isha" as PrayerKey,
      name: "Isha",
      time: timetable?.isha || "",
      icon: "moon-outline" as const,
      iconColor: "#2980B9",
    },
  ];

  // Additional Jummah card if not Friday but Jummah time exists
  const hasDistinctJummah = !isFriday && !!timetable?.jummah;

  // Ramadan timings (only if present in timetable)
  const hasRamadanTimings =
    !!timetable &&
    (!!timetable.sehri || !!timetable.iftar || !!timetable.taraweeh);

  // Additional timings (only if present in timetable)
  const hasAdditionalTimings =
    !!timetable &&
    (!!timetable.sunrise ||
      !!timetable.ishraq ||
      !!timetable.chasht ||
      !!timetable.zawal ||
      !!timetable.tahajjud);

  // Navigation handlers
  const handleReportIncorrectTime = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!primaryMasjid) {
      showCustomAlert(
        "Select Primary Masjid",
        "Please select a primary masjid before submitting a correction report.",
        [{ text: "Select Now", onPress: openSelectModal }, { text: "Cancel", style: "cancel" }]
      );
      return;
    }

    router.push({
      pathname: "/report-masjid-time",
      params: {
        masjidId: primaryMasjid.id,
        masjidName: primaryMasjid.name,
      },
    });
  };

  const handleEditTimetable = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!primaryMasjid) {
      showCustomAlert("No Masjid Selected", "Please select a primary masjid first.");
      return;
    }

    router.push({
      pathname: "/edit-timetable",
      params: {
        masjidId: primaryMasjid.id,
      },
    });
  };

  const handleAdminLogin = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Screen Top Header */}
      <View style={styles.header}>
        {router.canGoBack() ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIconWrap}>
            <Ionicons name="time-outline" size={22} color={Colors.primary} />
          </View>
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Prayer Times</Text>
          {primaryMasjid?.name && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {primaryMasjid.name}
            </Text>
          )}
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openSelectModal();
            }}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Switch Masjid"
          >
            <Ionicons name="business-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top Trilingual "Report Incorrect Time" Button / Card (Hindi, Urdu, English) */}
        <TouchableOpacity
          style={styles.topReportCard}
          onPress={handleReportIncorrectTime}
          activeOpacity={0.82}
          accessibilityLabel="Report Incorrect Prayer Time"
        >
          <View style={styles.topReportLeft}>
            <View style={styles.topReportIconWrap}>
              <Ionicons name="flag" size={18} color="#D97706" />
            </View>
            <View style={styles.topReportTextCol}>
              <View style={styles.topReportTitleRow}>
                <Text style={styles.topReportTitleEn}>Report Incorrect Time</Text>
                <View style={styles.topReportBadge}>
                  <Text style={styles.topReportBadgeText}>Correction</Text>
                </View>
              </View>

              {/* Multi-language subtitle: Hindi and Urdu */}
              <View style={styles.topReportLangRow}>
                <Text style={styles.topReportLangHi}>गलत समय की रिपोर्ट करें</Text>
                <Text style={styles.topReportLangDot}>•</Text>
                <Text style={styles.topReportLangUr}>نماز کا غلط وقت بتائیں</Text>
              </View>
            </View>
          </View>

          <View style={styles.topReportActionPill}>
            <Text style={styles.topReportActionText}>Report</Text>
            <Ionicons name="chevron-forward" size={13} color="#B45309" />
          </View>
        </TouchableOpacity>

        {/* Dynamic Next Prayer Countdown Banner */}
        {primaryMasjid && (
          <View style={styles.heroCountdownCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroNextBadge}>
                <Ionicons name="time" size={13} color="#E0F2F1" />
                <Text style={styles.heroNextBadgeText}>NEXT PRAYER</Text>
              </View>

              <View style={styles.heroTimerBadge}>
                <Ionicons name="timer-outline" size={13} color="#FFFFFF" />
                <Text style={styles.heroTimerBadgeText}>
                  {countdown.isNow ? "PRAYER TIME NOW" : `in ${countdown.formattedRemaining}`}
                </Text>
              </View>
            </View>

            <View style={styles.heroBottomRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.heroPrayerName}>
                  {countdown.nextPrayerName || "Next Prayer"}
                </Text>
                <Text style={styles.heroMasjidLabel} numberOfLines={1}>
                  {primaryMasjid.name}
                </Text>
              </View>

              <View style={styles.heroTimeWrap}>
                <Text style={styles.heroPrayerTime}>
                  {countdown.nextPrayerTimeFormatted}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 5 Daily Prayers Timetable List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Prayer Timetable</Text>
          <Text style={styles.sectionMetaText}>Azan & Jama'at</Text>
        </View>

        <View style={styles.prayerListContainer}>
          {prayers.map((prayer) => {
            const isNext = countdown.nextPrayerKey === prayer.key;
            const isMuted = alarmSettings?.prayers[prayer.key]?.enabled === false;
            const formattedTime = formatDisplayTime(prayer.time);

            return (
              <View
                key={prayer.key}
                style={[
                  styles.prayerRowCard,
                  isNext && styles.prayerRowCardActive,
                ]}
              >
                <View style={styles.prayerLeftWrap}>
                  <View
                    style={[
                      styles.prayerIconBox,
                      isNext && styles.prayerIconBoxActive,
                    ]}
                  >
                    <Ionicons
                      name={prayer.icon}
                      size={20}
                      color={isNext ? Colors.primary : prayer.iconColor}
                    />
                  </View>

                  <View>
                    <View style={styles.prayerNameRow}>
                      <Text
                        style={[
                          styles.prayerNameText,
                          isNext && styles.prayerNameTextActive,
                        ]}
                      >
                        {prayer.name}
                      </Text>
                      {isNext && (
                        <View style={styles.activeTag}>
                          <Text style={styles.activeTagText}>Upcoming</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.prayerRightWrap}>
                  <Text
                    style={[
                      styles.prayerTimeText,
                      isNext && styles.prayerTimeTextActive,
                    ]}
                  >
                    {formattedTime}
                  </Text>

                  <TouchableOpacity
                    onPress={() => toggleSound(prayer.key)}
                    style={styles.soundBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={isMuted ? "Unmute prayer reminder" : "Mute prayer reminder"}
                  >
                    <Ionicons
                      name={isMuted ? "notifications-off-outline" : "notifications-outline"}
                      size={18}
                      color={isMuted ? "#94A3B8" : isNext ? Colors.primary : "#0D7377"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Distinct Jummah Row if configured separately on non-Friday */}
          {hasDistinctJummah && (
            <View style={styles.prayerRowCard}>
              <View style={styles.prayerLeftWrap}>
                <View style={styles.prayerIconBox}>
                  <Ionicons name="people-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.prayerNameText}>Jummah (Friday)</Text>
              </View>

              <View style={styles.prayerRightWrap}>
                <Text style={styles.prayerTimeText}>
                  {formatDisplayTime(timetable?.jummah)}
                </Text>
                <View style={{ width: 28 }} />
              </View>
            </View>
          )}
        </View>

        {/* Sunnah & Additional Timings (Always displayed) */}
        <View style={styles.extraTimesCard}>
          <View style={styles.extraTimesHeader}>
            <View style={styles.extraHeaderLeft}>
              <View style={styles.extraIconWrapAmber}>
                <Ionicons name="sunny" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.extraTimesTitle}>Sunnah & Additional Timings</Text>
                <Text style={styles.extraTimesSubtitle}>سنن و نوافل • Daily optional prayer times</Text>
              </View>
            </View>

            {isMasjidAdmin ? (
              <TouchableOpacity
                style={styles.editSectionBtn}
                onPress={handleEditTimetable}
                activeOpacity={0.8}
                accessibilityLabel="Edit Sunnah timings"
              >
                <Ionicons name="create-outline" size={13} color="#0D7377" />
                <Text style={styles.editSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.extraHeaderBadgeAmber}>
                <Text style={styles.extraHeaderBadgeTextAmber}>Sunnah</Text>
              </View>
            )}
          </View>

          <View style={styles.extraTimesGrid}>
            <View style={styles.gridTimeItem}>
              <View style={styles.gridTimeIconRow}>
                <Ionicons name="sunny-outline" size={15} color="#D97706" />
                <Text style={styles.gridTimeLabel}>Sunrise (طلوع)</Text>
              </View>
              <Text style={styles.gridTimeVal}>
                {timetable?.sunrise ? formatDisplayTime(timetable.sunrise) : "--:--"}
              </Text>
            </View>

            <View style={styles.gridTimeItem}>
              <View style={styles.gridTimeIconRow}>
                <Ionicons name="partly-sunny-outline" size={15} color="#14A3A8" />
                <Text style={styles.gridTimeLabel}>Ishraq (اشراق)</Text>
              </View>
              <Text style={styles.gridTimeVal}>
                {timetable?.ishraq ? formatDisplayTime(timetable.ishraq) : "--:--"}
              </Text>
            </View>

            <View style={styles.gridTimeItem}>
              <View style={styles.gridTimeIconRow}>
                <Ionicons name="sunny" size={15} color="#F39C12" />
                <Text style={styles.gridTimeLabel}>Chasht / Duha (چاشت)</Text>
              </View>
              <Text style={styles.gridTimeVal}>
                {timetable?.chasht ? formatDisplayTime(timetable.chasht) : "--:--"}
              </Text>
            </View>

            <View style={styles.gridTimeItem}>
              <View style={styles.gridTimeIconRow}>
                <Ionicons name="alert-circle-outline" size={15} color="#E53E3E" />
                <Text style={styles.gridTimeLabel}>Zawal (زوال)</Text>
              </View>
              <Text style={styles.gridTimeVal}>
                {timetable?.zawal ? formatDisplayTime(timetable.zawal) : "--:--"}
              </Text>
            </View>

            <View style={[styles.gridTimeItem, { minWidth: "100%" }]}>
              <View style={styles.gridTimeIconRow}>
                <Ionicons name="moon-outline" size={15} color="#2980B9" />
                <Text style={styles.gridTimeLabel}>Tahajjud (تہجد)</Text>
              </View>
              <Text style={styles.gridTimeVal}>
                {timetable?.tahajjud ? formatDisplayTime(timetable.tahajjud) : "--:--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Ramadan Timings (Always displayed) */}
        <View style={styles.extraTimesCard}>
          <View style={styles.extraTimesHeader}>
            <View style={styles.extraHeaderLeft}>
              <View style={styles.extraIconWrapTeal}>
                <Ionicons name="moon" size={16} color="#0D7377" />
              </View>
              <View>
                <Text style={styles.extraTimesTitle}>Ramadan Timings</Text>
                <Text style={styles.extraTimesSubtitle}>رمضان المبارک • Fasting & Taraweeh</Text>
              </View>
            </View>

            {isMasjidAdmin ? (
              <TouchableOpacity
                style={styles.editSectionBtn}
                onPress={handleEditTimetable}
                activeOpacity={0.8}
                accessibilityLabel="Edit Ramadan timings"
              >
                <Ionicons name="create-outline" size={13} color="#0D7377" />
                <Text style={styles.editSectionBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.extraHeaderBadge}>
                <Text style={styles.extraHeaderBadgeText}>Ramadan</Text>
              </View>
            )}
          </View>

          <View style={styles.extraTimesRow}>
            <View style={styles.extraTimeCol}>
              <Ionicons name="alarm-outline" size={18} color="#0D7377" style={{ marginBottom: 4 }} />
              <Text style={styles.extraTimeLabel}>Sehri Ends</Text>
              <Text style={styles.extraTimeSub}>سحری</Text>
              <Text style={styles.extraTimeVal}>
                {timetable?.sehri ? formatDisplayTime(timetable.sehri) : (solarTimes?.sehri ? formatDisplayTime(solarTimes.sehri) : "04:45 AM")}
              </Text>
            </View>

            <View style={styles.extraColDivider} />

            <View style={styles.extraTimeCol}>
              <Ionicons name="restaurant-outline" size={18} color="#D97706" style={{ marginBottom: 4 }} />
              <Text style={styles.extraTimeLabel}>Iftar Time</Text>
              <Text style={styles.extraTimeSub}>افطار</Text>
              <Text style={styles.extraTimeVal}>
                {timetable?.iftar ? formatDisplayTime(timetable.iftar) : (timetable?.maghrib ? formatDisplayTime(timetable.maghrib) : (solarTimes?.iftar ? formatDisplayTime(solarTimes.iftar) : "06:35 PM"))}
              </Text>
            </View>

            <View style={styles.extraColDivider} />

            <View style={styles.extraTimeCol}>
              <Ionicons name="book-outline" size={18} color="#2980B9" style={{ marginBottom: 4 }} />
              <Text style={styles.extraTimeLabel}>Taraweeh</Text>
              <Text style={styles.extraTimeSub}>تراویح</Text>
              <Text style={styles.extraTimeVal}>
                {timetable?.taraweeh ? formatDisplayTime(timetable.taraweeh) : "--:--"}
              </Text>
            </View>
          </View>

          {/* Quick link to Fasting Hub */}
          <TouchableOpacity
            style={styles.fastingHubBtn}
            onPress={() => router.push("/fasting")}
            activeOpacity={0.8}
          >
            <View style={styles.fastingHubBtnLeft}>
              <Ionicons name="moon" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.fastingHubBtnText}>Fasting Hub, Duas & Tracker</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Improved Masjid Admin Section & Much Better Login Button */}
        <View style={styles.adminSection}>
          {isMasjidAdmin ? (
            <View style={styles.adminManageCard}>
              <View style={styles.adminManageHeader}>
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#0D7377" />
                  <Text style={styles.adminBadgeText}>Masjid Administrator</Text>
                </View>
                <Text style={styles.adminMasjidName} numberOfLines={1}>
                  {primaryMasjid?.name || "Your Masjid"}
                </Text>
              </View>
              <Text style={styles.adminManageSubtitle}>
                You have admin access to update the daily and Ramadan prayer times for this masjid.
              </Text>
              <TouchableOpacity
                style={styles.adminPrimaryBtn}
                onPress={handleEditTimetable}
                activeOpacity={0.85}
              >
                <View style={styles.adminBtnInner}>
                  <Ionicons name="create-outline" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.adminPrimaryBtnText}>Edit Prayer Timetable</Text>
                </View>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.betterLoginBox}>
              <View style={styles.betterLoginHeader}>
                <View style={styles.betterLoginIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#0D7377" />
                </View>
                <View style={styles.betterLoginHeaderTextCol}>
                  <Text style={styles.betterLoginTitle}>Masjid Administrator?</Text>
                  <Text style={styles.betterLoginSubtitle}>
                    Login with your admin account to modify & update prayer times.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.betterLoginBtn}
                onPress={handleAdminLogin}
                activeOpacity={0.88}
              >
                <View style={styles.loginBtnInnerRow}>
                  <View style={styles.loginBtnIconCircle}>
                    <Ionicons name="log-in-outline" size={18} color="#0D7377" />
                  </View>
                  <View>
                    <Text style={styles.betterLoginBtnMainText}>Admin Login</Text>
                    <Text style={styles.betterLoginBtnSubText}>एडमिन लॉगिन  •  لاگ ان کریں</Text>
                  </View>
                </View>

                <View style={styles.loginBtnArrowWrap}>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EC",
  },
  backBtn: {
    padding: 6,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  // Top Trilingual Report Incorrect Time Card
  topReportCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
    gap: 10,
  },
  topReportLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  topReportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  topReportTextCol: {
    flex: 1,
  },
  topReportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topReportTitleEn: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: "#92400E",
  },
  topReportBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  topReportBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
    color: "#B45309",
    textTransform: "uppercase",
  },
  topReportLangRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
    gap: 4,
  },
  topReportLangHi: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#B45309",
  },
  topReportLangDot: {
    fontSize: 11,
    color: "#D97706",
  },
  topReportLangUr: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#92400E",
  },
  topReportActionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2,
  },
  topReportActionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#B45309",
  },
  // Next Prayer Hero Card
  heroCountdownCard: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroNextBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  heroNextBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#E0F2F1",
    letterSpacing: 0.5,
  },
  heroTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTimerBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  heroBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heroPrayerName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 32,
  },
  heroMasjidLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#B2DFDB",
    marginTop: 2,
  },
  heroTimeWrap: {
    alignItems: "flex-end",
  },
  heroPrayerTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  sectionMetaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  prayerListContainer: {
    gap: 8,
    marginBottom: 16,
  },
  prayerRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EEF3EC",
  },
  prayerRowCardActive: {
    backgroundColor: "#E0F2F1",
    borderColor: "#80CBC4",
  },
  prayerLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  prayerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  prayerIconBoxActive: {
    backgroundColor: "#FFFFFF",
  },
  prayerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prayerNameText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  prayerNameTextActive: {
    color: Colors.primary,
    fontFamily: "Poppins_700Bold",
  },
  activeTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  activeTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  prayerRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  prayerTimeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: "#1A2E1A",
  },
  prayerTimeTextActive: {
    color: Colors.primary,
    fontFamily: "Poppins_600SemiBold",
  },
  soundBtn: {
    padding: 6,
  },
  extraTimesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EDE8",
    marginBottom: 16,
  },
  extraTimesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F1",
  },
  extraHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  extraIconWrapAmber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  extraIconWrapTeal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
  },
  extraTimesTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
  },
  extraTimesSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  editSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    borderWidth: 1,
    borderColor: "#80CBC4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  editSectionBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#0D7377",
  },
  extraHeaderBadge: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  extraHeaderBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#0D7377",
  },
  extraHeaderBadgeAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  extraHeaderBadgeTextAmber: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#B45309",
  },
  extraTimesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 6,
  },
  extraTimeCol: {
    alignItems: "center",
    flex: 1,
  },
  extraColDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#EEF3EC",
  },
  extraTimeLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1A2E1A",
  },
  extraTimeSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  extraTimeVal: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: Colors.primary,
  },
  fastingHubBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFBF8",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  fastingHubBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  fastingHubBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  extraTimesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridTimeItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F7FAF8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  gridTimeIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  gridTimeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  gridTimeVal: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: "#1A2E1A",
  },
  // Admin & Login Section Styles
  adminSection: {
    marginTop: 8,
  },
  adminManageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE7DF",
  },
  adminManageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  adminBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#0D7377",
  },
  adminMasjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 150,
  },
  adminManageSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  adminPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D7377",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  adminBtnInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminPrimaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#FFFFFF",
  },
  // Better Login Box
  betterLoginBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  betterLoginHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  betterLoginIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
  },
  betterLoginHeaderTextCol: {
    flex: 1,
  },
  betterLoginTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  betterLoginSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  betterLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D7377",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  loginBtnInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loginBtnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  betterLoginBtnMainText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  betterLoginBtnSubText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#B2DFDB",
    marginTop: -2,
  },
  loginBtnArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
