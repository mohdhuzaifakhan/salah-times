import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getMasjidById } from "@/lib/store";
import { Masjid, PRAYER_NAMES, PRAYER_ORDER } from "@/lib/types";
import { PrayerTimesCard } from "@/components/PrayerTimeCard";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export default function MasjidDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getMasjidById(id).then((m) => {
        setMasjid(m);
        setLoading(false);
      });
    }
  }, [id]);

  const handleShare = async () => {
    if (!masjid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const times = PRAYER_ORDER
      .map((p) => `${PRAYER_NAMES[p]}: ${formatTime(masjid.timetable[p])}`)
      .join("\n");
    await Share.share({
      message: `${masjid.name}\n${masjid.address}, ${masjid.city}\n\nPrayer Times:\n${times}`,
    });
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!masjid) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Masjid not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.topBarBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Pressable onPress={handleShare} style={styles.topBarBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="moon" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.masjidName}>{masjid.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.address}>{masjid.address}</Text>
          </View>
          <View style={styles.cityBadge}>
            <Text style={styles.cityText}>{masjid.city}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Prayer Timetable</Text>
        <PrayerTimesCard timetable={masjid.timetable} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  masjidName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: Colors.text,
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  address: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    flex: 1,
  },
  cityBadge: {
    marginTop: 10,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cityText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.primary,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.textMuted,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
});
