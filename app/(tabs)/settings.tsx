import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import moment from "moment-hijri";
import type { Moment } from "moment";

import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { useLocation } from "@/lib/location-context";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import {
  CURRENT_VERSION,
  fetchAppUpdateConfig,
  compareVersions,
  AppUpdateConfig,
  DEFAULT_UPDATE_CONFIG,
} from "@/lib/updates";
import AppUpdateModal from "@/components/AppUpdateModal";
import { AboutUsModal } from "@/components/AboutUsModal";
import { PrayerAlarmSettingsModal } from "@/components/PrayerAlarmSettingsModal";
import {
  loadUserMonthlyActivity,
  UserMonthlyActivity,
} from "@/lib/user-activity";

type SettingsTab = "activity" | "settings";
type ActivitySubFilter = "all" | "tasbih" | "quran" | "duas" | "fasting";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { selectedCity, selectedState, openLocationModal } = useLocation();
  const { primaryMasjid } = usePrimaryMasjid();

  // Active top tab
  const [activeTab, setActiveTab] = useState<SettingsTab>("activity");

  // Selected month for activity tracking
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [activity, setActivity] = useState<UserMonthlyActivity | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  // Sub-filter inside Monthly Activity
  const [activitySubFilter, setActivitySubFilter] = useState<ActivitySubFilter>("all");

  // Modals
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<AppUpdateConfig>(DEFAULT_UPDATE_CONFIG);
  const [isUpdateForced, setIsUpdateForced] = useState(false);

  const handleCheckForUpdates = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingUpdate(true);
    try {
      const config = await fetchAppUpdateConfig(true);
      setUpdateConfig(config);

      const hasUpdate = config.enabled && compareVersions(CURRENT_VERSION, config.latestVersion) < 0;
      const forced = config.enabled && compareVersions(CURRENT_VERSION, config.minVersion) < 0;

      if (hasUpdate) {
        setIsUpdateForced(forced);
        setUpdateModalVisible(true);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCustomAlert(
          "You're Up to Date! 🎉",
          `Salah Times v${CURRENT_VERSION} is the latest version available.`
        );
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      showCustomAlert("Update Check", "Unable to connect to the update server. Please check your internet connection.");
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Load activity for the selected month
  const fetchActivity = useCallback(async () => {
    setIsLoadingActivity(true);
    try {
      const data = await loadUserMonthlyActivity(selectedMonth);
      setActivity(data);
    } catch (err) {
      console.error("Error fetching user activity:", err);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Month navigation
  const handlePrevMonth = () => {
    void Haptics.selectionAsync();
    setSelectedMonth((prev: Moment) => prev.clone().subtract(1, "month"));
  };

  const handleNextMonth = () => {
    void Haptics.selectionAsync();
    setSelectedMonth((prev: Moment) => prev.clone().add(1, "month"));
  };

  const handleGoToThisMonth = () => {
    void Haptics.selectionAsync();
    setSelectedMonth(moment());
  };

  // Share Monthly Summary
  const handleShareSummary = async () => {
    if (!activity) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const message = `🌟 My Islamic Monthly Spiritual Activity (${activity.monthName}):\n\n` +
        `📿 Tasbih / Dhikr: ${(activity.tasbih?.monthTotal || 0).toLocaleString()} recited this month (${(activity.tasbih?.totalLifetime || 0).toLocaleString()} lifetime)\n` +
        `📖 Quran Progress: ${activity.quran?.completionPercentage || 0}% (Page ${activity.quran?.lastReadPage || 1} / 604 • ${activity.quran?.monthPagesRead || 0} pages read)\n` +
        `🤲 Duas Recited: ${activity.duas?.monthRecitations || 0} recitations (${activity.duas?.totalSaved || 0} bookmarked)\n` +
        `🌙 Fasts Logged: ${activity.fasting?.monthFastsCount || 0} days this month (${activity.fasting?.currentStreak || 0}d streak)\n` +
        `✨ Daily Amal Completed: ${activity.amal?.monthlyEstimatedCompletions || 0} deeds done\n\n` +
        `Tracked privately on device via Pasted-Perfect App.`;

      await Share.share({
        message,
        title: `Spiritual Summary - ${activity.monthName}`,
      });
    } catch (e) {
      console.error("Error sharing summary:", e);
    }
  };

  const handleOfflineDownload = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showCustomAlert(
      "Download for Offline Use",
      "All Quran texts, Islamic Duas, and current Masjid timetables are cached on your device for seamless offline use."
    );
  };

  const handlePrivacyData = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showCustomAlert(
      "Privacy & Offline Cache",
      "All your activity results (Tasbih counts, Quran reading progress, saved Duas, and Fasting logs) are saved 100% privately on your device's local storage and are never uploaded to any external analytics server."
    );
  };

  const locationSub = selectedCity
    ? selectedCity.includes(",")
      ? selectedCity
      : `${selectedCity}, ${selectedState || "UP"}`
    : "Rampur, UP";

  const isSelectedThisMonth = selectedMonth.isSame(moment(), "month");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === "activity" ? "Activity & Analytics" : "Settings"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Top Segmented Tab Switcher */}
      <View style={styles.tabSwitchContainer}>
        <TouchableOpacity
          style={[
            styles.tabSwitchBtn,
            activeTab === "activity" && styles.tabSwitchBtnActive,
          ]}
          onPress={() => {
            void Haptics.selectionAsync();
            setActiveTab("activity");
          }}
        >
          <Ionicons
            name="analytics-outline"
            size={16}
            color={activeTab === "activity" ? "#FFFFFF" : Colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabSwitchText,
              activeTab === "activity" && styles.tabSwitchTextActive,
            ]}
          >
            Monthly Activity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabSwitchBtn,
            activeTab === "settings" && styles.tabSwitchBtnActive,
          ]}
          onPress={() => {
            void Haptics.selectionAsync();
            setActiveTab("settings");
          }}
        >
          <Ionicons
            name="settings-outline"
            size={16}
            color={activeTab === "settings" ? "#FFFFFF" : Colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabSwitchText,
              activeTab === "settings" && styles.tabSwitchTextActive,
            ]}
          >
            App Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
      >
        {activeTab === "activity" ? (
          /* ============================================================== */
          /*                       MONTHLY ACTIVITY TAB                     */
          /* ============================================================== */
          <>
            {/* Month Switcher Row */}
            <View style={styles.monthHeaderRow}>
              <View style={styles.monthNavGroup}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.monthHeaderText}>{selectedMonth.format("MMMM YYYY")}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {!isSelectedThisMonth && (
                <TouchableOpacity
                  style={styles.thisMonthPill}
                  onPress={handleGoToThisMonth}
                >
                  <Ionicons name="calendar-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.thisMonthPillText}>This Month</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingActivity ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading your cached activity...</Text>
              </View>
            ) : activity ? (
              <>
                {/* 4 Overview Scorecards Grid */}
                <View style={styles.scorecardsGrid}>
                  {/* Card 1: Tasbih / Dhikr */}
                  <TouchableOpacity
                    style={[
                      styles.scorecardItem,
                      activitySubFilter === "tasbih" && styles.scorecardItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActivitySubFilter(activitySubFilter === "tasbih" ? "all" : "tasbih");
                    }}
                  >
                    <View style={[styles.scorecardIconWrap, { backgroundColor: "#EAF4F4" }]}>
                      <Ionicons name="finger-print" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.scorecardNumber}>
                      {(activity.tasbih?.monthTotal || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.scorecardLabel}>Month's Dhikr</Text>
                    <Text style={styles.scorecardSub}>
                      {(activity.tasbih?.totalLifetime || 0).toLocaleString()} lifetime
                    </Text>
                  </TouchableOpacity>

                  {/* Card 2: Quran Reading */}
                  <TouchableOpacity
                    style={[
                      styles.scorecardItem,
                      activitySubFilter === "quran" && styles.scorecardItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActivitySubFilter(activitySubFilter === "quran" ? "all" : "quran");
                    }}
                  >
                    <View style={[styles.scorecardIconWrap, { backgroundColor: "#ECFDF5" }]}>
                      <Ionicons name="book" size={20} color="#059669" />
                    </View>
                    <Text style={[styles.scorecardNumber, { color: "#059669" }]}>
                      {activity.quran.lastReadPage ? `P. ${activity.quran.lastReadPage}` : "P. 1"}
                    </Text>
                    <Text style={styles.scorecardLabel}>Quran Progress</Text>
                    <Text style={styles.scorecardSub}>
                      {activity.quran.completionPercentage}% • {activity.quran.monthPagesRead} p. read
                    </Text>
                  </TouchableOpacity>

                  {/* Card 3: Duas & Azkar */}
                  <TouchableOpacity
                    style={[
                      styles.scorecardItem,
                      activitySubFilter === "duas" && styles.scorecardItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActivitySubFilter(activitySubFilter === "duas" ? "all" : "duas");
                    }}
                  >
                    <View style={[styles.scorecardIconWrap, { backgroundColor: "#FFF1F2" }]}>
                      <Ionicons name="heart" size={20} color="#E11D48" />
                    </View>
                    <Text style={[styles.scorecardNumber, { color: "#E11D48" }]}>
                      {activity.duas.monthRecitations > 0
                        ? activity.duas.monthRecitations
                        : activity.duas.totalSaved}
                    </Text>
                    <Text style={styles.scorecardLabel}>
                      {activity.duas.monthRecitations > 0 ? "Duas Recited" : "Saved Duas"}
                    </Text>
                    <Text style={styles.scorecardSub}>
                      {activity.duas.monthRecitations > 0
                        ? `${activity.duas.totalSaved} bookmarked`
                        : "Bookmarked in cache"}
                    </Text>
                  </TouchableOpacity>

                  {/* Card 4: Fasting Tracker */}
                  <TouchableOpacity
                    style={[
                      styles.scorecardItem,
                      activitySubFilter === "fasting" && styles.scorecardItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActivitySubFilter(activitySubFilter === "fasting" ? "all" : "fasting");
                    }}
                  >
                    <View style={[styles.scorecardIconWrap, { backgroundColor: "#FFFBEB" }]}>
                      <Ionicons name="moon" size={20} color="#D97706" />
                    </View>
                    <Text style={[styles.scorecardNumber, { color: "#D97706" }]}>
                      {activity.fasting.monthFastsCount}
                    </Text>
                    <Text style={styles.scorecardLabel}>Fasts Logged</Text>
                    <Text style={styles.scorecardSub}>
                      {activity.fasting.currentStreak > 0
                        ? `${activity.fasting.currentStreak}d streak`
                        : `${activity.fasting.totalLifetimeFasts} lifetime`}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-Filter Chips */}
                <View style={styles.subFilterRow}>
                  {[
                    { id: "all", label: "All Activity" },
                    { id: "tasbih", label: "Tasbih" },
                    { id: "quran", label: "Quran" },
                    { id: "duas", label: "Duas" },
                    { id: "fasting", label: "Fasting & Deeds" },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.subFilterChip,
                        activitySubFilter === chip.id && styles.subFilterChipActive,
                      ]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setActivitySubFilter(chip.id as ActivitySubFilter);
                      }}
                    >
                      <Text
                        style={[
                          styles.subFilterChipText,
                          activitySubFilter === chip.id && styles.subFilterChipTextActive,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* SECTION 1: TASBIH DETAILED BREAKDOWN */}
                {(activitySubFilter === "all" || activitySubFilter === "tasbih") && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={styles.detailCardIconTeal}>
                        <Ionicons name="finger-print-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailCardTitle}>Tasbih & Dhikr Activity</Text>
                        <Text style={styles.detailCardSubtitle}>
                          This Month: {(activity.tasbih?.monthTotal || 0).toLocaleString()} • Lifetime: {(activity.tasbih?.totalLifetime || 0).toLocaleString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openFeatureBtn}
                        onPress={() => router.push("/tasbih")}
                      >
                        <Text style={styles.openFeatureBtnText}>Open</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {!activity.tasbih?.dhikrBreakdown || activity.tasbih.dhikrBreakdown.length === 0 ? (
                      <View style={styles.emptyActivitySubBox}>
                        <Text style={styles.emptyActivitySubText}>
                          No individual dhikr counts recorded yet. Tap "Open" to start reciting!
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.dhikrBreakdownList}>
                        {(activity.tasbih?.dhikrBreakdown || []).slice(0, 5).map((item) => {
                          const maxC = activity.tasbih?.dhikrBreakdown?.[0]?.count || 1;
                          const pct = Math.min(100, Math.round((item.count / maxC) * 100));

                          return (
                            <View key={item.id} style={styles.dhikrBreakdownRow}>
                              <View style={styles.dhikrRowInfo}>
                                <Text style={styles.dhikrRowTitle}>{item.title}</Text>
                                <Text style={styles.dhikrRowCount}>{item.count.toLocaleString()} times</Text>
                              </View>
                              <View style={styles.dhikrProgressBarBg}>
                                <View style={[styles.dhikrProgressBarFill, { width: `${pct}%` }]} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* SECTION 2: QURAN READING PROGRESS */}
                {(activitySubFilter === "all" || activitySubFilter === "quran") && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.detailCardIconTeal, { backgroundColor: "#ECFDF5" }]}>
                        <Ionicons name="book-outline" size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailCardTitle}>Quran Reading Progress</Text>
                        <Text style={styles.detailCardSubtitle}>
                          Page {activity.quran.lastReadPage || 1} of 604 ({activity.quran.completionPercentage}% Complete)
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openFeatureBtn}
                        onPress={() => router.push("/(tabs)/quran")}
                      >
                        <Text style={styles.openFeatureBtnText}>Read</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.quranProgressBox}>
                      <View style={styles.quranProgressBarBg}>
                        <View
                          style={[
                            styles.quranProgressBarFill,
                            { width: `${activity.quran.completionPercentage}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.quranProgressStatsRow}>
                        <Text style={styles.quranProgressStatText}>
                          {activity.quran.monthPagesRead} pages read this month
                        </Text>
                        <Text style={styles.quranProgressStatText}>
                          {activity.quran.totalBookmarks} Ayat • {activity.quran.pageBookmarksCount} Page Marks
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* SECTION 3: DUAS & AZKAR */}
                {(activitySubFilter === "all" || activitySubFilter === "duas") && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.detailCardIconTeal, { backgroundColor: "#FFF1F2" }]}>
                        <Ionicons name="heart-outline" size={18} color="#E11D48" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailCardTitle}>Duas & Supplications</Text>
                        <Text style={styles.detailCardSubtitle}>
                          {activity.duas.monthRecitations} Recited this Month • {activity.duas.totalSaved} Bookmarked
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openFeatureBtn}
                        onPress={() => router.push("/duas")}
                      >
                        <Text style={styles.openFeatureBtnText}>Browse</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {activity.duas.savedDuas.length === 0 ? (
                      <View style={styles.emptyActivitySubBox}>
                        <Text style={styles.emptyActivitySubText}>
                          Tap the heart icon on any Dua in the Duas screen to save it here for quick daily recitation.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.savedDuasMiniList}>
                        {activity.duas.savedDuas.slice(0, 4).map((d) => (
                          <View key={d.id} style={styles.savedDuaMiniItem}>
                            <Ionicons name="bookmark" size={14} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.savedDuaMiniTitle} numberOfLines={1}>
                              {d.title}
                            </Text>
                            <Text style={styles.savedDuaMiniCategory}>{d.category}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* SECTION 4: FASTING & SPIRITUAL DEEDS */}
                {(activitySubFilter === "all" || activitySubFilter === "fasting") && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.detailCardIconTeal, { backgroundColor: "#FFFBEB" }]}>
                        <Ionicons name="moon-outline" size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailCardTitle}>Fasting & Daily Amal</Text>
                        <Text style={styles.detailCardSubtitle}>
                          {activity.fasting.monthFastsCount} Fasts Kept this Month
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openFeatureBtn}
                        onPress={() => router.push("/fasting")}
                      >
                        <Text style={styles.openFeatureBtnText}>View Hub</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fastingStatsMiniRow}>
                      <View style={styles.fastingStatMiniBox}>
                        <Text style={styles.fastingStatMiniNum}>{activity.fasting.monthFastsCount}</Text>
                        <Text style={styles.fastingStatMiniLabel}>Month Fasts</Text>
                      </View>
                      <View style={styles.fastingStatMiniBox}>
                        <Text style={styles.fastingStatMiniNum}>{activity.fasting.currentStreak} d</Text>
                        <Text style={styles.fastingStatMiniLabel}>Streak</Text>
                      </View>
                      <View style={styles.fastingStatMiniBox}>
                        <Text style={styles.fastingStatMiniNum}>{activity.amal.todayCompletedCount} / 14</Text>
                        <Text style={styles.fastingStatMiniLabel}>Today's Amal</Text>
                      </View>
                      <View style={styles.fastingStatMiniBox}>
                        <Text style={styles.fastingStatMiniNum}>{activity.amal.monthlyEstimatedCompletions}</Text>
                        <Text style={styles.fastingStatMiniLabel}>Month Deeds</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Share Spiritual Summary Button */}
                <TouchableOpacity
                  style={styles.shareSummaryBtn}
                  activeOpacity={0.85}
                  onPress={handleShareSummary}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.shareSummaryBtnText}>Share My Monthly Spiritual Summary</Text>
                </TouchableOpacity>

                {/* Local Privacy Note */}
                <View style={styles.privacyNoticeBox}>
                  <Ionicons name="shield-checkmark" size={15} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.privacyNoticeText}>
                    All your spiritual metrics and logs are stored privately in your device's local memory.
                  </Text>
                </View>
              </>
            ) : null}
          </>
        ) : (
          /* ============================================================== */
          /*                       APP SETTINGS TAB                         */
          /* ============================================================== */
          <View style={styles.settingsListCard}>
            {/* 1. Location */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openLocationModal();
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Location</Text>
                <Text style={styles.rowSubtitle}>{locationSub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Notifications & Alarms */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAlarmModalVisible(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Notifications & Alarms</Text>
                <Text style={styles.rowSubtitle}>Azan, Reminders, Updates</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* 3. Download for Offline Use */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleOfflineDownload}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-download-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Download for Offline Use</Text>
                <Text style={styles.rowSubtitle}>Quran, Duas, Prayer Times</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* 4. Privacy & Data */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handlePrivacyData}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Privacy & Data</Text>
                <Text style={styles.rowSubtitle}>100% on-device local storage</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Check for Updates */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleCheckForUpdates}
              disabled={checkingUpdate}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-download-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Check for Updates</Text>
                <Text style={styles.rowSubtitle}>
                  {checkingUpdate ? "Checking latest version..." : `Current: v${CURRENT_VERSION}`}
                </Text>
              </View>
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              )}
            </TouchableOpacity>

            {/* 5. About App */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAboutModalVisible(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>About App</Text>
                <Text style={styles.rowSubtitle}>Version {CURRENT_VERSION}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* 6. Onboarding Walkthrough */}
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/onboarding");
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>App Onboarding Tour</Text>
                <Text style={styles.rowSubtitle}>Replay Welcome & Feature Walkthrough</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Math.max(insets.bottom, 16) + 90 }} />
      </ScrollView>

      {/* About Us Modal */}
      <AboutUsModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
      />

      {/* Prayer Alarm Settings Modal */}
      <PrayerAlarmSettingsModal
        visible={alarmModalVisible}
        onClose={() => setAlarmModalVisible(false)}
        primaryMasjidName={primaryMasjid?.name}
      />

      {/* App Update Modal */}
      <AppUpdateModal
        visible={updateModalVisible}
        config={updateConfig}
        isForced={isUpdateForced}
        onClose={() => setUpdateModalVisible(false)}
      />
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
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Top Tab Switcher */
  tabSwitchContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F4EC",
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  tabSwitchBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabSwitchText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabSwitchTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* Month Header Row */
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthNavBtn: {
    padding: 6,
  },
  monthHeaderText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15.5,
    color: "#1A2E1A",
    marginHorizontal: 6,
  },
  thisMonthPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#EAF4F4",
    borderWidth: 1,
    borderColor: "#D2E8E8",
  },
  thisMonthPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: Colors.primary,
  },

  /* Loading */
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: Colors.textMuted,
  },

  /* 4 Overview Scorecards Grid */
  scorecardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 12,
  },
  scorecardItem: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  scorecardItemActive: {
    borderColor: Colors.primary,
    backgroundColor: "#F4FAF9",
  },
  scorecardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  scorecardNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  scorecardLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1A2E1A",
    marginTop: -2,
  },
  scorecardSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
  },

  /* Sub-Filter Row */
  subFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  subFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subFilterChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  subFilterChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* Detail Card */
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 12,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailCardIconTeal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  detailCardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#1A2E1A",
  },
  detailCardSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  openFeatureBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#F0F7F7",
  },
  openFeatureBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: Colors.primary,
  },
  emptyActivitySubBox: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyActivitySubText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },

  /* Dhikr Breakdown */
  dhikrBreakdownList: {
    gap: 8,
  },
  dhikrBreakdownRow: {
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  dhikrRowInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dhikrRowTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#1A2E1A",
    flex: 1,
    marginRight: 8,
  },
  dhikrRowCount: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  dhikrProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2EBE5",
    overflow: "hidden",
  },
  dhikrProgressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  /* Quran Progress */
  quranProgressBox: {
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  quranProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1FAE5",
    overflow: "hidden",
    marginBottom: 8,
  },
  quranProgressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  quranProgressStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quranProgressStatText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },

  /* Saved Duas Mini List */
  savedDuasMiniList: {
    gap: 6,
  },
  savedDuaMiniItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF8",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  savedDuaMiniTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#1A2E1A",
    flex: 1,
    marginRight: 6,
  },
  savedDuaMiniCategory: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },

  /* Fasting Stats Mini */
  fastingStatsMiniRow: {
    flexDirection: "row",
    gap: 8,
  },
  fastingStatMiniBox: {
    flex: 1,
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  fastingStatMiniNum: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#D97706",
  },
  fastingStatMiniLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: -2,
  },

  /* Share Summary Button */
  shareSummaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  shareSummaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#FFFFFF",
  },

  /* Privacy Notice Box */
  privacyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4FAF9",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8EFEF",
    marginBottom: 12,
  },
  privacyNoticeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },

  /* Settings List Card */
  settingsListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F6F1",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  rowSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
