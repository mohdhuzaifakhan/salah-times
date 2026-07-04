import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useLanguage } from "@/lib/language-context";
import { getMasjidById, getMasjidEvents, getPrimaryMasjidId, savePrimaryMasjidId } from "@/lib/store";
import { Masjid, AppEvent, PRAYER_NAMES, PRAYER_ORDER } from "@/lib/types";
import { PrayerTimesCard } from "@/components/PrayerTimeCard";
import { schedulePrimaryMasjidNotifications, clearScheduledNotifications } from "@/lib/notifications";
import { EventCard } from "@/components/EventCard";
import { MasjidDetailSkeleton } from "@/components/Skeleton";
import { PremiumBannerAd } from "@/components/ads/PremiumBannerAd";
import { NativeMasjidAdCard } from "@/components/ads/NativeMasjidAdCard";

function formatTime(time: string): string {
  if (!time || !time.includes(":")) return "--:--";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return "--:--";
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export default function MasjidDetailScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (id) {
      (async () => {
        try {
          const [m, e, primaryId] = await Promise.all([
            getMasjidById(id),
            getMasjidEvents(id),
            getPrimaryMasjidId()
          ]);
          if (isMounted) {
            setMasjid(m);
            setEvents(e);
            setIsPrimary(primaryId === id);
          }
        } catch (error) {
          console.error("Failed to load masjid details:", error);
          if (isMounted) {
            setMasjid(null);
            setEvents([]);
            setIsPrimary(false);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const togglePrimary = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isPrimary) {
        await savePrimaryMasjidId(null);
        setIsPrimary(false);
        await clearScheduledNotifications();
      } else {
        await savePrimaryMasjidId(id);
        setIsPrimary(true);
        if (masjid) {
          await schedulePrimaryMasjidNotifications(masjid);
        }
      }
    } catch (error) {
      console.error("Failed to toggle primary masjid:", error);
    }
  };

  const handleShare = async () => {
    if (!masjid) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const times = PRAYER_ORDER
        .map((p) => {
          const timeVal = masjid.timetable?.[p];
          return `${PRAYER_NAMES[p]}: ${timeVal ? formatTime(timeVal) : "--:--"}`;
        })
        .join("\n");
      await Share.share({
        message: `${masjid.name}\n${masjid.address}, ${masjid.city}\n\nPrayer Times:\n${times}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <MasjidDetailSkeleton />
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
        <View style={styles.topBarRight}>
          <Pressable onPress={handleShare} style={styles.topBarBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="moon" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.masjidName}>{masjid.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} style={{ marginTop: 2 }} />
            <Text style={styles.address}>{masjid.address}, {masjid.city}</Text>
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.setPrimaryHeroBtn,
              isPrimary ? styles.setPrimaryHeroBtnActive : null,
              pressed && styles.btnPressed
            ]}
            onPress={togglePrimary}
          >
            <Ionicons
              name={isPrimary ? "star" : "star-outline"}
              size={15}
              color={isPrimary ? "#fff" : Colors.primary}
            />
            <Text
              style={[
                styles.setPrimaryHeroBtnText,
                isPrimary ? styles.setPrimaryHeroBtnTextActive : null
              ]}
            >
              {isPrimary ? "Primary Masjid (Selected)" : "Set as Primary Masjid"}
            </Text>
          </Pressable>
        </View>

        {events.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>{t('announcements')}</Text>
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('prayer_timetable')}</Text>
        <PrayerTimesCard timetable={masjid.timetable} />

        <View style={styles.reportContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.reportBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/report-masjid-time",
                params: { masjidId: masjid.id, masjidName: masjid.name },
              });
            }}
          >
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.reportBtnText}>Report Incorrect Prayer Times</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 24, marginBottom: 10 }}>
          <NativeMasjidAdCard 
            headline="Support Your Local Masjid's Expansion"
            body="Help fund new community spaces, Islamic classes, and educational infrastructure."
            advertiser="Masjid Renovation Fund"
            callToAction="Donate to Masjid"
          />
        </View>
      </ScrollView>
      <PremiumBannerAd />
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
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 24,
    marginTop: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  masjidName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 28,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 20,
    width: "100%",
  },
  address: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    flexShrink: 1,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 12,
  },
  eventsSection: {
    marginBottom: 20,
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
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  primaryBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  reportContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(192, 57, 43, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(192, 57, 43, 0.2)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  reportBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.error,
  },
  setPrimaryHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  setPrimaryHeroBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  setPrimaryHeroBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  setPrimaryHeroBtnTextActive: {
    color: "#fff",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
