import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, G, Defs, LinearGradient, Stop } from "react-native-svg";
import Colors from "@/constants/colors";
import {
  TASBIH_ITEMS,
  TASBIH_CATEGORIES,
  TARGET_OPTIONS,
  TasbihItem,
  TasbihCategory,
  loadTasbihCounts,
  saveTasbihCount,
  loadTasbihStats,
  incrementTasbihStats,
  decrementTasbihStats,
  loadTasbihSettings,
  saveTasbihSettings,
  TasbihSettings,
} from "@/lib/tasbih-data";
import { showCustomAlert } from "@/lib/custom-alert";

export default function TasbihScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<TasbihCategory>("all");
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(TASBIH_ITEMS[0]);
  const [target, setTarget] = useState<number>(TASBIH_ITEMS[0].defaultTarget);
  const [count, setCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [laps, setLaps] = useState<number>(0);
  const [settings, setSettings] = useState<TasbihSettings>({
    soundEnabled: false,
    vibrationEnabled: true,
  });

  // Modals
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showVirtueModal, setShowVirtueModal] = useState(false);

  // Load cached stats and counts on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [stats, counts, userSettings] = await Promise.all([
          loadTasbihStats(),
          loadTasbihCounts(),
          loadTasbihSettings(),
        ]);
        if (!isMounted) return;

        setTodayCount(stats.todayCount || 0);
        setTotalCount(stats.totalCount || 0);
        setSettings(userSettings);

        const initialTasbih = TASBIH_ITEMS[0];
        const initialCount = counts[initialTasbih.id] || 0;
        setCount(initialCount);
        setTarget(initialTasbih.defaultTarget);
        if (initialTasbih.defaultTarget > 0) {
          setLaps(Math.floor(initialCount / initialTasbih.defaultTarget));
        }
      } catch (err) {
        console.error("Error loading cached tasbih data:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered tasbihat based on category
  const filteredTasbihat = useMemo(() => {
    if (selectedCategory === "all") return TASBIH_ITEMS;
    return TASBIH_ITEMS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  // Select a new Tasbih
  const handleSelectTasbih = useCallback(
    async (item: TasbihItem) => {
      void Haptics.selectionAsync();
      setSelectedTasbih(item);
      setTarget(item.defaultTarget);

      try {
        const counts = await loadTasbihCounts();
        const savedCount = counts[item.id] || 0;
        setCount(savedCount);
        if (item.defaultTarget > 0) {
          setLaps(Math.floor(savedCount / item.defaultTarget));
        } else {
          setLaps(0);
        }
      } catch {
        setCount(0);
        setLaps(0);
      }
      setShowPickerModal(false);
    },
    []
  );

  // Increment counter with caching
  const handleIncrement = async () => {
    if (settings.vibrationEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nextCount = count + 1;
    setCount(nextCount);
    setTodayCount((prev) => prev + 1);
    setTotalCount((prev) => prev + 1);

    // Save count for this specific tasbih
    void saveTasbihCount(selectedTasbih.id, nextCount);
    void incrementTasbihStats(1);

    // Check if target reached
    if (target > 0) {
      const remainder = nextCount % target;
      if (remainder === 0 && nextCount > 0) {
        setLaps((prev) => prev + 1);
        if (settings.vibrationEnabled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }
  };

  // Decrement counter with caching
  const handleDecrement = async () => {
    if (count > 0) {
      if (settings.vibrationEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const prevCount = count - 1;
      setCount(prevCount);
      setTodayCount((prev) => Math.max(0, prev - 1));
      setTotalCount((prev) => Math.max(0, prev - 1));

      void saveTasbihCount(selectedTasbih.id, prevCount);
      void decrementTasbihStats(1);

      if (target > 0) {
        setLaps(Math.floor(prevCount / target));
      }
    }
  };

  // Reset count with confirmation
  const handleReset = () => {
    if (count === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    showCustomAlert(
      "Reset Counter",
      `Are you sure you want to reset the count for ${selectedTasbih.name}? Today's total count will remain saved.`,
      [
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setCount(0);
            setLaps(0);
            await saveTasbihCount(selectedTasbih.id, 0);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Toggle vibration
  const toggleVibration = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await saveTasbihSettings({
      vibrationEnabled: !settings.vibrationEnabled,
    });
    setSettings(updated);
  };

  // Generate 33 beads positioned along an ellipse ring
  const totalBeads = 33;
  const cx = 140;
  const cy = 140;
  const rx = 108;
  const ry = 108;

  const activeBeadsCount = target > 0 ? count % target : count % totalBeads;
  const displayBeadProgress =
    target === 33
      ? activeBeadsCount === 0 && count > 0
        ? 33
        : activeBeadsCount
      : Math.round((activeBeadsCount / (target || totalBeads)) * totalBeads);

  const beads = Array.from({ length: totalBeads }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / totalBeads - Math.PI / 2;
    const bx = cx + rx * Math.cos(angle);
    const by = cy + ry * Math.sin(angle);
    const isCompleted = i < displayBeadProgress;
    return { id: i, bx, by, isCompleted };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Digital Tasbih</Text>
          <Text style={styles.headerSubtitle}>تسبيح • Zikr Counter</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleVibration}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={settings.vibrationEnabled ? "Disable vibration" : "Enable vibration"}
          >
            <Ionicons
              name={settings.vibrationEnabled ? "phone-portrait" : "phone-portrait-outline"}
              size={20}
              color={settings.vibrationEnabled ? Colors.primary : "#94A3B8"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowVirtueModal(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="View Dhikr Virtues"
          >
            <Ionicons name="book-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
      >
        {/* Selected Dhikr Selector Card */}
        <TouchableOpacity
          style={styles.activeDhikrCard}
          onPress={() => setShowPickerModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.dhikrCardTopRow}>
            <View style={styles.categoryBadge}>
              <Ionicons name="sparkles" size={12} color="#0D7377" />
              <Text style={styles.categoryBadgeText}>
                {TASBIH_CATEGORIES.find((c) => c.id === selectedTasbih.category)?.label || "Dhikr"}
              </Text>
            </View>

            <View style={styles.switchPill}>
              <Text style={styles.switchPillText}>Select Dhikr</Text>
              <Ionicons name="chevron-down" size={14} color="#0D7377" />
            </View>
          </View>

          {/* Large Arabic Text */}
          <Text style={styles.arabicMainText} numberOfLines={2}>
            {selectedTasbih.arabic}
          </Text>

          {/* Transliteration & English Meaning */}
          <Text style={styles.transliterationText} numberOfLines={1}>
            {selectedTasbih.transliteration}
          </Text>
          <Text style={styles.meaningText} numberOfLines={2}>
            "{selectedTasbih.meaning}"
          </Text>
        </TouchableOpacity>

        {/* Target and Lap Indicators Row */}
        <View style={styles.metaRow}>
          <TouchableOpacity
            style={styles.targetPill}
            onPress={() => setShowTargetModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={14} color="#0D7377" />
            <Text style={styles.targetPillText}>
              Target: <Text style={styles.targetPillVal}>{target > 0 ? target : "∞ Free"}</Text>
            </Text>
            <Ionicons name="chevron-down" size={12} color="#0D7377" />
          </TouchableOpacity>

          <View style={styles.lapBadge}>
            <Ionicons name="repeat" size={14} color="#0D7377" />
            <Text style={styles.lapBadgeText}>
              Lap / Round: <Text style={styles.lapBadgeVal}>{laps}</Text>
            </Text>
          </View>
        </View>

        {/* Circular Beads Interactive Ring */}
        <View style={styles.ringSection}>
          <Pressable
            onPress={handleIncrement}
            style={styles.beadsRingWrap}
            accessibilityLabel="Tap to count"
          >
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Defs>
                <LinearGradient id="beadActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#14A3A8" />
                  <Stop offset="50%" stopColor="#0D7377" />
                  <Stop offset="100%" stopColor="#095456" />
                </LinearGradient>
                <LinearGradient id="beadInactiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F8FAF9" />
                  <Stop offset="100%" stopColor="#E2EBE5" />
                </LinearGradient>
              </Defs>

              {/* Guide thread */}
              <Circle
                cx={cx}
                cy={cy}
                r={rx}
                stroke="#D2E3D8"
                strokeWidth={2}
                strokeDasharray="2 4"
                fill="none"
              />

              {/* 33 Interactive Prayer Beads */}
              {beads.map((bead) => (
                <G key={bead.id}>
                  <Circle
                    cx={bead.bx}
                    cy={bead.by + 1}
                    r={8.5}
                    fill="rgba(0,0,0,0.06)"
                  />
                  <Circle
                    cx={bead.bx}
                    cy={bead.by}
                    r={8}
                    fill={bead.isCompleted ? "url(#beadActiveGrad)" : "url(#beadInactiveGrad)"}
                    stroke={bead.isCompleted ? "#095456" : "#CBD5E1"}
                    strokeWidth={0.8}
                  />
                  <Circle
                    cx={bead.bx - 2.5}
                    cy={bead.by - 2.5}
                    r={2.2}
                    fill="#FFFFFF"
                    opacity={bead.isCompleted ? 0.45 : 0.7}
                  />
                </G>
              ))}
            </Svg>

            {/* Center Counter Display */}
            <View style={styles.ringCenterTextContainer}>
              <Text style={styles.largeCountNumber}>{count}</Text>
              <Text style={styles.ringDhikrLabel} numberOfLines={1}>
                {selectedTasbih.name}
              </Text>
              {target > 0 && (
                <Text style={styles.ringProgressText}>
                  {count % target} / {target}
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Daily & Lifetime Stats Row (Cached) */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Today's Dhikr</Text>
            <Text style={styles.statValueBold}>{todayCount.toLocaleString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total All-Time</Text>
            <Text style={styles.statValueBold}>{totalCount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Controls: [-] Decrement, [Reset], [+] Increment */}
        <View style={styles.controlButtonsRow}>
          <TouchableOpacity
            style={styles.decrementCircleBtn}
            onPress={handleDecrement}
            activeOpacity={0.75}
            accessibilityLabel="Undo one count"
          >
            <Ionicons name="remove" size={24} color="#0D7377" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetCircleBtn}
            onPress={handleReset}
            activeOpacity={0.75}
            accessibilityLabel="Reset current tasbih"
          >
            <Ionicons name="refresh" size={22} color="#0D7377" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.incrementCircleBtn}
            onPress={handleIncrement}
            activeOpacity={0.85}
            accessibilityLabel="Increment count"
          >
            <Ionicons name="add" size={38} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hadith Virtue Quick Snippet */}
        <TouchableOpacity
          style={styles.virtueSnippetCard}
          onPress={() => setShowVirtueModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={18} color="#0D7377" />
          <Text style={styles.virtueSnippetText} numberOfLines={2}>
            <Text style={{ fontFamily: "Poppins_600SemiBold" }}>Hadith Virtue: </Text>
            {selectedTasbih.virtue}
          </Text>
        </TouchableOpacity>

        <View style={{ height: Math.max(insets.bottom, 24) + 60 }} />
      </ScrollView>

      {/* MODAL 1: Dhikr Selection & Categories Modal */}
      <Modal
        visible={showPickerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Authentic Islamic Tasbihat</Text>
                <Text style={styles.modalSubtitle}>Select any Dhikr to count & read</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPickerModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            <View style={styles.categoryScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScrollView}
                contentContainerStyle={styles.categoryScroll}
              >
                {TASBIH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      selectedCategory === cat.id && styles.catChipActive,
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedCategory(cat.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCategory === cat.id && styles.catChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* List of Dhikrs */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.tasbihList}
              contentContainerStyle={[styles.tasbihListContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
            >
              {filteredTasbihat.map((item) => {
                const isSelected = item.id === selectedTasbih.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tasbihListItem,
                      isSelected && styles.tasbihListItemActive,
                    ]}
                    onPress={() => handleSelectTasbih(item)}
                  >
                    <View style={styles.tasbihItemLeft}>
                      <View
                        style={[
                          styles.tasbihItemIconBox,
                          isSelected && styles.tasbihItemIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={isSelected ? "#0D7377" : "#94A3B8"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tasbihItemName}>{item.name}</Text>
                        <Text style={styles.tasbihItemTransliteration} numberOfLines={1}>
                          {item.transliteration}
                        </Text>
                        <Text style={styles.tasbihItemMeaning} numberOfLines={1}>
                          {item.meaning}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.tasbihItemArabicPreview} numberOfLines={1}>
                      {item.arabic}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Target Selection Modal */}
      <Modal
        visible={showTargetModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTargetModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTargetModal(false)}>
          <Pressable style={styles.targetDialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dialogTitle}>Set Target Count</Text>
            <Text style={styles.dialogSubtitle}>
              Select the count goal before completing a round (Lap).
            </Text>

            <View style={styles.targetGrid}>
              {TARGET_OPTIONS.map((val) => {
                const isSelected = target === val;
                const label = val === 0 ? "∞ Unlimited" : `${val}x`;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.targetOptionBox,
                      isSelected && styles.targetOptionBoxActive,
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setTarget(val);
                      if (val > 0) {
                        setLaps(Math.floor(count / val));
                      }
                      setShowTargetModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.targetOptionText,
                        isSelected && styles.targetOptionTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 3: Hadith Virtue & Meaning Detail Modal */}
      <Modal
        visible={showVirtueModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVirtueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedTasbih.name}</Text>
                <Text style={styles.modalSubtitle}>Authentic Virtues & Translation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowVirtueModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
              {/* Arabic Box */}
              <View style={styles.virtueArabicBox}>
                <Text style={styles.virtueArabicText}>{selectedTasbih.arabic}</Text>
              </View>

              {/* Transliteration */}
              <View style={styles.virtueSection}>
                <Text style={styles.virtueSectionHeader}>Transliteration</Text>
                <Text style={styles.virtueSectionBody}>{selectedTasbih.transliteration}</Text>
              </View>

              {/* English Meaning */}
              <View style={styles.virtueSection}>
                <Text style={styles.virtueSectionHeader}>English Meaning</Text>
                <Text style={styles.virtueSectionBody}>"{selectedTasbih.meaning}"</Text>
              </View>

              {/* Urdu Meaning */}
              {selectedTasbih.meaningUrdu ? (
                <View style={styles.virtueSection}>
                  <Text style={styles.virtueSectionHeader}>Urdu Meaning (اردو ترجمہ)</Text>
                  <Text style={styles.virtueUrduBody}>{selectedTasbih.meaningUrdu}</Text>
                </View>
              ) : null}

              {/* Hadith Virtue */}
              <View style={styles.virtueHadithBox}>
                <View style={styles.hadithHeaderRow}>
                  <Ionicons name="bookmark" size={16} color="#0D7377" />
                  <Text style={styles.hadithHeaderTitle}>Hadith Reference & Virtue</Text>
                </View>
                <Text style={styles.hadithBodyText}>{selectedTasbih.virtue}</Text>
              </View>

              <View style={{ height: Math.max(insets.bottom, 24) + 40 }} />
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
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EC",
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#1A2E1A",
  },
  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Active Dhikr Card
  activeDhikrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    marginBottom: 12,
  },
  dhikrCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  categoryBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#0D7377",
  },
  switchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  switchPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#0D7377",
  },
  arabicMainText: {
    fontSize: 22,
    color: "#0D7377",
    textAlign: "center",
    lineHeight: 34,
    marginVertical: 4,
    fontFamily: Platform.OS === "ios" ? "GeezaPro-Bold" : "sans-serif-medium",
  },
  transliterationText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
    textAlign: "center",
  },
  meaningText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },
  // Meta Row (Target & Laps)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    gap: 6,
  },
  targetPillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  targetPillVal: {
    fontFamily: "Poppins_700Bold",
    color: "#0D7377",
  },
  lapBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2EBE5",
    gap: 6,
  },
  lapBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lapBadgeVal: {
    fontFamily: "Poppins_700Bold",
    color: "#0D7377",
  },
  // Ring Section
  ringSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  beadsRingWrap: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenterTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  largeCountNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 50,
    color: "#1A2E1A",
    lineHeight: 58,
  },
  ringDhikrLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#0D7377",
    marginTop: -2,
    maxWidth: 160,
    textAlign: "center",
  },
  ringProgressText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Stats Card
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginVertical: 12,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValueBold: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2EBE5",
  },
  // Controls Row
  controlButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    marginVertical: 6,
  },
  decrementCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F4EC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2EDE6",
  },
  resetCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F4EC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2EDE6",
  },
  incrementCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0D7377",
    alignItems: "center",
    justifyContent: "center",
  },
  // Virtue Snippet Card
  virtueSnippetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  virtueSnippetText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#004D40",
    flex: 1,
    lineHeight: 16,
  },
  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F1",
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  modalSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  categoryScrollWrapper: {
    height: 54,
    marginVertical: 4,
  },
  categoryScrollView: {
    flexGrow: 0,
    height: 48,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F4EC",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
  },
  catChipActive: {
    backgroundColor: "#0D7377",
  },
  catChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  catChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  tasbihList: {
    paddingHorizontal: 20,
  },
  tasbihListContent: {
    paddingBottom: 24,
  },
  tasbihListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F1",
    gap: 12,
  },
  tasbihListItemActive: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  tasbihItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  tasbihItemIconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  tasbihItemIconBoxActive: {},
  tasbihItemName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#1A2E1A",
    lineHeight: 19,
    includeFontPadding: false,
  },
  tasbihItemTransliteration: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1,
  },
  tasbihItemMeaning: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#8A998A",
    fontStyle: "italic",
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
  },
  tasbihItemArabicPreview: {
    fontSize: 16,
    color: "#0D7377",
    fontFamily: Platform.OS === "ios" ? "GeezaPro-Bold" : "sans-serif-medium",
    maxWidth: 100,
    textAlign: "right",
  },
  // Target Dialog
  targetDialog: {
    width: "84%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignSelf: "center",
    marginVertical: "auto",
  },
  dialogTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
    textAlign: "center",
  },
  dialogSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  targetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  targetOptionBox: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#F0F4EC",
    borderRadius: 12,
    minWidth: "44%",
    alignItems: "center",
  },
  targetOptionBoxActive: {
    backgroundColor: "#0D7377",
  },
  targetOptionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
  },
  targetOptionTextActive: {
    color: "#FFFFFF",
  },
  // Virtue Details Modal
  virtueArabicBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  virtueArabicText: {
    fontSize: 22,
    color: "#0D7377",
    textAlign: "center",
    lineHeight: 36,
    fontFamily: Platform.OS === "ios" ? "GeezaPro-Bold" : "sans-serif-medium",
  },
  virtueSection: {
    marginBottom: 12,
  },
  virtueSectionHeader: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  virtueSectionBody: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: "#1A2E1A",
    lineHeight: 20,
  },
  virtueUrduBody: {
    fontSize: 14,
    color: "#1A2E1A",
    lineHeight: 22,
    textAlign: "right",
  },
  virtueHadithBox: {
    backgroundColor: "#E0F2F1",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  hadithHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  hadithHeaderTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#0D7377",
  },
  hadithBodyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#004D40",
    lineHeight: 18,
  },
});
