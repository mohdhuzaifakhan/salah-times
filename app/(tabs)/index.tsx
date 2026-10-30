import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Rect, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment-hijri";

import Colors from "@/constants/colors";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { useLocation } from "@/lib/location-context";
import { usePrayerCountdown } from "@/lib/prayer-timer";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { getCompletedAmal, DEFAULT_AMAL_LIST } from "@/lib/amal";
import { AmalTrackerModal } from "@/components/modals/AmalTrackerModal";
import { PrayerAlarmSettingsModal } from "@/components/PrayerAlarmSettingsModal";
import { showCustomAlert } from "@/lib/custom-alert";
import { getAllMasjids } from "@/lib/store";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import { VoiceSearchButton } from "@/components/voice-search-button";
import { MasjidCard } from "@/components/MasjidCard";
import { Masjid } from "@/lib/types";

export default function HomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { primaryMasjid, openSelectModal } = usePrimaryMasjid();
  const { selectedCity, selectedState, openLocationModal } = useLocation();

  const [refreshing, setRefreshing] = useState(false);
  const [amalModalVisible, setAmalModalVisible] = useState(false);
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [completedAmalCount, setCompletedAmalCount] = useState(0);

  // Masjids list state
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSubDivision, setSelectedSubDivision] = useState<string | null>(null);
  const [loadingMasjids, setLoadingMasjids] = useState(false);

  // First time launch check
  useEffect(() => {
    async function checkOnboarding() {
      const completed = await hasCompletedOnboarding();
      if (!completed) {
        router.replace("/welcome");
      }
    }
    void checkOnboarding();
  }, []);

  // Load Masjids from database
  const loadMasjids = useCallback(async () => {
    setLoadingMasjids(true);
    try {
      const data = await getAllMasjids();
      setMasjids(data);
    } catch (e) {
      console.error("Failed to load masjids:", e);
    } finally {
      setLoadingMasjids(false);
    }
  }, []);

  useEffect(() => {
    void loadMasjids();
  }, [loadMasjids]);

  // Load Amal Progress
  const refreshAmal = useCallback(async () => {
    const ids = await getCompletedAmal();
    setCompletedAmalCount(ids.length);
  }, []);

  useEffect(() => {
    void refreshAmal();
  }, [refreshAmal]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshAmal(), loadMasjids()]);
    setRefreshing(false);
  };

  // Sub-divisions dynamically extracted from masjids
  const subDivisions = useMemo(() => {
    const subs = new Set<string>();
    masjids.forEach((m) => {
      if (m.subDivision) {
        if (!selectedCity || (m.city && m.city.toLowerCase().includes(selectedCity.toLowerCase()))) {
          subs.add(m.subDivision);
        }
      }
    });
    return Array.from(subs);
  }, [masjids, selectedCity]);

  // Filtered masjids list
  const filteredMasjids = useMemo(() => {
    return masjids.filter((m) => {
      if (selectedCity && m.city && !m.city.toLowerCase().includes(selectedCity.toLowerCase()) && !selectedCity.toLowerCase().includes(m.city.toLowerCase())) {
        return false;
      }
      if (selectedSubDivision && m.subDivision !== selectedSubDivision) {
        return false;
      }
      if (search.trim()) {
        return (
          fuzzyMatch(search, m.name) ||
          (m.address && fuzzyMatch(search, m.address)) ||
          (m.subDivision && fuzzyMatch(search, m.subDivision))
        );
      }
      return true;
    });
  }, [masjids, selectedCity, selectedSubDivision, search]);

  // Timetable from Primary Masjid
  const now = moment();
  const isFriday = now.day() === 5;

  const timetable = useMemo(() => {
    if (primaryMasjid?.timetable) {
      return primaryMasjid.timetable;
    }
    return {
      fajr: "05:03",
      dhuhr: "11:58",
      asr: "15:55",
      maghrib: "17:35",
      isha: "18:52",
      jummah: "12:30",
    };
  }, [primaryMasjid]);

  const countdown = usePrayerCountdown(timetable);

  // Date strings
  const gregorianStr = now.format("ddd, D MMM YYYY");
  const hijriStr = `${now.format("iMMMM")} ${now.iDate()}, ${now.iYear()} AH`;

  const locationTitle = selectedCity
    ? selectedCity.includes(",")
      ? selectedCity
      : `${selectedCity}, ${selectedState || "UP"}`
    : "Tanda, Rampur";

  // 5 Daily Namaaz Slots ONLY (sunrise removed as requested)
  const fivePrayerSlots = [
    { key: "fajr", label: "Fajr", time: timetable.fajr || "05:03" },
    {
      key: isFriday ? "jummah" : "dhuhr",
      label: isFriday ? "Jummah" : "Dhuhr",
      time: isFriday ? (timetable.jummah || timetable.dhuhr || "12:30") : (timetable.dhuhr || "11:58"),
    },
    { key: "asr", label: "Asr", time: timetable.asr || "15:55" },
    { key: "maghrib", label: "Maghrib", time: timetable.maghrib || "17:35" },
    { key: "isha", label: "Isha", time: timetable.isha || "18:52" },
  ];

  const currentNextKey = countdown.nextPrayerKey || (isFriday ? "jummah" : "dhuhr");

  // 8 Islamic Tools Grid
  const islamicTools = [
    {
      id: "quran",
      title: "Quran",
      icon: "book",
      iconColor: Colors.primary,
      onPress: () => router.push("/(tabs)/quran"),
    },
    {
      id: "duas",
      title: "Duas",
      icon: "hand-left",
      iconColor: Colors.primary,
      onPress: () => router.push("/duas"),
    },
    {
      id: "qibla",
      title: "Qibla",
      icon: "compass",
      iconColor: Colors.primary,
      onPress: () => router.push("/qibla"),
    },
    {
      id: "nearby",
      title: "Nearby",
      icon: "location",
      iconColor: Colors.primary,
      onPress: () => router.push("/nearby-masjids"),
    },
    {
      id: "tasbih",
      title: "Tasbih",
      icon: "ellipse",
      iconColor: Colors.primary,
      onPress: () => router.push("/tasbih"),
    },
    {
      id: "calendar",
      title: "Calendar",
      icon: "calendar",
      iconColor: Colors.primary,
      onPress: () => router.push("/(tabs)/calendar"),
    },
    {
      id: "fasting",
      title: "Fasting",
      icon: "moon",
      iconColor: Colors.primary,
      onPress: () => router.push("/fasting"),
    },
    {
      id: "admin",
      title: "My Masjid",
      icon: "key",
      iconColor: Colors.primary,
      onPress: () => router.push("/(tabs)/admin"),
    },
  ];

  // Amal Progress %
  const amalProgress = Math.round((completedAmalCount / DEFAULT_AMAL_LIST.length) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Top Header: Location & Dates on Left, Bell & Profile on Right */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openLocationModal();
          }}
          activeOpacity={0.7}
          style={styles.locationContainer}
        >
          <View style={styles.locationTitleRow}>
            <Ionicons name="location" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.locationTitle} numberOfLines={1}>
              {locationTitle}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.hijriDateSubtitle}>{hijriStr}</Text>
          <Text style={styles.gregorianDateSubtitle}>{gregorianStr}</Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAlarmModalVisible(true);
            }}
            style={styles.headerIconBtn}
          >
            <Ionicons name="notifications" size={19} color="#1A2E1A" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/admin");
            }}
            style={[styles.headerIconBtn, styles.avatarBtn]}
          >
            <Ionicons name="key-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero Next Prayer Gradient Card with Primary Masjid Namaz Time */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/prayer-times");
          }}
          style={styles.heroCardTouch}
        >
          <LinearGradient
            colors={["#14A3A8", "#0D7377", "#095456"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroPrayerCard}
          >
            <View style={styles.heroContentRow}>
              {/* Left side: Primary Masjid badge, Next Prayer Name & Time */}
              <View style={styles.heroLeftCol}>
                <View style={styles.heroNextHeaderTag}>
                  <Text style={styles.heroNextLabel} numberOfLines={1}>
                    {primaryMasjid ? primaryMasjid.name : "Next Prayer"}
                  </Text>
                  {primaryMasjid && (
                    <Ionicons name="star" size={12} color="#FFD700" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={styles.heroPrayerName}>
                  {countdown.nextPrayerName || (isFriday ? "Jummah" : "Dhuhr")}
                </Text>
                <Text style={styles.heroPrayerTime}>
                  {countdown.nextPrayerTimeFormatted || timetable.dhuhr || "11:58"}
                </Text>
                {primaryMasjid ? (
                  <Text style={styles.heroMasjidSub} numberOfLines={1}>
                    {primaryMasjid.subDivision ? `${primaryMasjid.subDivision}, ` : ""}{primaryMasjid.city}
                  </Text>
                ) : (
                  <Text style={styles.heroMasjidSub}>Standard Timetable</Text>
                )}
              </View>

              {/* Right side: Circular Countdown Ring */}
              <View style={styles.heroRightCol}>
                <View style={styles.countdownRingWrap}>
                  <Svg width={96} height={96} viewBox="0 0 96 96">
                    {/* Background track */}
                    <Circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#FFFFFF"
                      strokeWidth="5"
                      strokeOpacity="0.25"
                      fill="none"
                    />
                    {/* Progress active arc */}
                    <Circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#FFFFFF"
                      strokeWidth="5"
                      strokeDasharray="180 250"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                  <View style={styles.countdownCenterTextWrap}>
                    <Text style={styles.countdownInLabel}>
                      {countdown.isNow ? "PRAYER" : "in"}
                    </Text>
                    <Text style={styles.countdownInText}>
                      {countdown.isNow ? "NOW" : (countdown.formattedRemaining.split(" ").slice(0, 2).join(" ") || "10m 42s")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Horizontal 5 Prayer Times Bar (Sunrise removed, 5 prayers only) */}
        <View style={styles.horizontalPrayerCard}>
          {fivePrayerSlots.map((slot) => {
            const isActive = slot.key === currentNextKey;
            return (
              <View
                key={slot.key}
                style={[
                  styles.prayerSlotBox,
                  isActive && styles.prayerSlotBoxActive,
                ]}
              >
                <Text
                  style={[
                    styles.slotLabel,
                    isActive && styles.slotLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {slot.label}
                </Text>
                <Text
                  style={[
                    styles.slotTime,
                    isActive && styles.slotTimeActive,
                  ]}
                  numberOfLines={1}
                >
                  {slot.time}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 8-Tool Quick Action Grid */}
        <View style={styles.toolsGrid}>
          {islamicTools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolTile}
              activeOpacity={0.75}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                tool.onPress();
              }}
            >
              <View style={styles.toolIconWrap}>
                <Ionicons name={tool.icon as any} size={22} color={tool.iconColor || Colors.primary} />
              </View>
              <Text style={styles.toolTileTitle}>{tool.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* "Today's Amal" Card */}
        <TouchableOpacity
          style={styles.amalCard}
          activeOpacity={0.88}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAmalModalVisible(true);
          }}
        >
          <View style={styles.amalLeftIconWrap}>
            <Ionicons name="sparkles" size={20} color={Colors.accent} />
          </View>

          <View style={styles.amalCenterWrap}>
            <Text style={styles.amalTitle}>Today's Amal</Text>
            <View style={styles.amalProgressRow}>
              <Text style={styles.amalCounterText}>
                {completedAmalCount}/{DEFAULT_AMAL_LIST.length}
              </Text>
              <View style={styles.amalProgressBarTrack}>
                <View style={[styles.amalProgressBarFill, { width: `${amalProgress}%` }]} />
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#8A998A" />
        </TouchableOpacity>

        {/* Primary Masjid Selection Card */}
        <View style={styles.primaryMasjidCard}>
          <View style={styles.primaryMasjidHeader}>
            <View style={styles.primaryMasjidBadge}>
              <Ionicons name="star" size={13} color="#D4A843" />
              <Text style={styles.primaryMasjidBadgeText}>PRIMARY MASJID</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openSelectModal();
              }}
              style={styles.changePrimaryBtn}
            >
              <Ionicons name="swap-horizontal" size={13} color={Colors.primary} />
              <Text style={styles.changePrimaryText}>
                {primaryMasjid ? "Change" : "Select"}
              </Text>
            </TouchableOpacity>
          </View>

          {primaryMasjid ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/masjid/${primaryMasjid.id}`);
              }}
              style={styles.primaryMasjidBody}
            >
              <View style={styles.primaryMasjidIconWrap}>
                <Ionicons name="business" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.primaryMasjidName} numberOfLines={1}>
                  {primaryMasjid.name}
                </Text>
                <Text style={styles.primaryMasjidLocation} numberOfLines={1}>
                  {primaryMasjid.subDivision ? `${primaryMasjid.subDivision}, ` : ""}
                  {primaryMasjid.city || "Local Area"} • Tap for full timetable
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openSelectModal();
              }}
              style={styles.noPrimaryBanner}
            >
              <View style={styles.noPrimaryIconWrap}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.noPrimaryTitle}>Set Your Primary Masjid</Text>
                <Text style={styles.noPrimarySub}>Tap to select your local masjid for verified prayer times</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Masjids Section */}
        <View style={styles.masjidsSectionHeader}>
          <View>
            <Text style={styles.masjidsSectionTitle}>
              Masjids in {selectedCity || "Your City"}
            </Text>
            <Text style={styles.masjidsSectionSub}>
              {filteredMasjids.length} {filteredMasjids.length === 1 ? "masjid" : "masjids"} available
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push("/nearby-masjids")}
          >
            <Text style={styles.viewAllText}>View Map</Text>
            <Ionicons name="map-outline" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Input Row with Voice Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color="#8A998A" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search masjids, areas..."
              placeholderTextColor="#8A998A"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#8A998A" />
              </TouchableOpacity>
            )}
          </View>
          <VoiceSearchButton onSearch={setSearch} />
        </View>

        {/* Sub-division / Mohalla Filters */}
        {subDivisions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subDivScroll}
          >
            <TouchableOpacity
              style={[
                styles.subDivChip,
                !selectedSubDivision && styles.subDivChipActive,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedSubDivision(null);
              }}
            >
              <Text
                style={[
                  styles.subDivChipText,
                  !selectedSubDivision && styles.subDivChipTextActive,
                ]}
              >
                All Areas
              </Text>
            </TouchableOpacity>
            {subDivisions.map((sub) => {
              const isSelected = selectedSubDivision === sub;
              return (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.subDivChip,
                    isSelected && styles.subDivChipActive,
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedSubDivision(isSelected ? null : sub);
                  }}
                >
                  <Text
                    style={[
                      styles.subDivChipText,
                      isSelected && styles.subDivChipTextActive,
                    ]}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Dynamic Masjid List */}
        {loadingMasjids ? (
          <View style={styles.masjidsLoadingWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading masjids...</Text>
          </View>
        ) : filteredMasjids.length === 0 ? (
          <View style={styles.emptyMasjidsWrap}>
            <Ionicons name="search-outline" size={32} color="#B0BEC5" />
            <Text style={styles.emptyMasjidsTitle}>No Masjids Found</Text>
            <Text style={styles.emptyMasjidsSub}>
              {search.trim()
                ? `No results matching "${search}"`
                : "No masjids recorded in this location yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.masjidsListWrap}>
            {filteredMasjids.map((m) => (
              <MasjidCard
                key={m.id}
                masjid={m}
                onPress={() => router.push(`/masjid/${m.id}`)}
                isPrimary={m.id === primaryMasjid?.id}
              />
            ))}
          </View>
        )}

        <View style={{ height: Math.max(insets.bottom, 16) + 100 }} />
      </ScrollView>

      {/* Interactive Amal Tracker Modal */}
      <AmalTrackerModal
        visible={amalModalVisible}
        onClose={() => setAmalModalVisible(false)}
        onUpdateCount={(completed) => setCompletedAmalCount(completed)}
      />

      {/* Prayer Alarm Settings Modal */}
      <PrayerAlarmSettingsModal
        visible={alarmModalVisible}
        onClose={() => setAlarmModalVisible(false)}
        primaryMasjidName={primaryMasjid?.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  locationContainer: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  hijriDateSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#5C6B5C",
    marginTop: 2,
  },
  gregorianDateSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#8A998A",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0F4EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarBtn: {
    backgroundColor: "#E8F5EE",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  heroCardTouch: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
  heroPrayerCard: {
    borderRadius: 20,
    padding: 20,
  },
  heroContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroNextHeaderTag: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  heroNextLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#B2DFDB",
  },
  heroPrayerName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
  },
  heroPrayerTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 28,
    color: "#FFFFFF",
    marginTop: -2,
  },
  heroMasjidSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#E0F2F1",
    marginTop: 2,
  },
  heroRightCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  countdownRingWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  countdownCenterTextWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownInLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: "#E0F2F1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countdownInText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 1,
  },
  horizontalPrayerCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  prayerSlotBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  prayerSlotBoxActive: {
    backgroundColor: "#E0F2F1",
    borderWidth: 1,
    borderColor: "#80CBC4",
  },
  slotLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  slotLabelActive: {
    color: Colors.primaryDark,
    fontFamily: "Poppins_600SemiBold",
  },
  slotTime: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: "#1A2E1A",
  },
  slotTimeActive: {
    color: Colors.primary,
    fontFamily: "Poppins_600SemiBold",
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    rowGap: 12,
  },
  toolTile: {
    width: "23%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  toolTileTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#1A2E1A",
  },
  amalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  amalLeftIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  amalCenterWrap: {
    flex: 1,
  },
  amalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
    marginBottom: 4,
  },
  amalProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amalCounterText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  amalProgressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2ECE6",
    overflow: "hidden",
  },
  amalProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  primaryMasjidCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 20,
  },
  primaryMasjidHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F1",
  },
  primaryMasjidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  primaryMasjidBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#D4A843",
    letterSpacing: 0.5,
  },
  changePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#EAF4F4",
  },
  changePrimaryText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.primary,
  },
  primaryMasjidBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryMasjidIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryMasjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  primaryMasjidLocation: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  noPrimaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  noPrimaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  noPrimaryTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  noPrimarySub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  masjidsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  masjidsSectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  masjidsSectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#EAF4F4",
  },
  viewAllText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A2E1A",
    padding: 0,
  },
  subDivScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  subDivChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  subDivChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subDivChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subDivChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  masjidsListWrap: {
    marginTop: 4,
  },
  masjidsLoadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyMasjidsWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginVertical: 8,
  },
  emptyMasjidsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
    marginTop: 8,
  },
  emptyMasjidsSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  masjidFooterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  masjidFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  masjidFooterTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
  },
  masjidFooterSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
