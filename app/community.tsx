import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function CommunityServicesScreen() {
  const insets = useSafeAreaInsets();
  const [adRewardProgress, setAdRewardProgress] = useState(0);

  const handleWatchAd = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = (adRewardProgress + 1) % 7;
    setAdRewardProgress(next === 0 ? 1 : next);
    if (next === 6) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        "Reward Unlocked! 🎉",
        "Masha'Allah! You have completed all 6 ad challenges. Special badge and premium ad-free reading unlocked for today!"
      );
    } else {
      showCustomAlert(
        "Reward Claimed",
        `Ad completed successfully. Your reward progress is now ${next}/6!`
      );
    }
  };

  const handleAction = (title: string, desc: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showCustomAlert(title, desc);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity
          onPress={() => handleAction("Search Community", "Search discussions, scholars, and local Islamic services.")}
          style={styles.searchBtn}
        >
          <Ionicons name="search" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top 4 Action Circular Tiles */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Ask Scholar", "Submit your Islamic jurisprudence (Fiqh) queries to certified scholars.")
            }
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="person" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionItemLabel}>Ask Scholar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Community Discussions", "Join friendly conversations on Quran, daily sunnahs, and Islamic books.")
            }
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionItemLabel}>Discussions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/calendar")}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="calendar" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionItemLabel}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Charity & Sadaqah", "Support local masjid renovations and emergency relief initiatives.")
            }
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="heart" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.actionItemLabel}>Charity</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Islamic Services */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Islamic Services</Text>
        </View>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Halal Food Directory", "Browse verified halal certified butchers, restaurants, and eateries.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="nutrition-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Halal Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Islamic Schools", "Find Islamic madrasas, weekend schools, and accredited Islamic academies.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="school-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Islamic School</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Quran Classes", "Online & in-person Tajweed and Hifz classes for kids and adults.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="book-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Quran Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Funeral Help (Janazah)", "Emergency funeral and burial coordination services.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="home-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Funeral Help</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Learn & Discover */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Learn & Discover</Text>
        </View>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("99 Names of Allah (Asma ul Husna)", "Recite and memorize the 99 Beautiful Names of Allah with meanings.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="sparkles-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>99 Names</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/hadith")}
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="library-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Hadith</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Islamic History", "Explore the Golden Age, Caliphs, and notable civilizational contributions.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Islamic History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() =>
              handleAction("Islamic Videos", "Curated Islamic lectures, short reminders, and Tajweed lessons.")
            }
          >
            <View style={styles.serviceIconWrap}>
              <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.serviceCardTitle}>Videos</Text>
          </TouchableOpacity>
        </View>

        {/* Rewards & Ads Hero Banner matching Screen 13 */}
        <View style={styles.rewardHeroCard}>
          <View style={styles.rewardCardHeader}>
            <Text style={styles.rewardCardTitle}>Claim Rewards by Watching Ads</Text>
            <Text style={styles.rewardCardBadge}>{adRewardProgress}/6</Text>
          </View>

          {/* 5 Token Badges Row */}
          <View style={styles.tokenBadgesRow}>
            <View style={[styles.tokenCircle, styles.tokenGold]}>
              <Ionicons name="ribbon-outline" size={18} color="#B45309" />
            </View>
            <View style={[styles.tokenCircle, styles.tokenGold]}>
              <Ionicons name="cash-outline" size={18} color="#B45309" />
            </View>
            <View style={[styles.tokenCircle, styles.tokenBlue]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#1D4ED8" />
            </View>
            <View style={[styles.tokenCircle, styles.tokenGold]}>
              <Ionicons name="gift-outline" size={18} color="#B45309" />
            </View>
            <View style={[styles.tokenCircle, styles.tokenGreen]}>
              <Ionicons name="star-outline" size={18} color={Colors.primary} />
            </View>
          </View>

          {/* White Action Pill Button: Watch Ads */}
          <TouchableOpacity
            style={styles.watchAdBtn}
            activeOpacity={0.88}
            onPress={handleWatchAd}
          >
            <Text style={styles.watchAdBtnText}>Watch Ads</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Math.max(insets.bottom, 24) + 60 }} />
      </ScrollView>
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
  searchBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  topActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionItem: {
    alignItems: "center",
    width: "22%",
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionItemLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#1A2E1A",
    textAlign: "center",
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 8,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceCardTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#1A2E1A",
    textAlign: "center",
  },
  rewardHeroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginTop: 6,
  },
  rewardCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rewardCardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  rewardCardBadge: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#B2DFDB",
  },
  tokenBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  tokenCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenGold: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  tokenBlue: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
  },
  tokenGreen: {
    backgroundColor: "rgba(178, 223, 219, 0.3)",
  },
  watchAdBtn: {
    backgroundColor: "#FFFFFF",
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  watchAdBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
});

