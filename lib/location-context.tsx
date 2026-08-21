import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { LocationState } from "./types";
import { getLocations } from "./store";
import { VoiceSearchButton } from "@/components/voice-search-button";
import { fuzzyMatch } from "@/lib/fuzzy-search";

const CITY_KEY = "@user_selected_city";
const STATE_KEY = "@user_selected_state";

interface LocationContextType {
  selectedCity: string | null;
  selectedState: string | null;
  locations: LocationState[];
  isLoading: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  selectLocation: (city: string, state: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<LocationState[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [activeStateTab, setActiveStateTab] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const isMandatory = !selectedCity;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allLocations, savedCity, savedState] = await Promise.all([
        getLocations(),
        AsyncStorage.getItem(CITY_KEY),
        AsyncStorage.getItem(STATE_KEY),
      ]);

      setLocations(allLocations);

      if (savedCity) {
        setSelectedCity(savedCity);
        setSelectedState(savedState || (allLocations[0]?.state ?? "Uttar Pradesh"));
        setActiveStateTab(savedState || (allLocations[0]?.state ?? "Uttar Pradesh"));
      } else if (allLocations && allLocations.length > 0) {
        setSelectedCity(null);
        setSelectedState(null);
        setActiveStateTab(allLocations[0]?.state ?? "Uttar Pradesh");
        setShowModal(true);
      } else {
        // Fallback if no location data is returned from server
        setSelectedCity("Rampur");
        setSelectedState("Uttar Pradesh");
        setActiveStateTab("Uttar Pradesh");
      }
    } catch (error) {
      console.error("Error loading location context:", error);
      setSelectedCity("Rampur");
      setSelectedState("Uttar Pradesh");
      setActiveStateTab("Uttar Pradesh");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectLocation = async (city: string, state: string) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await AsyncStorage.setItem(CITY_KEY, city);
      await AsyncStorage.setItem(STATE_KEY, state);
      setSelectedCity(city);
      setSelectedState(state);
      setShowModal(false);
      setSearch("");
    } catch (error) {
      console.error("Error saving selected location:", error);
    }
  };

  const openLocationModal = () => {
    setSearch("");
    if (selectedState) {
      setActiveStateTab(selectedState);
    } else if (locations.length > 0) {
      setActiveStateTab(locations[0].state);
    }
    setShowModal(true);
  };

  const closeLocationModal = () => {
    if (!selectedCity) {
      setSelectedCity("Rampur");
      setSelectedState("Uttar Pradesh");
      void AsyncStorage.setItem(CITY_KEY, "Rampur");
      void AsyncStorage.setItem(STATE_KEY, "Uttar Pradesh");
    }
    setShowModal(false);
    setSearch("");
  };

  const currentCitiesList = useMemo(() => {
    const currentStateDoc = locations.find((l) => l.state === activeStateTab);
    const cities = currentStateDoc ? [...currentStateDoc.cities] : [];
    if (!cities.includes("Other")) {
      cities.push("Other");
    }
    if (!search.trim()) return cities;
    return cities.filter((c) => fuzzyMatch(c, search));
  }, [locations, activeStateTab, search]);

  return (
    <LocationContext.Provider
      value={{
        selectedCity,
        selectedState,
        locations,
        isLoading,
        openLocationModal,
        closeLocationModal,
        selectLocation,
        refreshLocations: loadData,
      }}
    >
      {children}

      <Modal
        visible={showModal && !isLoading}
        animationType="slide"
        transparent={true}
        onRequestClose={closeLocationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isMandatory ? "Select Your City" : "Change Location"}
                </Text>
                {isMandatory && (
                  <Text style={styles.modalSubtitle}>
                    Choose your state and city to view masjids & prayer times near you.
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={closeLocationModal} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* State Tabs Selector */}
            <View style={styles.stateTabsContainer}>
              <FlatList
                horizontal
                data={locations}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => {
                  const isActive = item.state === activeStateTab;
                  return (
                    <TouchableOpacity
                      style={[styles.stateTab, isActive && styles.stateTabActive]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveStateTab(item.state);
                      }}
                    >
                      <Text style={[styles.stateTabText, isActive && styles.stateTabTextActive]}>
                        {item.state}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="location-outline" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search city in ${activeStateTab || 'state'}...`}
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={Colors.textMuted}
              />
              {search !== "" ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <VoiceSearchButton onTranscript={setSearch} size={18} color={Colors.textMuted} />
              )}
            </View>

            {/* Cities List */}
            <FlatList
              data={currentCitiesList}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isSelected = item === selectedCity && activeStateTab === selectedState;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={() => selectLocation(item, activeStateTab || "Uttar Pradesh")}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color={isSelected ? Colors.accent : Colors.primary}
                    />
                    <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No cities found for this search.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
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
    maxHeight: "80%",
    minHeight: "60%",
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
  stateTabsContainer: {
    marginBottom: 14,
  },
  stateTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stateTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stateTabText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stateTabTextActive: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },
  searchBox: {
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
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  cityItemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.overlay,
  },
  cityName: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  cityNameActive: {
    color: Colors.accent,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
