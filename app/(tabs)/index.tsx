import React, { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/lib/language-context";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  RefreshControl,
  Platform,
  Pressable,
  Modal,
  TouchableOpacity,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Masjid, AppEvent } from "@/lib/types";
import { getAllMasjids, getGlobalEvents, getPrimaryMasjidId, getMasjidById, savePrimaryMasjidId } from "@/lib/store";
import { schedulePrimaryMasjidNotifications, clearScheduledNotifications } from "@/lib/notifications";
import { MasjidCard } from "@/components/MasjidCard";
import { EventCard } from "@/components/EventCard";
import { ExploreSkeleton } from "@/components/Skeleton";
import { PremiumBannerAd } from "@/components/ads/PremiumBannerAd";
import { NativeMasjidAdCard } from "@/components/ads/NativeMasjidAdCard";

function formatTimeCompact(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const displayHour = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${m} ${ampm}`;
}

export default function ExploreScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [primaryMasjid, setPrimaryMasjid] = useState<Masjid | null>(null);
  const [primaryMasjidId, setPrimaryMasjidId] = useState<string | null>(null);
  const [showMasjidModal, setShowMasjidModal] = useState(false);
  const [masjidSearch, setMasjidSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [masjidsData, eventsData, primaryId] = await Promise.all([
        getAllMasjids(),
        getGlobalEvents(),
        getPrimaryMasjidId(),
      ]);
      setMasjids(masjidsData);
      setEvents(eventsData);
      setPrimaryMasjidId(primaryId);
      if (primaryId) {
        const primaryData = masjidsData.find((m) => m.id === primaryId) || (await getMasjidById(primaryId));
        setPrimaryMasjid(primaryData);
      } else {
        setPrimaryMasjid(null);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      showCustomAlert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectPrimaryMasjid = async (masjidId: string | null) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (masjidId) {
        await savePrimaryMasjidId(masjidId);
        setPrimaryMasjidId(masjidId);
        const selected = masjids.find((m) => m.id === masjidId) || (await getMasjidById(masjidId));
        setPrimaryMasjid(selected);
        if (selected) {
          await schedulePrimaryMasjidNotifications(selected);
        }
      } else {
        await savePrimaryMasjidId(null);
        setPrimaryMasjidId(null);
        setPrimaryMasjid(null);
        await clearScheduledNotifications();
      }
      setShowMasjidModal(false);
      setMasjidSearch("");
    } catch (e) {
      console.error("Failed to set primary masjid:", e);
      showCustomAlert("Error", "Failed to select primary masjid. Please try again.");
    }
  };

  const filteredForDropdown = useMemo(() => {
    return masjids.filter(
      (m) =>
        m.name.toLowerCase().includes(masjidSearch.toLowerCase()) ||
        m.city.toLowerCase().includes(masjidSearch.toLowerCase())
    );
  }, [masjids, masjidSearch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = masjids.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.city.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWithAds = useMemo(() => {
    const result: (Masjid | { isAd: true; id: string })[] = [];
    filtered.forEach((item, index) => {
      result.push(item);
      // Inject native ad after every 9th masjid
      if ((index + 1) % 9 === 0) {
        result.push({ isAd: true, id: `ad-${item.id}` });
      }
    });
    return result;
  }, [filtered]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{t('assalamu_alaikum')}</Text>
          <Pressable
            style={styles.headerDropdownSelectBox}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMasjidModal(true);
            }}
          >
            <Ionicons name="star" size={13} color={primaryMasjid ? Colors.accent : Colors.textMuted} />
            <Text style={styles.headerDropdownSelectText} numberOfLines={1}>
              {primaryMasjid ? primaryMasjid.name : "Select Primary Masjid"}
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
        {search.length > 0 && (
          <Ionicons
            name="close-circle"
            size={18}
            color={Colors.textMuted}
            onPress={() => setSearch("")}
          />
        )}
      </View>

      {/* Dropdown Masjid Selector Modal */}
      <Modal visible={showMasjidModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Primary Masjid</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMasjidModal(false);
                  setMasjidSearch("");
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search Masjid..."
                value={masjidSearch}
                onChangeText={setMasjidSearch}
                placeholderTextColor={Colors.textMuted}
              />
              {masjidSearch !== "" && (
                <TouchableOpacity onPress={() => setMasjidSearch("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredForDropdown}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                primaryMasjidId ? (
                  <TouchableOpacity
                    style={styles.modalClearItem}
                    onPress={() => handleSelectPrimaryMasjid(null)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} style={{ marginRight: 12 }} />
                    <Text style={styles.modalClearText}>Remove Primary Masjid</Text>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalMasjidItem}
                  onPress={() => handleSelectPrimaryMasjid(item.id)}
                >
                  <View style={styles.modalMasjidIcon}>
                    <Ionicons
                      name="moon-outline"
                      size={18}
                      color={item.id === primaryMasjidId ? Colors.accent : Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalMasjidName}>{item.name}</Text>
                    <Text style={styles.modalMasjidCity}>{item.city}</Text>
                  </View>
                  {item.id === primaryMasjidId && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyText}>No masjids found matching your search.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
      {loading ? (
        <ExploreSkeleton />
      ) : (
        <FlatList
          data={filteredWithAds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if ('isAd' in item) {
              return <NativeMasjidAdCard />;
            }
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
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryCard,
                    pressed && styles.primaryCardPressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/masjid/[id]",
                      params: { id: primaryMasjid.id },
                    })
                  }
                >
                  <View style={styles.primaryCardHeader}>
                    <View style={styles.primaryCardIconWrap}>
                      <Ionicons name="star" size={16} color="#fff" />
                    </View>
                    <View style={styles.primaryCardInfo}>
                      <Text style={styles.primaryCardLabel}>YOUR PRIMARY MASJID</Text>
                      <Text style={styles.primaryCardName} numberOfLines={1}>
                        {primaryMasjid.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </View>

                  <View style={styles.primaryCardTimesRow}>
                    {[
                      { key: "fajr", label: "Fajr" },
                      { key: "dhuhr", label: "Dhuhr" },
                      { key: "asr", label: "Asr" },
                      { key: "maghrib", label: "Maghrib" },
                      { key: "isha", label: "Isha" },
                    ].map((item) => (
                      <View key={item.key} style={styles.primaryCardTimeItem}>
                        <Text style={styles.primaryCardTimeLabel}>{item.label}</Text>
                        <Text style={styles.primaryCardTimeValue}>
                          {formatTimeCompact(
                            primaryMasjid.timetable[item.key as keyof typeof primaryMasjid.timetable]
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              ) : null}

              {events.length > 0 ? (
                <View style={styles.eventsContainer}>
                  <Text style={styles.subSectionTitle}>Announcements</Text>
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>
              ) : null}

              {filtered.length > 0 ? (
                <Text style={styles.subSectionTitle}>Explore Masjids</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No masjids found</Text>
              <Text style={styles.emptyText}>
                Try a different masjid name
              </Text>
            </View>
          }
        />
      )}
      <PremiumBannerAd inTabBar={true} />
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
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
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
  },
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
  primaryCardTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  primaryCardTimeItem: {
    alignItems: "center",
    gap: 2,
  },
  primaryCardTimeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  primaryCardTimeValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
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
});
