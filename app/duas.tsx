import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Share,
  Modal,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { VoiceSearchButton } from "@/components/voice-search-button";
import {
  ALL_DUAS,
  DUA_CATEGORIES,
  DuaItem,
  loadDuaCounters,
  saveDuaCounters,
  incrementDuaRecitation,
} from "@/lib/duas-data";

const SAVED_DUAS_KEY = "@user_saved_duas_ids";
const ARABIC_FONT_SIZE_KEY = "@user_dua_arabic_font_size";
const SHOW_TRANSLIT_KEY = "@user_dua_show_transliteration";
const SHOW_TRANSLATION_KEY = "@user_dua_show_translation";
const SHOW_VIRTUE_KEY = "@user_dua_show_virtue";

export default function DuasAndAzkarScreen() {
  const insets = useSafeAreaInsets();

  // Search & Category Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlySaved, setOnlySaved] = useState(false);

  // User Preferences
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [arabicFontSize, setArabicFontSize] = useState<number>(24);
  const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [showVirtue, setShowVirtue] = useState<boolean>(true);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Tap-to-count state for each dua
  const [counters, setCounters] = useState<Record<string, number>>({});

  // Load preferences from storage
  const loadPreferences = useCallback(async () => {
    try {
      const [savedJson, fontStr, translitStr, transStr, virtueStr, initialCounters] = await Promise.all([
        AsyncStorage.getItem(SAVED_DUAS_KEY),
        AsyncStorage.getItem(ARABIC_FONT_SIZE_KEY),
        AsyncStorage.getItem(SHOW_TRANSLIT_KEY),
        AsyncStorage.getItem(SHOW_TRANSLATION_KEY),
        AsyncStorage.getItem(SHOW_VIRTUE_KEY),
        loadDuaCounters(),
      ]);

      if (savedJson) setSavedIds(JSON.parse(savedJson));
      if (initialCounters) setCounters(initialCounters);
      if (fontStr) setArabicFontSize(parseInt(fontStr, 10));
      if (translitStr !== null) setShowTransliteration(translitStr === "true");
      if (transStr !== null) setShowTranslation(transStr === "true");
      if (virtueStr !== null) setShowVirtue(virtueStr === "true");
    } catch (e) {
      console.error("Failed loading dua preferences:", e);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Toggle Save / Favorite
  const toggleSave = async (duaId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let updated: string[];
      if (savedIds.includes(duaId)) {
        updated = savedIds.filter((id) => id !== duaId);
      } else {
        updated = [...savedIds, duaId];
      }
      setSavedIds(updated);
      await AsyncStorage.setItem(SAVED_DUAS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed updating saved duas:", e);
    }
  };

  // Save font size
  const handleSetFontSize = async (size: number) => {
    void Haptics.selectionAsync();
    setArabicFontSize(size);
    await AsyncStorage.setItem(ARABIC_FONT_SIZE_KEY, String(size));
  };

  // Toggle transliteration
  const handleToggleTransliteration = async (val: boolean) => {
    void Haptics.selectionAsync();
    setShowTransliteration(val);
    await AsyncStorage.setItem(SHOW_TRANSLIT_KEY, String(val));
  };

  // Toggle translation
  const handleToggleTranslation = async (val: boolean) => {
    void Haptics.selectionAsync();
    setShowTranslation(val);
    await AsyncStorage.setItem(SHOW_TRANSLATION_KEY, String(val));
  };

  // Toggle virtue
  const handleToggleVirtue = async (val: boolean) => {
    void Haptics.selectionAsync();
    setShowVirtue(val);
    await AsyncStorage.setItem(SHOW_VIRTUE_KEY, String(val));
  };

  // Copy to clipboard
  const handleCopy = async (dua: DuaItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n"${dua.translation}"\n\n— ${dua.reference}${
      dua.virtue ? `\n\nBenefit: ${dua.virtue}` : ""
    }`;
    await Clipboard.setStringAsync(content);
    showCustomAlert("Copied to Clipboard", "Dua details copied successfully.");
  };

  // Native share
  const handleShare = async (dua: DuaItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const content = `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n"${dua.translation}"\n\n— ${dua.reference}${
        dua.virtue ? `\n\nBenefit: ${dua.virtue}` : ""
      }\n\nShared via Pasted-Perfect App`;
      await Share.share({
        message: content,
        title: dua.title,
      });
    } catch (e) {
      console.error("Error sharing dua:", e);
    }
  };

  // Handle tap-to-count with persistent tracking
  const handleCountTap = (duaId: string, targetCount: number) => {
    const current = counters[duaId] || 0;
    if (current >= targetCount) {
      // Already complete, reset on tap
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = { ...counters, [duaId]: 0 };
      setCounters(updated);
      void saveDuaCounters(updated);
      return;
    }

    const next = current + 1;
    if (next === targetCount) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = { ...counters, [duaId]: next };
    setCounters(updated);
    void saveDuaCounters(updated);

    // Track recitation in monthly and total cache
    void incrementDuaRecitation(duaId);
  };

  // Reset count
  const handleResetCount = (duaId: string) => {
    void Haptics.selectionAsync();
    const updated = { ...counters, [duaId]: 0 };
    setCounters(updated);
    void saveDuaCounters(updated);
  };

  // Filtered duas list
  const filteredDuas = useMemo(() => {
    let list = ALL_DUAS;

    if (onlySaved) {
      list = list.filter((d) => savedIds.includes(d.id));
    } else if (selectedCategory !== "all") {
      const catObj = DUA_CATEGORIES.find((c) => c.id === selectedCategory);
      if (catObj) {
        list = list.filter((d) => d.category.toLowerCase().includes(catObj.name.toLowerCase()));
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.translation.toLowerCase().includes(q) ||
          d.transliteration.toLowerCase().includes(q) ||
          d.arabic.includes(q) ||
          (d.arabicTitle && d.arabicTitle.includes(q)) ||
          d.reference.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedCategory, onlySaved, search, savedIds]);

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
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Duas & Azkar</Text>
          <Text style={styles.headerSubtitle}>حصن المسلم • أدعية وأذكار</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowSettingsModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="options-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar with Voice Search */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search by keyword, meaning or reference..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : (
          <VoiceSearchButton onTranscript={setSearch} size={18} color={Colors.primary} />
        )}
      </View>

      {/* Horizontal Category Switcher Chips */}
      <View style={styles.categoryScrollWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DUA_CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryChipsList}
          ListHeaderComponent={
            /* Favorites / Saved Filter Chip */
            <TouchableOpacity
              style={[
                styles.categoryChip,
                onlySaved && styles.categoryChipActiveSaved,
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                setOnlySaved(!onlySaved);
              }}
            >
              <Ionicons
                name={onlySaved ? "heart" : "heart-outline"}
                size={14}
                color={onlySaved ? "#FFFFFF" : "#E11D48"}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  onlySaved && styles.categoryChipTextActive,
                ]}
              >
                Saved ({savedIds.length})
              </Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const isSelected = !onlySaved && selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setOnlySaved(false);
                  setSelectedCategory(item.id);
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={isSelected ? "#FFFFFF" : item.color}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results Count Banner */}
      <View style={styles.countBannerRow}>
        <Text style={styles.countBannerText}>
          Showing {filteredDuas.length} {filteredDuas.length === 1 ? "Supplication" : "Supplications"}
          {onlySaved ? " in Saved" : selectedCategory !== "all" ? ` in ${DUA_CATEGORIES.find((c) => c.id === selectedCategory)?.name}` : ""}
        </Text>
      </View>

      {/* Duas List */}
      <FlatList
        data={filteredDuas}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 90 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {onlySaved
                ? "No Saved Duas Yet"
                : search
                ? "No matching supplications found"
                : "No supplications in this category"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {onlySaved
                ? "Tap the heart icon on any Dua to save it here for quick access."
                : "Try searching with different keywords or browse all categories."}
            </Text>
            {(onlySaved || search) && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  setSearch("");
                  setOnlySaved(false);
                  setSelectedCategory("all");
                }}
              >
                <Text style={styles.emptyActionText}>View All Duas</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isSaved = savedIds.includes(item.id);
          const currentCount = counters[item.id] || 0;
          const isCountComplete = item.count > 1 && currentCount >= item.count;

          return (
            <View style={styles.duaCard}>
              {/* Card Header: Category, Count Tag, & Action Buttons */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  {item.count > 1 && (
                    <View style={styles.countBadge}>
                      <Ionicons name="repeat" size={11} color={Colors.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.countBadgeText}>{item.count}x Times</Text>
                    </View>
                  )}
                </View>

                {/* Right Action Icons: Favorite, Copy, Share */}
                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity
                    onPress={() => toggleSave(item.id)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isSaved ? "heart" : "heart-outline"}
                      size={20}
                      color={isSaved ? "#E11D48" : Colors.textMuted}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleCopy(item)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleShare(item)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dua Title */}
              <View style={styles.titleWrap}>
                <Text style={styles.duaTitle}>{item.title}</Text>
                {item.arabicTitle && (
                  <Text style={styles.duaArabicTitle}>{item.arabicTitle}</Text>
                )}
              </View>

              {/* Arabic Text Frame */}
              <View style={styles.arabicFrame}>
                <Text
                  style={[
                    styles.arabicText,
                    { fontSize: arabicFontSize, lineHeight: arabicFontSize * 1.75 },
                  ]}
                >
                  {item.arabic}
                </Text>
              </View>

              {/* Transliteration */}
              {showTransliteration && (
                <View style={styles.transliterationWrap}>
                  <Text style={styles.transliterationLabel}>Transliteration</Text>
                  <Text style={styles.transliterationText}>{item.transliteration}</Text>
                </View>
              )}

              {/* English Translation */}
              {showTranslation && (
                <View style={styles.translationWrap}>
                  <Text style={styles.translationLabel}>Translation</Text>
                  <Text style={styles.translationText}>"{item.translation}"</Text>
                </View>
              )}

              {/* Reference */}
              <View style={styles.referenceRow}>
                <Ionicons name="book-outline" size={13} color={Colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.referenceText}>{item.reference}</Text>
              </View>

              {/* Hadith Virtue / Benefit (if available and enabled) */}
              {showVirtue && item.virtue && (
                <View style={styles.virtueBox}>
                  <Ionicons name="sparkles" size={14} color="#D4A843" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.virtueText}>
                    <Text style={styles.virtueBold}>Spiritual Benefit: </Text>
                    {item.virtue}
                  </Text>
                </View>
              )}

              {/* Tap-to-Count Counter Footer for repeated Azkar */}
              {item.count > 1 && (
                <View style={styles.counterFooterRow}>
                  <TouchableOpacity
                    style={[
                      styles.counterTapBtn,
                      isCountComplete && styles.counterTapBtnComplete,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleCountTap(item.id, item.count)}
                  >
                    <Ionicons
                      name={isCountComplete ? "checkmark-circle" : "finger-print-outline"}
                      size={18}
                      color={isCountComplete ? "#FFFFFF" : Colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.counterTapText,
                        isCountComplete && styles.counterTapTextComplete,
                      ]}
                    >
                      {isCountComplete
                        ? `Completed ${currentCount} / ${item.count} ✓`
                        : `Tap to Count: ${currentCount} / ${item.count}`}
                    </Text>
                  </TouchableOpacity>

                  {currentCount > 0 && (
                    <TouchableOpacity
                      onPress={() => handleResetCount(item.id)}
                      style={styles.resetCountBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Reading Preferences Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <TouchableOpacity
            style={styles.modalSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleGroup}>
                <Ionicons name="options" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Reading Preferences</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Arabic Font Size Adjustment */}
            <View style={styles.prefSection}>
              <Text style={styles.prefSectionLabel}>Arabic Font Size</Text>
              <View style={styles.fontSizeRow}>
                {[
                  { label: "Normal", size: 20 },
                  { label: "Medium", size: 24 },
                  { label: "Large", size: 28 },
                  { label: "Extra Large", size: 32 },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.size}
                    style={[
                      styles.fontSizeBtn,
                      arabicFontSize === f.size && styles.fontSizeBtnActive,
                    ]}
                    onPress={() => handleSetFontSize(f.size)}
                  >
                    <Text
                      style={[
                        styles.fontSizeBtnText,
                        arabicFontSize === f.size && styles.fontSizeBtnTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview Box */}
            <View style={styles.previewBox}>
              <Text style={[styles.previewArabic, { fontSize: arabicFontSize }]}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </Text>
            </View>

            {/* Toggle Switches */}
            <View style={styles.prefSwitchesWrap}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Show Transliteration</Text>
                  <Text style={styles.switchDesc}>English phonetic pronunciation</Text>
                </View>
                <Switch
                  value={showTransliteration}
                  onValueChange={handleToggleTransliteration}
                  trackColor={{ false: "#D1D5DB", true: Colors.primaryLight }}
                  thumbColor={showTransliteration ? Colors.primary : "#F4F3F4"}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Show Translation</Text>
                  <Text style={styles.switchDesc}>Authentic English translation</Text>
                </View>
                <Switch
                  value={showTranslation}
                  onValueChange={handleToggleTranslation}
                  trackColor={{ false: "#D1D5DB", true: Colors.primaryLight }}
                  thumbColor={showTranslation ? Colors.primary : "#F4F3F4"}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.switchTitle}>Show Hadith Benefits & Virtues</Text>
                  <Text style={styles.switchDesc}>Authentic spiritual rewards and context</Text>
                </View>
                <Switch
                  value={showVirtue}
                  onValueChange={handleToggleVirtue}
                  trackColor={{ false: "#D1D5DB", true: Colors.primaryLight }}
                  thumbColor={showVirtue ? Colors.primary : "#F4F3F4"}
                />
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalDoneBtnText}>Save & Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: Colors.primary,
  },
  headerSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.accent,
    marginTop: -3,
  },
  settingsBtn: {
    padding: 6,
  },

  /* Search Input Bar */
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A2E1A",
  },

  /* Horizontal Category Chips */
  categoryScrollWrap: {
    marginTop: 4,
    marginBottom: 6,
  },
  categoryChipsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipActiveSaved: {
    backgroundColor: "#E11D48",
    borderColor: "#E11D48",
  },
  categoryChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* Count Banner */
  countBannerRow: {
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  countBannerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textMuted,
  },

  /* List & Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 12,
  },
  duaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: Colors.primary,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  countBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#16A34A",
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    padding: 5,
  },

  /* Title */
  titleWrap: {
    marginBottom: 10,
  },
  duaTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  duaArabicTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.accent,
    marginTop: 1,
  },

  /* Arabic Text Frame */
  arabicFrame: {
    backgroundColor: "#FAFBF8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F4EC",
  },
  arabicText: {
    fontFamily: "Amiri_700Bold",
    color: Colors.primary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  /* Transliteration */
  transliterationWrap: {
    marginBottom: 8,
  },
  transliterationLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  transliterationText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#475569",
    fontStyle: "italic",
    lineHeight: 18,
  },

  /* Translation */
  translationWrap: {
    marginBottom: 10,
  },
  translationLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  translationText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A2E1A",
    lineHeight: 19,
  },

  /* Reference */
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  referenceText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },

  /* Virtue / Benefit */
  virtueBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFDF5",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FBECC4",
    marginBottom: 10,
  },
  virtueBold: {
    fontFamily: "Poppins_600SemiBold",
    color: "#926B0B",
  },
  virtueText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#785609",
    lineHeight: 16,
    flex: 1,
  },

  /* Tap-to-Count Footer */
  counterFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F4F7F2",
  },
  counterTapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F0F7F7",
    borderWidth: 1,
    borderColor: "#D2EAEA",
  },
  counterTapBtnComplete: {
    backgroundColor: "#27AE60",
    borderColor: "#27AE60",
  },
  counterTapText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: Colors.primary,
  },
  counterTapTextComplete: {
    color: "#FFFFFF",
  },
  resetCountBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F4F7F2",
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  emptyActionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },

  /* Settings Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4EC",
  },
  modalHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16.5,
    color: "#1A2E1A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  prefSection: {
    marginBottom: 14,
  },
  prefSectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
    marginBottom: 8,
  },
  fontSizeRow: {
    flexDirection: "row",
    gap: 8,
  },
  fontSizeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F4F7F2",
    borderWidth: 1,
    borderColor: "#E2EBE5",
  },
  fontSizeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  fontSizeBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fontSizeBtnTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  previewBox: {
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    alignItems: "center",
  },
  previewArabic: {
    fontFamily: "Amiri_700Bold",
    color: Colors.primary,
    textAlign: "center",
  },
  prefSwitchesWrap: {
    backgroundColor: "#FAFBF8",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4EC",
  },
  switchTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  switchDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  modalDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDoneBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
