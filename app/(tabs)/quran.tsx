import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Rect, Path, G } from "react-native-svg";
import Colors from "@/constants/colors";
import { fetchSurahList, Surah } from "@/lib/quran/api";
import { PARAH_LIST, ParahMapping, SURA_START_PAGES } from "@/lib/quran/constants";
import { useQuran } from "@/lib/quran/context";
import { QuranSkeleton } from "@/components/Skeleton";

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Surah" | "Parah" | "Bookmarks">("Surah");
  const [viewMode, setViewMode] = useState<"Arabic" | "Translation">("Arabic");

  const { recentRead, lastReadPage } = useQuran();

  useEffect(() => {
    async function load() {
      try {
        const list = await fetchSurahList();
        setSurahs(list);
      } catch (e) {
        console.error("Error loading surahs:", e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.toLowerCase();
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        String(s.number).includes(q)
    );
  }, [surahs, search]);

  const filteredParahs = useMemo(() => {
    if (!search.trim()) return PARAH_LIST;
    const q = search.toLowerCase();
    return PARAH_LIST.filter(
      (j) =>
        j.englishName.toLowerCase().includes(q) ||
        String(j.number).includes(q)
    );
  }, [search]);

  const handleSurahPress = (surahNumber: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sInfo = SURA_START_PAGES.find((s) => s.number === surahNumber);
    const page = sInfo ? sInfo.startPage : 1;
    router.push(`/quran/mushaf?page=${page}`);
  };

  const handleResume = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const page = lastReadPage || 2;
    router.push(`/quran/mushaf?page=${page}`);
  };

  const renderSurahRow = ({ item }: { item: Surah }) => {
    const isMeccan = item.revelationType === "Meccan" || item.number % 2 !== 0;

    return (
      <TouchableOpacity
        style={styles.surahRow}
        activeOpacity={0.7}
        onPress={() => handleSurahPress(item.number)}
      >
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>{item.number}</Text>
        </View>

        <View style={styles.surahInfoCol}>
          <Text style={styles.surahName}>{item.englishName}</Text>
          <Text style={styles.arabicSmall}>{item.name}</Text>
        </View>

        <Text style={styles.ayatCount}>{item.numberOfAyahs} Ayat</Text>
        <Text style={styles.revelationType}>{isMeccan ? "Meccan" : "Madinan"}</Text>
      </TouchableOpacity>
    );
  };

  const renderParahRow = ({ item }: { item: ParahMapping }) => (
    <TouchableOpacity
      style={styles.surahRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/quran/mushaf?page=${item.startPage}`)}
    >
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>{item.number}</Text>
      </View>

      <View style={styles.surahInfoCol}>
        <Text style={styles.surahName}>Parah {item.number}</Text>
        <Text style={styles.arabicSmall}>{item.englishName}</Text>
      </View>

      <Text style={styles.ayatCount}>Page {item.startPage}</Text>
      <Text style={styles.revelationType}>{item.surahStart.split(" ")[0]}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quran</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search Surah or Ayah..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <QuranSkeleton />
      ) : (
        <FlatList
          data={(activeTab === "Surah" ? filteredSurahs : filteredParahs) as any[]}
          keyExtractor={(item) => (activeTab === "Surah" ? `surah_${(item as Surah).number}` : `parah_${(item as ParahMapping).number}`)}
          renderItem={activeTab === "Surah" ? (renderSurahRow as any) : (renderParahRow as any)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}
          ListHeaderComponent={
            <View>
              {/* Continue Reading Hero Card */}
              <View style={styles.continueCard}>
                {/* Circular Progress Ring */}
                <View style={styles.progressRingWrap}>
                  <Svg width={64} height={64} viewBox="0 0 64 64">
                    <Circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#E2EBE5"
                      strokeWidth="5"
                      fill="none"
                    />
                    <Circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke={Colors.primary}
                      strokeWidth="5"
                      strokeDasharray="105 165"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                  <View style={styles.progressRingTextWrap}>
                    <Text style={styles.progressPercentText}>65%</Text>
                  </View>
                </View>

                {/* Middle Info */}
                <View style={styles.continueCenterInfo}>
                  <Text style={styles.continueLabel}>Continue Reading</Text>
                  <Text style={styles.continueSurahName}>Surah Al Baqarah</Text>
                  <Text style={styles.continueMeta}>Ayah 187 • Parah 2</Text>

                  <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
                    <Text style={styles.resumeBtnText}>Resume</Text>
                  </TouchableOpacity>
                </View>

                {/* Right 3D Book Graphic */}
                <View style={styles.bookGraphicWrap}>
                  <Svg width={64} height={56} viewBox="0 0 64 56">
                    <Rect x="4" y="8" width="56" height="42" rx="4" fill="#D4AF37" />
                    <Rect x="6" y="10" width="52" height="38" rx="3" fill={Colors.primary} />
                    <Path d="M 32 10 L 32 48" stroke="#D4AF37" strokeWidth="2" />
                    <Circle cx="32" cy="28" r="6" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
                  </Svg>
                </View>
              </View>

              {/* Segmented Sub-Tabs: Surah, Parah, Bookmarks */}
              <View style={styles.subTabsRow}>
                {(["Surah", "Parah", "Bookmarks"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.subTabPill,
                      activeTab === tab && styles.subTabPillActive,
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      if (tab === "Bookmarks") {
                        router.push("/quran/bookmarks");
                      } else {
                        setActiveTab(tab);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        activeTab === tab && styles.subTabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />
      )}

      {/* Bottom Floating Pill Switcher: [ Arabic ] | [ Translation ] */}
      <View style={styles.bottomSwitcherWrap}>
        <View style={styles.floatingSwitcherPill}>
          <TouchableOpacity
            style={[
              styles.switchOption,
              viewMode === "Arabic" && styles.switchOptionActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setViewMode("Arabic");
            }}
          >
            <Text
              style={[
                styles.switchText,
                viewMode === "Arabic" && styles.switchTextActive,
              ]}
            >
              Arabic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchOption,
              viewMode === "Translation" && styles.switchOptionActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setViewMode("Translation");
            }}
          >
            <Text
              style={[
                styles.switchText,
                viewMode === "Translation" && styles.switchTextActive,
              ]}
            >
              Translation
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    height: 48,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 16,
    height: 46,
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#1A2E1A",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 16,
  },
  progressRingWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 12,
  },
  progressRingTextWrap: {
    position: "absolute",
  },
  progressPercentText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: Colors.primary,
  },
  continueCenterInfo: {
    flex: 1,
  },
  continueLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  continueSurahName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
    color: "#1A2E1A",
    marginTop: -1,
  },
  continueMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#5C6B5C",
    marginBottom: 8,
  },
  resumeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  resumeBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  bookGraphicWrap: {
    marginLeft: 6,
  },
  subTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F0F4EC",
    borderRadius: 24,
    padding: 4,
    marginBottom: 14,
  },
  subTabPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  subTabPillActive: {
    backgroundColor: Colors.primary,
  },
  subTabText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  subTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  surahRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EC",
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  numberText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  surahInfoCol: {
    flex: 1,
  },
  surahName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  arabicSmall: {
    fontFamily: "Amiri_700Bold",
    fontSize: 14,
    color: Colors.primary,
    marginTop: -2,
  },
  ayatCount: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginRight: 16,
  },
  revelationType: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#8A998A",
    width: 58,
    textAlign: "right",
  },
  bottomSwitcherWrap: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  floatingSwitcherPill: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E2EDE6",
  },
  switchOption: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  switchOptionActive: {
    backgroundColor: Colors.primary,
  },
  switchText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  switchTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
});
