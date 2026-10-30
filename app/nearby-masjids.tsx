import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Rect, Path, G, Defs, LinearGradient, Stop } from "react-native-svg";
import Colors from "@/constants/colors";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { useLocation } from "@/lib/location-context";
import { usePrayerCountdown } from "@/lib/prayer-timer";
import { Masjid } from "@/lib/types";
import { getAllMasjids } from "@/lib/store";
import { VoiceSearchButton } from "@/components/voice-search-button";
import { showCustomAlert } from "@/lib/custom-alert";

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

// Open Google / Apple Maps with turn-by-turn navigation directly to a masjid
function openMasjidDirections(masjid: Masjid) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const query = `${masjid.name}, ${masjid.address || masjid.subDivision || ""}, ${masjid.city}, ${masjid.state || ""}`;
  const encodedQuery = encodeURIComponent(query.trim());

  const mapUrl = Platform.select({
    ios: `maps://?daddr=${encodedQuery}&dirflg=d`,
    android: `google.navigation:q=${encodedQuery}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`,
  });

  void Linking.openURL(mapUrl as string).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`);
  });
}

// Open live map search showing all masjids in user's city
function openAllNearbyInMaps(city?: string | null) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const query = encodeURIComponent(city ? `masjids in ${city}` : "masjids near me");
  const mapUrl = Platform.select({
    ios: `maps:0,0?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  });

  void Linking.openURL(mapUrl as string).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  });
}

// Individual Functional Nearby Masjid Card
function NearbyMasjidCardItem({
  masjid,
  isPrimary,
  onPress,
  onDirections,
  onSelectPrimary,
}: {
  masjid: Masjid;
  isPrimary: boolean;
  onPress: () => void;
  onDirections: () => void;
  onSelectPrimary: () => void;
}) {
  const countdown = usePrayerCountdown(masjid.timetable);
  const isFriday = new Date().getDay() === 5;
  const t = masjid.timetable;

  return (
    <View style={[styles.masjidCard, isPrimary && styles.masjidCardPrimary]}>
      {/* Top Header */}
      <TouchableOpacity
        style={styles.cardHeaderPressable}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIconBox, isPrimary && styles.cardIconBoxPrimary]}>
            <Ionicons
              name={isPrimary ? "star" : "business"}
              size={18}
              color={isPrimary ? "#D97706" : "#0D7377"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {masjid.name}
              </Text>
              {isPrimary && (
                <View style={styles.primaryPillTag}>
                  <Text style={styles.primaryPillTagText}>Primary</Text>
                </View>
              )}
            </View>
            <View style={styles.cardLocationRow}>
              <Ionicons name="location-sharp" size={13} color="#0D7377" />
              <Text style={styles.cardLocationText} numberOfLines={1}>
                {[masjid.subDivision, masjid.city].filter(Boolean).join(", ") || masjid.address}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>

      {/* Next Prayer Countdown Pill */}
      {countdown.nextPrayerKey && (
        <View style={styles.countdownRowWrap}>
          <View style={styles.countdownLeft}>
            <Text style={styles.countdownNextLabel}>Next:</Text>
            <Text style={styles.countdownNextName}>{countdown.nextPrayerName}</Text>
            <Text style={styles.countdownNextTime}>{countdown.nextPrayerTimeFormatted}</Text>
          </View>
          <View style={styles.countdownTimerBadge}>
            <Ionicons name="time-outline" size={12} color="#0D7377" />
            <Text style={styles.countdownTimerBadgeText}>
              {countdown.isNow ? "NOW" : `in ${countdown.formattedRemaining}`}
            </Text>
          </View>
        </View>
      )}

      {/* 5 Daily Prayers Preview */}
      {t ? (
        <View style={styles.cardTimesRow}>
          {[
            { label: "Fajr", time: formatDisplayTime(t.fajr) },
            {
              label: isFriday ? "Jummah" : "Dhuhr",
              time: isFriday && t.jummah ? formatDisplayTime(t.jummah) : formatDisplayTime(t.dhuhr),
            },
            { label: "Asr", time: formatDisplayTime(t.asr) },
            { label: "Maghrib", time: formatDisplayTime(t.maghrib) },
            { label: "Isha", time: formatDisplayTime(t.isha) },
          ].map((item) => (
            <View key={item.label} style={styles.timeSlot}>
              <Text style={styles.timeSlotLabel}>{item.label}</Text>
              <Text style={styles.timeSlotValue}>{item.time}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Action Buttons Row: Directions, Details, Set Primary */}
      <View style={styles.cardActionRow}>
        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={onDirections}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={15} color="#FFFFFF" />
          <Text style={styles.directionsBtnText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={15} color="#0D7377" />
          <Text style={styles.detailsBtnText}>Timetable</Text>
        </TouchableOpacity>

        {!isPrimary && (
          <TouchableOpacity
            style={styles.setPrimaryBtn}
            onPress={onSelectPrimary}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={14} color="#D97706" />
            <Text style={styles.setPrimaryBtnText}>Set Primary</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function NearbyMasjidsScreen() {
  const insets = useSafeAreaInsets();
  const { primaryMasjid, selectPrimaryMasjid } = usePrimaryMasjid();
  const { selectedCity, selectedSubDivision, openLocationModal } = useLocation();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "subdivision">("name");
  const [filterSubDivision, setFilterSubDivision] = useState<string | null>(null);

  // Load real masjids from database
  const loadMasjidsData = useCallback(async () => {
    try {
      const data = await getAllMasjids();
      setMasjids(data);
    } catch (err) {
      console.error("Failed to fetch masjids in nearby screen:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMasjidsData();
  }, [loadMasjidsData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadMasjidsData();
  };

  // Sub-divisions dynamically extracted from current masjids
  const subDivisions = useMemo(() => {
    const set = new Set<string>();
    masjids.forEach((m) => {
      if (m.subDivision) {
        if (!selectedCity || (m.city && m.city.toLowerCase().includes(selectedCity.toLowerCase()))) {
          set.add(m.subDivision);
        }
      }
    });
    return Array.from(set).sort();
  }, [masjids, selectedCity]);

  // Filter and sort masjids
  const filteredMasjids = useMemo(() => {
    let result = [...masjids];

    // Filter by selected city
    if (selectedCity && selectedCity !== "All" && selectedCity !== "All Cities") {
      result = result.filter(
        (m) =>
          m.city &&
          (m.city.toLowerCase().includes(selectedCity.toLowerCase()) ||
            selectedCity.toLowerCase().includes(m.city.toLowerCase()))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.address && m.address.toLowerCase().includes(q)) ||
          (m.subDivision && m.subDivision.toLowerCase().includes(q)) ||
          (m.city && m.city.toLowerCase().includes(q))
      );
    }

    // Modal sub-division filter
    if (filterSubDivision) {
      result = result.filter(
        (m) => m.subDivision && m.subDivision.toLowerCase() === filterSubDivision.toLowerCase()
      );
    }

    // Sorting
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "subdivision") {
      result.sort((a, b) => (a.subDivision || "").localeCompare(b.subDivision || ""));
    }

    // Prioritize primary masjid at the top if present
    if (primaryMasjid) {
      result.sort((a, b) => (a.id === primaryMasjid.id ? -1 : b.id === primaryMasjid.id ? 1 : 0));
    }

    return result;
  }, [masjids, selectedCity, searchQuery, filterSubDivision, sortBy, primaryMasjid]);

  // Handle setting primary masjid
  const handleSelectPrimary = async (m: Masjid) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await selectPrimaryMasjid(m.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert("Primary Masjid Set", `${m.name} is now your primary masjid!`);
    } catch (err) {
      console.error("Failed to select primary masjid:", err);
      showCustomAlert("Error", "Could not set primary masjid. Please try again.");
    }
  };

  const renderMasjidCard = ({ item }: { item: Masjid }) => {
    return (
      <NearbyMasjidCardItem
        masjid={item}
        isPrimary={item.id === primaryMasjid?.id}
        onPress={() => router.push(`/masjid/${item.id}`)}
        onDirections={() => openMasjidDirections(item)}
        onSelectPrimary={() => handleSelectPrimary(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Top Header: Back, Location Selector Pill & Live Map Action */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerLocationSelector}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openLocationModal();
          }}
          activeOpacity={0.8}
          accessibilityLabel="Change city location"
        >
          <Ionicons name="location" size={15} color="#0D7377" />
          <Text style={styles.headerLocationTitle} numberOfLines={1}>
            {selectedCity || "Select City"}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#475569" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openAllNearbyInMaps(selectedCity)}
          style={styles.headerMapBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Open all in Google Maps"
        >
          <Ionicons name="map-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar with Voice Search & Filter Modal Icon */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search masjid, area, or road..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <VoiceSearchButton onSearch={setSearchQuery} />
        <TouchableOpacity
          style={[styles.filterIconBtn, filterSubDivision && styles.filterIconBtnActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
          accessibilityLabel="Filter and sort options"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterSubDivision ? "#FFFFFF" : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMasjids}
        keyExtractor={(item) => item.id}
        renderItem={renderMasjidCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + 120 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          /* Interactive Map & Directions Hero Card */
          <View style={styles.mapHeroCard}>
            <View style={styles.mapPreviewContainer}>
              <Svg width="100%" height={150} viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
                <Defs>
                  <LinearGradient id="mapBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#F0F8F5" />
                    <Stop offset="100%" stopColor="#E2F0EA" />
                  </LinearGradient>
                </Defs>
                {/* Background grid */}
                <Rect width="360" height="150" fill="url(#mapBgGrad)" rx="16" />

                {/* Roads & Avenues */}
                <Path
                  d="M -10 40 L 370 40 M -10 95 L 370 95 M 80 -10 L 80 160 M 180 -10 L 180 160 M 280 -10 L 280 160 M 20 15 L 340 135 M 340 15 L 20 135"
                  stroke="#D3E5DC"
                  strokeWidth="3"
                />
                <Path
                  d="M -10 68 L 370 68 M 180 -10 L 180 160"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                />

                {/* User Location Radar / Beacon */}
                <Circle cx="180" cy="75" r="36" fill="#3B82F6" opacity="0.12" />
                <Circle cx="180" cy="75" r="22" fill="#3B82F6" opacity="0.25" />
                <Circle cx="180" cy="75" r="8" fill="#2563EB" />
                <Circle cx="180" cy="75" r="3.5" fill="#FFFFFF" />

                {/* Masjid Map Pins */}
                {/* Pin 1: Primary Masjid */}
                <G transform="translate(100, 32)">
                  <Circle cx="12" cy="12" r="14" fill="#0D7377" />
                  <Circle cx="12" cy="12" r="5" fill="#FFD700" />
                </G>

                {/* Pin 2 */}
                <G transform="translate(245, 38)">
                  <Circle cx="12" cy="12" r="12" fill="#0D7377" />
                  <Circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
                </G>

                {/* Pin 3 */}
                <G transform="translate(125, 105)">
                  <Circle cx="12" cy="12" r="11" fill="#14A3A8" />
                  <Circle cx="12" cy="12" r="4" fill="#FFFFFF" />
                </G>

                {/* Pin 4 */}
                <G transform="translate(260, 98)">
                  <Circle cx="12" cy="12" r="11" fill="#14A3A8" />
                  <Circle cx="12" cy="12" r="4" fill="#FFFFFF" />
                </G>
              </Svg>

              {/* Floating Map Controls & Info Overlay */}
              <View style={styles.mapInfoOverlay}>
                <View style={styles.mapInfoLeft}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.mapInfoTitle}>
                    {filteredMasjids.length} {filteredMasjids.length === 1 ? "Masjid" : "Masjids"} Found
                  </Text>
                  <Text style={styles.mapInfoSub} numberOfLines={1}>
                    {selectedCity || "Your Location"}
                    {filterSubDivision ? ` • ${filterSubDivision}` : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.openMapPillBtn}
                  onPress={() => openAllNearbyInMaps(selectedCity)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map" size={14} color="#FFFFFF" />
                  <Text style={styles.openMapPillText}>Open Live Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.emptySubText}>Loading verified masjids...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={34} color="#B0BEC5" />
              <Text style={styles.emptyTitleText}>No Masjids Found</Text>
              <Text style={styles.emptySubText}>
                {searchQuery
                  ? `No results matching "${searchQuery}" in ${selectedCity || "your city"}`
                  : `No masjids listed for ${selectedCity || "this area"} yet`}
              </Text>
              <TouchableOpacity
                style={styles.emptySwitchCityBtn}
                onPress={openLocationModal}
              >
                <Ionicons name="swap-horizontal" size={14} color="#FFFFFF" />
                <Text style={styles.emptySwitchCityText}>Change City</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Bottom Sticky Action Button: Navigate to Primary or Nearest */}
      {filteredMasjids.length > 0 && (
        <View style={[styles.bottomBar, { bottom: bottomPadding + 16 }]}>
          <TouchableOpacity
            style={styles.bottomNavBtn}
            activeOpacity={0.88}
            onPress={() => {
              const target = primaryMasjid || filteredMasjids[0];
              if (target) {
                openMasjidDirections(target);
              } else {
                openAllNearbyInMaps(selectedCity);
              }
            }}
          >
            <View style={styles.bottomBtnIconCircle}>
              <Ionicons name="navigate" size={18} color="#0D7377" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomBtnTitle} numberOfLines={1}>
                {primaryMasjid
                  ? `Directions to ${primaryMasjid.name}`
                  : `Directions to ${filteredMasjids[0].name}`}
              </Text>
              <Text style={styles.bottomBtnSub}>
                Tap to start GPS turn-by-turn navigation
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter & Sort Bottom Sheet Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter & Sort Masjids</Text>
                <Text style={styles.modalSubtitle}>Find your nearest mosque & prayer times</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Sort By Section */}
              <Text style={styles.modalSectionTitle}>Sort By</Text>
              <View style={styles.modalSortRow}>
                <TouchableOpacity
                  style={[styles.modalSortBtn, sortBy === "name" && styles.modalSortBtnActive]}
                  onPress={() => setSortBy("name")}
                >
                  <Ionicons
                    name="text"
                    size={16}
                    color={sortBy === "name" ? "#FFFFFF" : Colors.primary}
                  />
                  <Text style={[styles.modalSortBtnText, sortBy === "name" && styles.modalSortBtnTextActive]}>
                    Masjid Name (A-Z)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSortBtn, sortBy === "subdivision" && styles.modalSortBtnActive]}
                  onPress={() => setSortBy("subdivision")}
                >
                  <Ionicons
                    name="navigate-circle"
                    size={16}
                    color={sortBy === "subdivision" ? "#FFFFFF" : Colors.primary}
                  />
                  <Text style={[styles.modalSortBtnText, sortBy === "subdivision" && styles.modalSortBtnTextActive]}>
                    By Area / Tehsil
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sub-division / Mohalla Filter */}
              {subDivisions.length > 0 && (
                <>
                  <Text style={[styles.modalSectionTitle, { marginTop: 18 }]}>
                    Filter by Sub-Division ({selectedCity || "City"})
                  </Text>
                  <View style={styles.modalSubDivRow}>
                    <TouchableOpacity
                      style={[
                        styles.modalSubDivChip,
                        !filterSubDivision && styles.modalSubDivChipActive,
                      ]}
                      onPress={() => setFilterSubDivision(null)}
                    >
                      <Text
                        style={[
                          styles.modalSubDivChipText,
                          !filterSubDivision && styles.modalSubDivChipTextActive,
                        ]}
                      >
                        All Areas
                      </Text>
                    </TouchableOpacity>
                    {subDivisions.map((sub) => {
                      const isSelected = filterSubDivision === sub;
                      return (
                        <TouchableOpacity
                          key={sub}
                          style={[
                            styles.modalSubDivChip,
                            isSelected && styles.modalSubDivChipActive,
                          ]}
                          onPress={() => setFilterSubDivision(isSelected ? null : sub)}
                        >
                          <Text
                            style={[
                              styles.modalSubDivChipText,
                              isSelected && styles.modalSubDivChipTextActive,
                            ]}
                          >
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Reset & Apply Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalResetBtn}
                  onPress={() => {
                    setFilterSubDivision(null);
                    setSortBy("name");
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.modalResetBtnText}>Reset All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalApplyBtn}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.modalApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    height: 52,
  },
  backBtn: {
    padding: 6,
  },
  headerLocationSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 5,
    maxWidth: 220,
  },
  headerLocationTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#0D7377",
  },
  headerMapBtn: {
    padding: 6,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#1A2E1A",
  },
  filterIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  filterIconBtnActive: {
    backgroundColor: "#0D7377",
    borderColor: "#0D7377",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  mapHeroCard: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCECE3",
  },
  mapPreviewContainer: {
    position: "relative",
    width: "100%",
    height: 150,
  },
  mapInfoOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2EDE7",
  },
  mapInfoLeft: {
    flex: 1,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
    marginBottom: 2,
  },
  mapInfoTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  mapInfoSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  openMapPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7377",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  openMapPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#FFFFFF",
  },
  // Card styles
  masjidCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E6EDE8",
  },
  masjidCardPrimary: {
    borderColor: "#0D7377",
    backgroundColor: "#FBFDFB",
  },
  cardHeaderPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E0F2F1",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconBoxPrimary: {
    backgroundColor: "#FEF3C7",
  },
  cardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  primaryPillTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  primaryPillTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
    color: "#B45309",
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  cardLocationText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  countdownRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F4FAF6",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  countdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  countdownNextLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  countdownNextName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#0D7377",
  },
  countdownNextTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#1A2E1A",
  },
  countdownTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  countdownTimerBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#0D7377",
  },
  cardTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F1",
    marginTop: 4,
  },
  timeSlot: {
    alignItems: "center",
  },
  timeSlotLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  timeSlotValue: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#1A2E1A",
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  directionsBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D7377",
    borderRadius: 10,
    paddingVertical: 8,
    gap: 5,
  },
  directionsBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  detailsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2F1",
    borderRadius: 10,
    paddingVertical: 8,
    gap: 4,
  },
  detailsBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#0D7377",
  },
  setPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  setPrimaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#B45309",
  },
  // Bottom Sticky Bar
  bottomBar: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  bottomNavBtn: {
    backgroundColor: "#0D7377",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomBtnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  bottomBtnSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: "#E0F2F1",
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginVertical: 12,
  },
  emptyTitleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
    marginTop: 10,
  },
  emptySubText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  emptySwitchCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7377",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptySwitchCityText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#FFFFFF",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#1A2E1A",
  },
  modalSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
    marginBottom: 8,
  },
  modalSortRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalSortBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F4EC",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2EDE7",
  },
  modalSortBtnActive: {
    backgroundColor: "#0D7377",
    borderColor: "#0D7377",
  },
  modalSortBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#1A2E1A",
  },
  modalSortBtnTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  modalSubDivRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalSubDivChip: {
    backgroundColor: "#F0F4EC",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2EDE7",
  },
  modalSubDivChipActive: {
    backgroundColor: "#0D7377",
    borderColor: "#0D7377",
  },
  modalSubDivChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  modalSubDivChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  modalResetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F4EC",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalResetBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D7377",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalApplyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#FFFFFF",
  },
});
