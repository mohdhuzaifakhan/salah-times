import { EventCard } from "@/components/EventCard";
import { MasjidCard } from "@/components/MasjidCard";
import { ExploreSkeleton } from "@/components/Skeleton";
// import { NativeMasjidAdCard } from "@/components/ads/NativeMasjidAdCard";
// import { PremiumBannerAd } from "@/components/ads/PremiumBannerAd";
import { VoiceSearchButton } from "@/components/voice-search-button";
import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import { useLanguage } from "@/lib/language-context";
import { useLocation } from "@/lib/location-context";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { getAllMasjids, getGlobalEvents } from "@/lib/store";
import { AppEvent, Masjid } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { QueryDocumentSnapshot } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getUpcomingPrayerDetails, usePrayerCountdown } from "@/lib/prayer-timer";

function formatTimeCompact(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const displayHour = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${m} ${ampm}`;
}

function PrimaryMasjidCardView({ masjid, onPress }: { masjid: Masjid; onPress: () => void }) {
  const countdown = usePrayerCountdown(masjid.timetable);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryCard,
        pressed && styles.primaryCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.primaryCardHeader}>
        <View style={styles.primaryCardIconWrap}>
          <Ionicons name="star" size={16} color="#fff" />
        </View>
        <View style={styles.primaryCardInfo}>
          <Text style={styles.primaryCardLabel}>
            YOUR PRIMARY MASJID{masjid.subDivision ? ` • ${masjid.subDivision.toUpperCase()}` : ""}
          </Text>
          <Text style={styles.primaryCardName} numberOfLines={1}>
            {masjid.name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>

      {countdown.nextPrayerKey && (
        <View style={styles.primaryCountdownBanner}>
          <Ionicons name="time-outline" size={14} color={Colors.primary} />
          <Text style={styles.primaryCountdownText}>
            Next: <Text style={{ fontFamily: "Poppins_700Bold", color: Colors.primaryDark }}>{countdown.nextPrayerName}</Text> at {countdown.nextPrayerTimeFormatted}{" "}
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: countdown.isNow ? Colors.error : Colors.accent }}>
              ({countdown.isNow ? "NOW" : `in ${countdown.formattedRemaining}`})
            </Text>
          </Text>
        </View>
      )}

      <View style={styles.primaryCardTimesRow}>
        {(() => {
          const isFriday = new Date().getDay() === 5;
          const noonKey = isFriday ? "jummah" : "dhuhr";
          const noonLabel = isFriday ? "Jummah" : "Dhuhr";
          const noonTime = isFriday
            ? (masjid.timetable.jummah || masjid.timetable.dhuhr)
            : masjid.timetable.dhuhr;

          return [
            { key: "fajr", label: "Fajr", time: masjid.timetable.fajr },
            { key: noonKey, label: noonLabel, time: noonTime },
            { key: "asr", label: "Asr", time: masjid.timetable.asr },
            { key: "maghrib", label: "Maghrib", time: masjid.timetable.maghrib },
            { key: "isha", label: "Isha", time: masjid.timetable.isha },
          ].map((item) => {
            const isNext = countdown.nextPrayerKey === item.key;
            return (
              <View
                key={item.key}
                style={[
                  styles.primaryCardTimeItem,
                  isNext && styles.primaryCardTimeItemActive,
                ]}
              >
                <Text style={[styles.primaryCardTimeLabel, isNext && styles.primaryCardTimeLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.primaryCardTimeValue, isNext && styles.primaryCardTimeValueActive]}>
                  {formatTimeCompact(item.time)}
                </Text>
              </View>
            );
          });
        })()}
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { primaryMasjid, primaryMasjidId, openSelectModal, refreshPrimaryMasjid } = usePrimaryMasjid();
  const {
    selectedCity,
    selectedState,
    selectedSubDivision,
    locations,
    openLocationModal,
    selectLocation,
    selectSubDivision
  } = useLocation();
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDocSnap, setLastDocSnap] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const configuredCitiesSet = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => {
      loc.cities.forEach((c) => set.add(c.trim().toLowerCase()));
    });
    return set;
  }, [locations]);

  const isCityFilterActive = Boolean(
    selectedCity &&
    selectedCity.toLowerCase() !== "all" &&
    selectedCity.toLowerCase() !== "all cities" &&
    selectedCity.toLowerCase() !== "all states"
  );

  const availableSubDivisions = useMemo(() => {
    if (!isCityFilterActive || !selectedCity) {
      return [];
    }

    const targetCity = selectedCity.trim().toLowerCase();
    const list: string[] = [];

    locations.forEach((loc) => {
      (loc.districts || []).forEach((d) => {
        if (
          d.name.trim().toLowerCase() === targetCity ||
          d.id.trim().toLowerCase() === targetCity
        ) {
          (d.subDivisions || []).forEach((s) => {
            if (!list.includes(s)) list.push(s);
          });
        }
      });
    });

    return list;
  }, [locations, selectedCity, isCityFilterActive]);

  useEffect(() => {
    if (selectedSubDivision && !availableSubDivisions.includes(selectedSubDivision)) {
      void selectSubDivision(null);
    }
  }, [selectedSubDivision, availableSubDivisions, selectSubDivision]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [allMasjidsData, eventsData] = await Promise.all([
        getAllMasjids(),
        getGlobalEvents(),
        refreshPrimaryMasjid(),
      ]);

      setMasjids(allMasjidsData);
      setEvents(eventsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      showCustomAlert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [refreshPrimaryMasjid]);

  // Load data on mount & focus
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const [sortBy, setSortBy] = useState<"earliest" | "alphabetical">("earliest");

  const filteredMasjids = useMemo(() => {
    let result = [...masjids];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) =>
        fuzzyMatch(`${m.name} ${m.city || ""} ${m.subDivision || ""} ${m.address || ""}`, q)
      );
    }

    if (isCityFilterActive && selectedCity) {
      const targetCity = selectedCity.trim().toLowerCase();
      result = result.filter((m) => {
        const mCity = m.city ? m.city.trim().toLowerCase() : "";
        if (targetCity === "other") {
          return !mCity || (configuredCitiesSet ? !configuredCitiesSet.has(mCity) : false);
        }
        return mCity === targetCity;
      });
    }

    if (selectedSubDivision) {
      const targetSub = selectedSubDivision.trim().toLowerCase();
      result = result.filter((m) => {
        const mSub = m.subDivision ? m.subDivision.trim().toLowerCase() : "";
        return mSub === targetSub || m.name.toLowerCase().includes(targetSub) || (m.address || "").toLowerCase().includes(targetSub);
      });
    }

    const now = new Date();
    if (sortBy === "earliest") {
      result.sort((a, b) => {
        const detailA = getUpcomingPrayerDetails(a.timetable, now);
        const detailB = getUpcomingPrayerDetails(b.timetable, now);
        return detailA.remainingSeconds - detailB.remainingSeconds;
      });
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [masjids, search, selectedCity, selectedSubDivision, isCityFilterActive, configuredCitiesSet, sortBy]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerSection}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{t('assalamu_alaikum')}</Text>
            <Pressable
              style={styles.locationChip}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openLocationModal();
              }}
            >
              <Ionicons name="location" size={13} color={Colors.primary} />
              <Text style={styles.locationChipText} numberOfLines={1}>
                {selectedCity || "All Cities"}
              </Text>
              <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Pressable
            style={styles.headerDropdownSelectBox}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openSelectModal();
            }}
          >
            <Ionicons name="star" size={13} color={primaryMasjid ? Colors.accent : Colors.textMuted} />
            <Text style={styles.headerDropdownSelectText} numberOfLines={1}>
              {primaryMasjid ? primaryMasjid.name : "Select Primary"}
            </Text>
            <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.title}>{t('find_prayer_times')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_masjids')}
          placeholderTextColor="#7D8A8A"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Ionicons
            name="close-circle"
            size={18}
            color={Colors.textMuted}
            onPress={() => setSearch("")}
          />
        ) : (
          <VoiceSearchButton onTranscript={setSearch} size={22} color={Colors.textMuted} />
        )}
      </View>

      {availableSubDivisions.length > 0 && (
        <View style={styles.subDivisionRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subDivisionScroll}
          >
            <Pressable
              style={[
                styles.subDivisionChip,
                !selectedSubDivision && styles.subDivisionChipActive,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void selectSubDivision(null);
              }}
            >
              <Text
                style={[
                  styles.subDivisionChipText,
                  !selectedSubDivision && styles.subDivisionChipTextActive,
                ]}
              >
                All Areas
              </Text>
            </Pressable>

            {availableSubDivisions.map((sub) => {
              const isActive = selectedSubDivision === sub;
              return (
                <Pressable
                  key={sub}
                  style={[
                    styles.subDivisionChip,
                    isActive && styles.subDivisionChipActive,
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void selectSubDivision(isActive ? null : sub);
                  }}
                >
                  <Text
                    style={[
                      styles.subDivisionChipText,
                      isActive && styles.subDivisionChipTextActive,
                    ]}
                  >
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
      {loading ? (
        <ExploreSkeleton />
      ) : (
        <FlatList
          data={filteredMasjids}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            return (
              <MasjidCard
                masjid={item}
                isPrimary={item.id === primaryMasjidId}
                onPress={() =>
                  router.push({
                    pathname: "/masjid/[id]",
                    params: { id: item.id },
                  })
                }
              />
            );
          }}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 130 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              {primaryMasjid && primaryMasjid.timetable ? (
                <PrimaryMasjidCardView
                  masjid={primaryMasjid}
                  onPress={() =>
                    router.push({
                      pathname: "/masjid/[id]",
                      params: { id: primaryMasjid.id },
                    })
                  }
                />
              ) : null}

              {events.length > 0 ? (
                <View style={styles.eventsContainer}>
                  <Text style={styles.subSectionTitle}>Announcements</Text>
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>
              ) : null}

              <View style={styles.exploreHeaderRow}>
                <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                  <Text style={[styles.subSectionTitle, { marginTop: 0, marginBottom: 2 }]} numberOfLines={1} ellipsizeMode="tail">
                    {isCityFilterActive
                      ? `Masjids in ${selectedCity} (${filteredMasjids.length})`
                      : `All Registered Masjids (${filteredMasjids.length})`}
                  </Text>
                  <Text style={styles.sortSubtext} numberOfLines={1} ellipsizeMode="tail">
                    {sortBy === "earliest"
                      ? "Sorted by earliest Jamat"
                      : "Sorted alphabetically"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sortBtn,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSortBy(sortBy === "earliest" ? "alphabetical" : "earliest");
                    }}
                  >
                    <Ionicons
                      name={sortBy === "earliest" ? "time-outline" : "text-outline"}
                      size={13}
                      color={Colors.primary}
                    />
                    <Text style={styles.sortBtnText} numberOfLines={1}>
                      {sortBy === "earliest" ? "Earliest" : "A-Z"}
                    </Text>
                  </Pressable>

                  {isCityFilterActive && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.allCitiesBtn,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        void selectLocation("All Cities", "All States");
                      }}
                    >
                      <Ionicons name="apps-outline" size={13} color={Colors.primary} style={{ marginRight: 2 }} />
                      <Text style={styles.allCitiesBtnText} numberOfLines={1}>Show All</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="location-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {search
                  ? `No masjids found matching "${search}"`
                  : isCityFilterActive
                    ? `No registered masjids in ${selectedCity}`
                    : "No registered masjids found"}
              </Text>
              <Text style={styles.emptyText}>
                {isCityFilterActive
                  ? "Try selecting 'All Cities' to view all registered masjids across all locations."
                  : "Try searching with a different keyword."}
              </Text>
              {isCityFilterActive && (
                <Pressable
                  style={styles.switchCityBtn}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void selectLocation("All Cities", "All States");
                  }}
                >
                  <Ionicons name="grid" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.switchCityBtnText}>Show All Cities</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
      {/* <PremiumBannerAd inTabBar={true} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  // greetingRow: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "space-between",
  //   gap: 10,
  // },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  locationChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  greeting: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: Colors.text,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  list: {
    paddingHorizontal: 20,
  },
  eventsContainer: {
    marginBottom: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    width: "100%",
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  subSectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  primaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  primaryCardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  primaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 12,
    marginBottom: 12,
  } as ViewStyle,
  primaryCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCardInfo: {
    flex: 1,
  },
  primaryCardLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
  primaryCardName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginTop: -1,
  },
  primaryCountdownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.overlay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  primaryCountdownText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.text,
  },
  primaryCardTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  primaryCardTimeItem: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryCardTimeItemActive: {
    backgroundColor: Colors.overlay,
  },
  primaryCardTimeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  primaryCardTimeLabelActive: {
    color: Colors.primary,
    fontFamily: "Poppins_700Bold",
  },
  primaryCardTimeValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  primaryCardTimeValueActive: {
    color: Colors.primaryDark,
    fontFamily: "Poppins_700Bold",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  headerDropdownSelectBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.borderLight,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 180,
  },
  headerDropdownSelectText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.text,
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  modalClearItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalClearText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.error,
  },
  modalMasjidItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  modalMasjidIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMasjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  modalMasjidCity: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },
  exploreHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  sortSubtext: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
    flexShrink: 0,
  },
  sortBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  btnPressed: {
    opacity: 0.7,
  },
  allCitiesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
    flexShrink: 0,
  },
  allCitiesBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  switchCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 18,
    alignSelf: "center",
  },
  switchCityBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  footerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  subDivisionRow: {
    marginBottom: 12,
  },
  subDivisionScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  subDivisionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  subDivisionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subDivisionChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subDivisionChipTextActive: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
  },
});
