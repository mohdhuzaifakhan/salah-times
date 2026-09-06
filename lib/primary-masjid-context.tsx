import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { QueryDocumentSnapshot } from "firebase/firestore";
import { Masjid } from "./types";
import { getAllMasjids, getPrimaryMasjidId, getCachedPrimaryMasjid, getMasjidById, savePrimaryMasjidId, getMasjidsPaginated } from "./store";
import { schedulePrimaryMasjidNotifications, refreshPrimaryMasjidNotifications, setupForegroundPrayerWatcher } from "./notifications";
import { showCustomAlert } from "./custom-alert";
import { useLocation } from "./location-context";

interface PrimaryMasjidContextType {
  primaryMasjid: Masjid | null;
  primaryMasjidId: string | null;
  masjids: Masjid[];
  isLoading: boolean;
  openSelectModal: () => void;
  closeSelectModal: () => void;
  selectPrimaryMasjid: (masjidId: string) => Promise<void>;
  refreshPrimaryMasjid: () => Promise<void>;
}

const PrimaryMasjidContext = createContext<PrimaryMasjidContextType | undefined>(undefined);

export const PrimaryMasjidProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedCity, locations, openLocationModal, selectLocation } = useLocation();
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [modalMasjids, setModalMasjids] = useState<Masjid[]>([]);
  const [modalLastDocSnap, setModalLastDocSnap] = useState<QueryDocumentSnapshot | null>(null);
  const [modalHasMore, setModalHasMore] = useState(true);
  const [modalLoadingMore, setModalLoadingMore] = useState(false);
  const [primaryMasjid, setPrimaryMasjid] = useState<Masjid | null>(null);
  const [primaryMasjidId, setPrimaryMasjidId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [masjidSearch, setMasjidSearch] = useState("");

  const primaryMasjidRef = useRef<Masjid | null>(null);
  primaryMasjidRef.current = primaryMasjid;

  const isMandatory = !primaryMasjidId;

  const configuredCitiesSet = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => {
      loc.cities.forEach((c) => set.add(c.trim().toLowerCase()));
    });
    return set;
  }, [locations]);

  const currentCity = selectedCity || "Rampur";

  const loadModalInitialData = useCallback(async (searchQuery: string = masjidSearch) => {
    try {
      const res = await getMasjidsPaginated({
        pageSize: 10,
        lastDoc: null,
        city: currentCity,
        searchQuery,
        configuredCitiesSet,
      });
      setModalMasjids(res.masjids);
      setModalLastDocSnap(res.lastDoc);
      setModalHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading modal masjids:", err);
    }
  }, [currentCity, configuredCitiesSet]);

  useEffect(() => {
    if (showSelectModal) {
      const handler = setTimeout(() => {
        loadModalInitialData(masjidSearch);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [masjidSearch, currentCity, showSelectModal]);

  const loadMoreModalMasjids = useCallback(async () => {
    if (modalLoadingMore || !modalHasMore || !modalLastDocSnap) return;

    try {
      setModalLoadingMore(true);
      const res = await getMasjidsPaginated({
        pageSize: 10,
        lastDoc: modalLastDocSnap,
        city: currentCity,
        searchQuery: masjidSearch,
        configuredCitiesSet,
      });

      if (res.masjids.length > 0) {
        setModalMasjids((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = res.masjids.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newItems];
        });
      }
      if (res.lastDoc) {
        setModalLastDocSnap(res.lastDoc);
      }
      setModalHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading more modal masjids:", err);
    } finally {
      setModalLoadingMore(false);
    }
  }, [modalLoadingMore, modalHasMore, modalLastDocSnap, currentCity, masjidSearch, configuredCitiesSet]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedPrimaryId = await getPrimaryMasjidId();

      if (storedPrimaryId) {
        let found = await getMasjidById(storedPrimaryId);
        if (!found) {
          found = await getCachedPrimaryMasjid();
        }

        if (found) {
          setPrimaryMasjid(found);
          setPrimaryMasjidId(found.id);
          void schedulePrimaryMasjidNotifications(found);
        } else {
          setPrimaryMasjidId(storedPrimaryId);
        }
      } else {
        setPrimaryMasjid(null);
        setPrimaryMasjidId(null);
        await loadModalInitialData("");
        setShowSelectModal(true);
      }
    } catch (error) {
      console.error("Error loading primary masjid data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadModalInitialData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Foreground real-time watcher to trigger Azaan as soon as prayer time arrives while app is open
  useEffect(() => {
    const cleanup = setupForegroundPrayerWatcher(() => primaryMasjidRef.current);
    return () => cleanup();
  }, []);

  const selectPrimaryMasjid = async (masjidId: string) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPrimaryMasjidId(masjidId);
      
      let selected = modalMasjids.find((m) => m.id === masjidId) || masjids.find((m) => m.id === masjidId);
      if (!selected) {
        selected = (await getMasjidById(masjidId)) || undefined;
      }

      if (selected) {
        setPrimaryMasjid(selected);
        await savePrimaryMasjidId(masjidId, selected);
        await schedulePrimaryMasjidNotifications(selected);
      } else {
        await savePrimaryMasjidId(masjidId);
        await refreshPrimaryMasjidNotifications();
      }
      setShowSelectModal(false);
      setMasjidSearch("");
    } catch (error) {
      console.error("Failed to select primary masjid:", error);
      showCustomAlert("Error", "Failed to select primary masjid. Please try again.");
    }
  };

  const openSelectModal = () => {
    setMasjidSearch("");
    loadModalInitialData("");
    setShowSelectModal(true);
  };

  const closeSelectModal = () => {
    setShowSelectModal(false);
    setMasjidSearch("");
  };

  const filteredMasjids = useMemo(() => {
    const cityMasjids = masjids.filter((m) =>
      currentCity === "Other"
        ? !m.city || !configuredCitiesSet.has(m.city.trim().toLowerCase())
        : m.city.trim().toLowerCase() === currentCity.trim().toLowerCase()
    );

    if (!masjidSearch.trim()) return cityMasjids;
    const query = masjidSearch.toLowerCase();
    return cityMasjids.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.address && m.address.toLowerCase().includes(query))
    );
  }, [masjids, masjidSearch, currentCity, configuredCitiesSet]);

  return (
    <PrimaryMasjidContext.Provider
      value={{
        primaryMasjid,
        primaryMasjidId,
        masjids,
        isLoading,
        openSelectModal,
        closeSelectModal,
        selectPrimaryMasjid,
        refreshPrimaryMasjid: loadData,
      }}
    >
      {children}

      <Modal
        visible={showSelectModal && !isLoading && !!selectedCity}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSelectModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isMandatory ? "Select Primary Masjid" : "Change Primary Masjid"}
                </Text>
                {isMandatory && (
                  <Text style={styles.modalSubtitle}>
                    {`Please select your primary masjid in ${currentCity} to view accurate prayer times & receive notifications.`}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={closeSelectModal} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search Masjid in ${currentCity}...`}
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
              data={modalMasjids}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              onEndReached={loadMoreModalMasjids}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                modalLoadingMore ? (
                  <View style={{ paddingVertical: 14, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const isCurrent = item.id === primaryMasjidId;
                return (
                  <TouchableOpacity
                    style={[styles.modalMasjidItem, isCurrent && styles.modalMasjidItemActive]}
                    onPress={() => selectPrimaryMasjid(item.id)}
                  >
                    <View style={[styles.modalMasjidIcon, isCurrent && styles.modalMasjidIconActive]}>
                      <Ionicons
                        name="moon"
                        size={18}
                        color={isCurrent ? "#fff" : Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalMasjidName, isCurrent && styles.modalMasjidNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalMasjidCity}>{item.address ? `${item.address}, ${item.city}` : item.city}</Text>
                    </View>
                    {isCurrent ? (
                      <View style={styles.badgePrimary}>
                        <Text style={styles.badgeText}>Primary</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="location-outline" size={32} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>
                    {masjidSearch
                      ? `No masjids found matching "${masjidSearch}"`
                      : `No registered masjids in ${currentCity}`}
                  </Text>
                  <Text style={styles.modalEmptyText}>
                    {currentCity.toLowerCase() !== "rampur"
                      ? "Currently, registered masjids are available in Rampur."
                      : "Try a different search query."}
                  </Text>
                  <View style={styles.emptyActionRow}>
                    {currentCity.toLowerCase() !== "rampur" && (
                      <TouchableOpacity
                        style={styles.switchDefaultBtn}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          void selectLocation("Rampur", "Uttar Pradesh");
                        }}
                      >
                        <Ionicons name="location" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.switchDefaultBtnText}>Switch to Rampur</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.changeLocBtn}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        openLocationModal();
                      }}
                    >
                      <Ionicons name="map-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.changeLocBtnText}>Change Location</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </PrimaryMasjidContext.Provider>
  );
};

export const usePrimaryMasjid = () => {
  const context = useContext(PrimaryMasjidContext);
  if (context === undefined) {
    throw new Error("usePrimaryMasjid must be used within a PrimaryMasjidProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "65%",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.primary,
  },
  modalSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
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
  modalMasjidItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  modalMasjidItemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.overlay,
  },
  modalMasjidIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMasjidIconActive: {
    backgroundColor: Colors.accent,
  },
  modalMasjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  modalMasjidNameActive: {
    color: Colors.accent,
  },
  modalMasjidCity: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badgePrimary: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  modalEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalEmptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  modalEmptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  switchDefaultBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  switchDefaultBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#ffffff",
  },
  changeLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  changeLocBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
});
