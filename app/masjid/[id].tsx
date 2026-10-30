import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, {
  Rect,
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { getMasjidById, getMasjidEvents } from "@/lib/store";
import { Masjid, AppEvent } from "@/lib/types";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { useAuth } from "@/lib/auth-context";
import { usePrayerCountdown } from "@/lib/prayer-timer";
import { showCustomAlert } from "@/lib/custom-alert";
import { MasjidDetailSkeleton } from "@/components/Skeleton";
import { MasjidQRModal } from "@/components/MasjidQRModal";
import { EventCard } from "@/components/EventCard";

const BOOKMARKS_STORAGE_KEY = "@bookmarked_masjid_ids_v1";

const MASJID_TABS = [
  { id: "Prayer Times", label: "Prayer Times", icon: "time-outline" },
  { id: "Sunnah & Ramadan", label: "Sunnah & Ramadan", icon: "sunny-outline" },
  { id: "About", label: "About", icon: "information-circle-outline" },
] as const;

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

export default function MasjidDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { primaryMasjidId, selectPrimaryMasjid } = usePrimaryMasjid();
  const { admin } = useAuth();

  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"Prayer Times" | "Sunnah & Ramadan" | "About">("Prayer Times");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Load real masjid data and announcements dynamically (no static mock fallbacks)
  const loadMasjidData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [masjidData, eventsData] = await Promise.all([
        getMasjidById(id),
        getMasjidEvents(id).catch(() => [] as AppEvent[]),
      ]);

      setMasjid(masjidData);
      setEvents(eventsData || []);

      // Check bookmark status
      const rawBookmarks = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (rawBookmarks) {
        const bookmarkedList: string[] = JSON.parse(rawBookmarks);
        setIsBookmarked(bookmarkedList.includes(id));
      }
    } catch (err) {
      console.error("Failed to load masjid details:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMasjidData();
  }, [loadMasjidData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadMasjidData();
  };

  const isPrimary = primaryMasjidId === masjid?.id;

  // Toggle Primary Masjid status
  const handleTogglePrimary = async () => {
    if (!masjid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isPrimary) {
      showCustomAlert(
        "Primary Masjid",
        `${masjid.name} is currently your primary masjid for prayer times & adhan notifications. To switch, select another masjid.`
      );
      return;
    }

    try {
      await selectPrimaryMasjid(masjid.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert("Primary Masjid Set", `${masjid.name} is now your primary masjid!`);
    } catch (err) {
      console.error("Failed to set primary masjid:", err);
      showCustomAlert("Error", "Could not set primary masjid. Please try again.");
    }
  };

  // Toggle bookmark saved in local storage
  const toggleBookmark = async () => {
    if (!id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const raw = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
      let list: string[] = raw ? JSON.parse(raw) : [];
      const currentlyBookmarked = list.includes(id);

      if (currentlyBookmarked) {
        list = list.filter((item) => item !== id);
      } else {
        list.push(id);
      }

      await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(list));
      setIsBookmarked(!currentlyBookmarked);
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  // Open Maps with accurate location
  const handleDirections = () => {
    if (!masjid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const destinationQuery = encodeURIComponent(
      `${masjid.name}, ${masjid.address || masjid.city}`
    );
    const mapUrl = Platform.select({
      ios: `maps:0,0?q=${destinationQuery}`,
      android: `geo:0,0?q=${destinationQuery}`,
      default: `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`,
    });

    void Linking.openURL(mapUrl as string).catch(() => {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destinationQuery}`);
    });
  };

  // Call or Contact masjid committee (only if valid phone exists in data)
  const handleContact = () => {
    if (!masjid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const contactPhone =
      (masjid as any).phone || (masjid as any).whatsappNumber || null;

    if (contactPhone) {
      showCustomAlert("Masjid Contact", `Call masjid administration at ${contactPhone}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => void Linking.openURL(`tel:${contactPhone}`) },
      ]);
    } else {
      showCustomAlert(
        "No Direct Phone Listed",
        "This masjid has not listed a direct contact number yet. Would you like to submit or update contact details?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Report Info",
            onPress: () =>
              router.push({
                pathname: "/report-masjid-time",
                params: { masjidId: masjid.id, masjidName: masjid.name },
              }),
          },
        ]
      );
    }
  };

  // Share dynamic timetable
  const handleShare = async () => {
    if (!masjid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const t = masjid.timetable;
    const shareText = `${masjid.name}\n${masjid.address || masjid.city}\n\n` +
      `Daily Prayer Times:\n` +
      `• Fajr: ${formatDisplayTime(t.fajr)}\n` +
      `• Dhuhr: ${formatDisplayTime(t.dhuhr)}\n` +
      `• Asr: ${formatDisplayTime(t.asr)}\n` +
      `• Maghrib: ${formatDisplayTime(t.maghrib)}\n` +
      `• Isha: ${formatDisplayTime(t.isha)}\n` +
      `• Jummah: ${formatDisplayTime(t.jummah || t.dhuhr)}\n\n` +
      `View on Salah Times App`;

    await Share.share({ message: shareText });
  };

  // Check if current logged-in user is an admin of this masjid
  const isMasjidAdmin =
    !!admin &&
    !admin.isTempGuest &&
    (admin.role === "super_admin" ||
      (admin.role === "masjid_admin" &&
        (!admin.masjidId || admin.masjidId === masjid?.id)));

  // Live upcoming prayer countdown for this masjid
  const countdown = usePrayerCountdown(masjid?.timetable || null);
  const isFriday = new Date().getDay() === 5;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <MasjidDetailSkeleton />
      </View>
    );
  }

  // Handle case where masjid doesn't exist in database
  if (!masjid) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="dark" backgroundColor={Colors.background} />
        <View style={styles.errorContent}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="business-outline" size={48} color="#D97706" />
          </View>
          <Text style={styles.errorTitle}>Masjid Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This masjid record does not exist or may have been removed.
          </Text>
          <TouchableOpacity
            style={styles.errorBackBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.errorBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const timetable = masjid.timetable;

  const prayers = [
    {
      key: "fajr",
      name: "Fajr",
      time: timetable?.fajr || "",
      icon: "sunny-outline" as const,
      iconColor: "#D4A843",
    },
    {
      key: "dhuhr",
      name: isFriday ? "Jummah / Dhuhr" : "Dhuhr",
      time: isFriday && timetable?.jummah ? timetable.jummah : timetable?.dhuhr || "",
      icon: isFriday ? ("people-outline" as const) : ("sunny" as const),
      iconColor: "#F39C12",
    },
    {
      key: "asr",
      name: "Asr",
      time: timetable?.asr || "",
      icon: "partly-sunny-outline" as const,
      iconColor: "#14A3A8",
    },
    {
      key: "maghrib",
      name: "Maghrib",
      time: timetable?.maghrib || "",
      icon: "cloudy-night-outline" as const,
      iconColor: "#C0392B",
    },
    {
      key: "isha",
      name: "Isha",
      time: timetable?.isha || "",
      icon: "moon-outline" as const,
      iconColor: "#2980B9",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Hero Media Header with Mosque Artwork */}
      <View style={styles.heroMediaContainer}>
        <Svg width="100%" height={230} viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id="masjidSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#095456" />
              <Stop offset="60%" stopColor="#0D7377" />
              <Stop offset="100%" stopColor="#14A3A8" />
            </LinearGradient>
            <LinearGradient id="domeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#E0F2F1" />
            </LinearGradient>
          </Defs>

          {/* Teal Gradient Background */}
          <Rect width="360" height="230" fill="url(#masjidSkyGrad)" />

          {/* Geometric Mosque Silhouette */}
          <G transform="translate(20, 15)">
            {/* Left Minaret */}
            <Rect x="55" y="32" width="14" height="120" fill="rgba(255, 255, 255, 0.22)" rx="2" />
            <Path d="M 53 32 C 53 18, 62 10, 62 6 C 62 10, 71 18, 71 32 Z" fill="#FFFFFF" opacity={0.9} />

            {/* Right Minaret */}
            <Rect x="255" y="32" width="14" height="120" fill="rgba(255, 255, 255, 0.22)" rx="2" />
            <Path d="M 253 32 C 253 18, 262 10, 262 6 C 262 10, 271 18, 271 32 Z" fill="#FFFFFF" opacity={0.9} />

            {/* Main Central Dome */}
            <Path
              d="M 120 100 C 120 45, 160 30, 160 15 C 160 30, 200 45, 200 100 Z"
              fill="url(#domeGrad)"
              opacity={0.95}
            />
            {/* Side Domes */}
            <Path d="M 90 105 C 90 70, 115 60, 115 50 C 115 60, 140 70, 140 105 Z" fill="#FFFFFF" opacity={0.7} />
            <Path d="M 180 105 C 180 70, 205 60, 205 50 C 205 60, 230 70, 230 105 Z" fill="#FFFFFF" opacity={0.7} />

            {/* Mosque Facade Archways */}
            <Rect x="75" y="100" width="170" height="85" fill="#FFFFFF" opacity={0.9} rx="4" />
            <Path d="M 145 138 C 145 118, 175 118, 175 138 L 175 185 L 145 185 Z" fill="#0D7377" />
            <Path d="M 105 144 C 105 128, 125 128, 125 144 L 125 185 L 105 185 Z" fill="#0D7377" />
            <Path d="M 195 144 C 195 128, 215 128, 215 144 L 215 185 L 195 185 Z" fill="#0D7377" />
          </G>
        </Svg>

        {/* Top Floating Header Buttons */}
        <SafeAreaView style={styles.topControlsRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.floatingRoundBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRightBtns}>
            <TouchableOpacity
              onPress={handleTogglePrimary}
              style={[styles.floatingRoundBtn, isPrimary && styles.floatingPrimaryActive]}
              accessibilityLabel={isPrimary ? "Primary Masjid" : "Set as Primary Masjid"}
            >
              <Ionicons
                name={isPrimary ? "star" : "star-outline"}
                size={20}
                color={isPrimary ? "#F59E0B" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleBookmark}
              style={styles.floatingRoundBtn}
              accessibilityLabel="Bookmark Masjid"
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={19}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={styles.floatingRoundBtn}
              accessibilityLabel="Share Masjid"
            >
              <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Masjid Information Sheet */}
      <View style={styles.sheetContainer}>
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
          {/* Header Badge & Title */}
          <View style={styles.masjidHeaderBlock}>
            {isPrimary ? (
              <View style={styles.primaryActiveBadge}>
                <Ionicons name="star" size={12} color="#D97706" />
                <Text style={styles.primaryActiveBadgeText}>Primary Masjid</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleTogglePrimary}
                style={styles.setPrimaryPill}
                activeOpacity={0.8}
              >
                <Ionicons name="star-outline" size={13} color="#0D7377" />
                <Text style={styles.setPrimaryPillText}>Set as Primary</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.masjidTitle}>{masjid.name}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={15} color="#0D7377" style={{ marginRight: 4, marginTop: 1 }} />
              <Text style={styles.locationText} numberOfLines={2}>
                {masjid.address || [masjid.subDivision, masjid.city, masjid.state].filter(Boolean).join(", ") || "Address not provided"}
              </Text>
            </View>
          </View>

          {/* Quick Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBox} onPress={handleDirections}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="navigate-outline" size={20} color="#0D7377" />
              </View>
              <Text style={styles.actionLabel}>Directions</Text>
            </TouchableOpacity>

            {isMasjidAdmin && (
              <TouchableOpacity
                style={styles.actionBox}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowQRModal(true);
                }}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="qr-code-outline" size={20} color="#0D7377" />
                </View>
                <Text style={styles.actionLabel}>1-Day QR</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionBox} onPress={handleShare}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="share-social-outline" size={20} color="#0D7377" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBox}
              onPress={() =>
                router.push({
                  pathname: "/report-masjid-time",
                  params: { masjidId: masjid.id, masjidName: masjid.name },
                })
              }
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="flag-outline" size={19} color="#D97706" />
              </View>
              <Text style={styles.actionLabel}>Report Time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBox} onPress={handleContact}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="call-outline" size={19} color="#0D7377" />
              </View>
              <Text style={styles.actionLabel}>Contact</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Next Prayer Countdown Banner */}
          <View style={styles.heroCountdownCard}>
            <View style={styles.heroCountdownTop}>
              <View style={styles.heroCountdownBadge}>
                <Ionicons name="time" size={12} color="#E0F2F1" />
                <Text style={styles.heroCountdownBadgeText}>NEXT PRAYER</Text>
              </View>
              <Text style={styles.heroCountdownTimer}>
                {countdown.isNow ? "PRAYER TIME NOW" : `in ${countdown.formattedRemaining}`}
              </Text>
            </View>

            <View style={styles.heroCountdownBottom}>
              <Text style={styles.heroPrayerName}>
                {countdown.nextPrayerName || "Next Prayer"}
              </Text>
              <Text style={styles.heroPrayerTime}>
                {countdown.nextPrayerTimeFormatted}
              </Text>
            </View>
          </View>

          {/* Horizontally Scrollable Tabs */}
          <View style={styles.tabsScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {MASJID_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.horizontalTabChip,
                      isActive && styles.horizontalTabChipActive,
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActiveTab(tab.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={15}
                      color={isActive ? "#FFFFFF" : "#0D7377"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.horizontalTabText,
                        isActive && styles.horizontalTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* TAB 1: 5 Daily Prayers & Jummah */}
          {activeTab === "Prayer Times" && (
            <View style={styles.tabContentContainer}>
              {/* Daily Prayers List */}
              <View style={styles.prayerListContainer}>
                {prayers.map((prayer) => {
                  const isNext = countdown.nextPrayerKey === prayer.key;
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
                            size={19}
                            color={isNext ? "#0D7377" : prayer.iconColor}
                          />
                        </View>
                        <Text
                          style={[
                            styles.prayerNameText,
                            isNext && styles.prayerNameTextActive,
                          ]}
                        >
                          {prayer.name}
                        </Text>
                        {isNext && (
                          <View style={styles.upcomingTag}>
                            <Text style={styles.upcomingTagText}>Next</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.prayerTimeText,
                          isNext && styles.prayerTimeTextActive,
                        ]}
                      >
                        {formattedTime}
                      </Text>
                    </View>
                  );
                })}

                {/* Jummah Timing Card */}
                <View style={styles.prayerRowCard}>
                  <View style={styles.prayerLeftWrap}>
                    <View style={styles.prayerIconBox}>
                      <Ionicons name="people-outline" size={19} color="#0D7377" />
                    </View>
                    <Text style={styles.prayerNameText}>Jummah (Friday)</Text>
                  </View>
                  <Text style={styles.prayerTimeText}>
                    {formatDisplayTime(timetable?.jummah || timetable?.dhuhr)}
                  </Text>
                </View>
              </View>

              {/* Trilingual Report Incorrect Time Card */}
              <TouchableOpacity
                style={styles.trilingualReportCard}
                onPress={() =>
                  router.push({
                    pathname: "/report-masjid-time",
                    params: { masjidId: masjid.id, masjidName: masjid.name },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.trilingualIconWrap}>
                  <Ionicons name="flag" size={18} color="#D97706" />
                </View>
                <View style={styles.trilingualTextWrap}>
                  <Text style={styles.trilingualTitle}>Report Incorrect Time</Text>
                  <Text style={styles.trilingualSub}>गलत समय की रिपोर्ट करें • نماز کا غلط وقت بتائیں</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D97706" />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: Sunnah & Ramadan Timings */}
          {activeTab === "Sunnah & Ramadan" && (
            <View style={styles.tabContentContainer}>
              {/* Sunnah & Optional Timings */}
              <View style={styles.sectionHeadingRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="sunny-outline" size={16} color="#D97706" />
                  <Text style={styles.sectionHeadingText}>Sunnah & Optional Timings</Text>
                </View>
                {isMasjidAdmin && (
                  <TouchableOpacity
                    onPress={() => router.push(`/edit-timetable?masjidId=${masjid.id}`)}
                    style={styles.adminEditChip}
                  >
                    <Ionicons name="create-outline" size={12} color="#0D7377" />
                    <Text style={styles.adminEditChipText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.timingsGrid}>
                <View style={styles.gridTimingBox}>
                  <Text style={styles.gridTimingLabel}>Sunrise (طلوع)</Text>
                  <Text style={styles.gridTimingVal}>
                    {timetable?.sunrise ? formatDisplayTime(timetable.sunrise) : "--:--"}
                  </Text>
                </View>

                <View style={styles.gridTimingBox}>
                  <Text style={styles.gridTimingLabel}>Ishraq (اشراق)</Text>
                  <Text style={styles.gridTimingVal}>
                    {timetable?.ishraq ? formatDisplayTime(timetable.ishraq) : "--:--"}
                  </Text>
                </View>

                <View style={styles.gridTimingBox}>
                  <Text style={styles.gridTimingLabel}>Chasht / Duha (چاشت)</Text>
                  <Text style={styles.gridTimingVal}>
                    {timetable?.chasht ? formatDisplayTime(timetable.chasht) : "--:--"}
                  </Text>
                </View>

                <View style={styles.gridTimingBox}>
                  <Text style={styles.gridTimingLabel}>Zawal (زوال)</Text>
                  <Text style={styles.gridTimingVal}>
                    {timetable?.zawal ? formatDisplayTime(timetable.zawal) : "--:--"}
                  </Text>
                </View>

                <View style={[styles.gridTimingBox, { minWidth: "100%" }]}>
                  <Text style={styles.gridTimingLabel}>Tahajjud (تہجد)</Text>
                  <Text style={styles.gridTimingVal}>
                    {timetable?.tahajjud ? formatDisplayTime(timetable.tahajjud) : "--:--"}
                  </Text>
                </View>
              </View>

              {/* Ramadan Timings */}
              <View style={[styles.sectionHeadingRow, { marginTop: 20 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="moon" size={16} color="#0D7377" />
                  <Text style={styles.sectionHeadingText}>Ramadan Timings</Text>
                </View>
                {isMasjidAdmin && (
                  <TouchableOpacity
                    onPress={() => router.push(`/edit-timetable?masjidId=${masjid.id}`)}
                    style={styles.adminEditChip}
                  >
                    <Ionicons name="create-outline" size={12} color="#0D7377" />
                    <Text style={styles.adminEditChipText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.ramadanCard}>
                <View style={styles.ramadanCol}>
                  <Ionicons name="alarm-outline" size={18} color="#0D7377" style={{ marginBottom: 4 }} />
                  <Text style={styles.ramadanColLabel}>Sehri Ends</Text>
                  <Text style={styles.ramadanColSub}>سحری</Text>
                  <Text style={styles.ramadanColVal}>
                    {timetable?.sehri ? formatDisplayTime(timetable.sehri) : "--:--"}
                  </Text>
                </View>

                <View style={styles.ramadanColDivider} />

                <View style={styles.ramadanCol}>
                  <Ionicons name="restaurant-outline" size={18} color="#D97706" style={{ marginBottom: 4 }} />
                  <Text style={styles.ramadanColLabel}>Iftar Time</Text>
                  <Text style={styles.ramadanColSub}>افطار</Text>
                  <Text style={styles.ramadanColVal}>
                    {timetable?.iftar ? formatDisplayTime(timetable.iftar) : "--:--"}
                  </Text>
                </View>

                <View style={styles.ramadanColDivider} />

                <View style={styles.ramadanCol}>
                  <Ionicons name="book-outline" size={18} color="#2980B9" style={{ marginBottom: 4 }} />
                  <Text style={styles.ramadanColLabel}>Taraweeh</Text>
                  <Text style={styles.ramadanColSub}>تراویح</Text>
                  <Text style={styles.ramadanColVal}>
                    {timetable?.taraweeh ? formatDisplayTime(timetable.taraweeh) : "--:--"}
                  </Text>
                </View>
              </View>

              {/* Trilingual Report Incorrect Time Card */}
              <TouchableOpacity
                style={styles.trilingualReportCard}
                onPress={() =>
                  router.push({
                    pathname: "/report-masjid-time",
                    params: { masjidId: masjid.id, masjidName: masjid.name },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.trilingualIconWrap}>
                  <Ionicons name="flag" size={18} color="#D97706" />
                </View>
                <View style={styles.trilingualTextWrap}>
                  <Text style={styles.trilingualTitle}>Report Incorrect Time</Text>
                  <Text style={styles.trilingualSub}>गलत समय की रिपोर्ट करें • نماز کا غلط وقت بتائیں</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D97706" />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: About Masjid, Live Announcements & Verification Info */}
          {activeTab === "About" && (
            <View style={styles.tabContentContainer}>
              {/* Announcements Section */}
              <View style={styles.sectionHeadingRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="megaphone-outline" size={16} color="#0D7377" />
                  <Text style={styles.sectionHeadingText}>Masjid Announcements</Text>
                </View>
                {isMasjidAdmin && (
                  <TouchableOpacity
                    onPress={() => router.push("/create-event")}
                    style={styles.adminEditChip}
                  >
                    <Ionicons name="add-circle-outline" size={12} color="#0D7377" />
                    <Text style={styles.adminEditChipText}>Add Notice</Text>
                  </TouchableOpacity>
                )}
              </View>

              {events.length > 0 ? (
                <View style={{ gap: 10, marginBottom: 18 }}>
                  {events.map((ev) => (
                    <EventCard key={ev.id} event={ev} isAdmin={isMasjidAdmin} />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyEventsBox}>
                  <Ionicons name="notifications-off-outline" size={24} color="#94A3B8" />
                  <Text style={styles.emptyEventsText}>No active announcements posted</Text>
                  <Text style={styles.emptyEventsSub}>
                    Masjid committee updates, notices, and events will appear here.
                  </Text>
                </View>
              )}

              {/* Verified Details Card */}
              <View style={styles.aboutInfoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={18} color="#0D7377" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoRowLabel}>Masjid Name</Text>
                    <Text style={styles.infoRowVal}>{masjid.name}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={18} color="#0D7377" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoRowLabel}>Location & Area</Text>
                    <Text style={styles.infoRowVal}>
                      {masjid.address || [masjid.subDivision, masjid.city, masjid.state].filter(Boolean).join(", ") || "Address not provided"}
                    </Text>
                  </View>
                </View>

                {masjid.subDivision && (
                  <View style={styles.infoRow}>
                    <Ionicons name="navigate-circle-outline" size={18} color="#0D7377" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoRowLabel}>Sub-Division / Tehsil</Text>
                      <Text style={styles.infoRowVal}>{masjid.subDivision}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#0D7377" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoRowLabel}>Timetable Verification</Text>
                    <Text style={styles.infoRowVal}>Community Managed & Verified</Text>
                  </View>
                </View>

                {masjid.createdAt ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color="#0D7377" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoRowLabel}>Registered Since</Text>
                      <Text style={styles.infoRowVal}>
                        {new Date(masjid.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* 1-Day QR Code Banner (Masjid Admin Only) */}
              {isMasjidAdmin && (
                <TouchableOpacity
                  style={styles.qrBannerCard}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowQRModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.qrBannerIconWrap}>
                    <Ionicons name="qr-code-outline" size={20} color="#0D7377" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qrBannerTitle}>Masjid QR Code & Printable Sign</Text>
                    <Text style={styles.qrBannerSub}>
                      Share or print this QR code for musallis to scan and follow prayer times.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#0D7377" />
                </TouchableOpacity>
              )}

              {/* Trilingual Report Incorrect Time Card */}
              <TouchableOpacity
                style={styles.trilingualReportCard}
                onPress={() =>
                  router.push({
                    pathname: "/report-masjid-time",
                    params: { masjidId: masjid.id, masjidName: masjid.name },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.trilingualIconWrap}>
                  <Ionicons name="flag" size={18} color="#D97706" />
                </View>
                <View style={styles.trilingualTextWrap}>
                  <Text style={styles.trilingualTitle}>Report Incorrect Time</Text>
                  <Text style={styles.trilingualSub}>गलत समय की रिपोर्ट करें • نماز کا غلط وقت بتائیں</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D97706" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 100 }} />
        </ScrollView>

        {/* Floating Action Button (Admin Edit vs Community Report) */}
        <TouchableOpacity
          style={[styles.fabBtn, { bottom: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 20 }]}
          activeOpacity={0.88}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (isMasjidAdmin) {
              router.push(`/edit-timetable?masjidId=${masjid.id}`);
            } else {
              router.push({
                pathname: "/report-masjid-time",
                params: { masjidId: masjid.id, masjidName: masjid.name },
              });
            }
          }}
          accessibilityLabel={isMasjidAdmin ? "Edit Timetable" : "Report Time"}
        >
          <Ionicons
            name={isMasjidAdmin ? "create-outline" : "flag-outline"}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Masjid QR Modal (Admin Only) */}
      {isMasjidAdmin && (
        <MasjidQRModal
          visible={showQRModal}
          masjid={masjid}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#095456",
  },
  heroMediaContainer: {
    height: 230,
    width: "100%",
    position: "relative",
  },
  topControlsRow: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  floatingRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingPrimaryActive: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  topRightBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -20,
    overflow: "hidden",
    position: "relative",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  masjidHeaderBlock: {
    marginBottom: 14,
  },
  primaryActiveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    marginBottom: 6,
  },
  primaryActiveBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#B45309",
  },
  setPrimaryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    borderWidth: 1,
    borderColor: "#B2DFDB",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    marginBottom: 6,
  },
  setPrimaryPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#0D7377",
  },
  masjidTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1A2E1A",
    lineHeight: 28,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  locationText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  actionBox: {
    alignItems: "center",
    flex: 1,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#1A2E1A",
  },
  heroCountdownCard: {
    backgroundColor: "#0D7377",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  heroCountdownTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heroCountdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  heroCountdownBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10.5,
    color: "#E0F2F1",
    letterSpacing: 0.5,
  },
  heroCountdownTimer: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  heroCountdownBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heroPrayerName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
  },
  heroPrayerTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 19,
    color: "#FFFFFF",
  },
  tabsScrollWrapper: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
  },
  horizontalTabChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4EC",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2EDE7",
    height: 42,
  },
  horizontalTabChipActive: {
    backgroundColor: "#0D7377",
    borderColor: "#0D7377",
  },
  horizontalTabText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#475569",
    includeFontPadding: false,
    lineHeight: 18,
  },
  horizontalTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  tabContentContainer: {
    marginTop: 2,
  },
  prayerListContainer: {
    gap: 8,
  },
  prayerRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
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
    gap: 12,
  },
  prayerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  prayerIconBoxActive: {
    backgroundColor: "#FFFFFF",
  },
  prayerNameText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  prayerNameTextActive: {
    color: "#0D7377",
    fontFamily: "Poppins_700Bold",
  },
  upcomingTag: {
    backgroundColor: "#0D7377",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  upcomingTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
    color: "#FFFFFF",
  },
  prayerTimeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: "#1A2E1A",
  },
  prayerTimeTextActive: {
    color: "#0D7377",
    fontFamily: "Poppins_600SemiBold",
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeadingText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  adminEditChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  adminEditChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#0D7377",
  },
  timingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  gridTimingBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E6EDE8",
    alignItems: "center",
  },
  gridTimingLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  gridTimingVal: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: "#1A2E1A",
  },
  ramadanCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E6EDE8",
  },
  ramadanCol: {
    alignItems: "center",
    flex: 1,
  },
  ramadanColLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1A2E1A",
  },
  ramadanColSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  ramadanColVal: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#0D7377",
  },
  ramadanColDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#F0F4F1",
  },
  trilingualReportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 18,
    gap: 12,
  },
  trilingualIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  trilingualTextWrap: {
    flex: 1,
  },
  trilingualTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#92400E",
  },
  trilingualSub: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  emptyEventsBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E6EDE8",
    marginBottom: 16,
  },
  emptyEventsText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#475569",
    marginTop: 8,
  },
  emptyEventsSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 2,
  },
  aboutInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EDE8",
    gap: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoRowLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  infoRowVal: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#1A2E1A",
    marginTop: 1,
  },
  qrBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#B2DFDB",
    gap: 12,
  },
  qrBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  qrBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#0D7377",
  },
  qrBannerSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#095456",
    marginTop: 1,
  },
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0D7377",
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorContent: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    width: "100%",
    maxWidth: 320,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  errorTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
    marginBottom: 6,
  },
  errorSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 18,
  },
  errorBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7377",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 6,
  },
  errorBackBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
