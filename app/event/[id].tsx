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
  Image,
  Linking,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useLanguage } from "@/lib/language-context";
import { getEventById, getMasjidById } from "@/lib/store";
import { AppEvent, Masjid } from "@/lib/types";

export default function EventDetailScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMasjid, setLoadingMasjid] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      (async () => {
        try {
          const evt = await getEventById(id);
          if (isMounted) {
            setEvent(evt);
            if (evt && evt.masjidId !== "global") {
              setLoadingMasjid(true);
              const msjd = await getMasjidById(evt.masjidId);
              if (isMounted) {
                setMasjid(msjd);
              }
            }
          }
        } catch (error) {
          console.error("Failed to load event details:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
            setLoadingMasjid(false);
          }
        }
      })();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isGlobal = event.masjidId === "global";
      const messageText = `${event.title}\n\n${event.description}\n\n${isGlobal ? "Global Announcement" : masjid ? `Masjid: ${masjid.name}` : ""
        }\nShared via Salah Time App`;

      await Share.share({
        message: messageText,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleGoToMasjid = () => {
    if (masjid) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/masjid/[id]",
        params: { id: masjid.id },
      });
    }
  };

  const handleOpenLink = async () => {
    if (!event?.link) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let targetUrl = event.link.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      await Linking.openURL(targetUrl);
    } catch (error) {
      console.error("Failed to open event link:", error);
      showCustomAlert("Error", "Could not open the website link. Please check if the URL is valid.");
    }
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isGlobal = event?.masjidId === "global";
  const formattedExpiry = event
    ? new Date(event.endDate).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    : "";

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Event not found</Text>
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
        <Text style={styles.headerTitle}>Announcement</Text>
        <Pressable onPress={handleShare} style={styles.topBarBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {event.imageUrl ? (
          <View style={styles.bannerContainer}>
            <Image source={{ uri: event.imageUrl }} style={styles.bannerImage} />
          </View>
        ) : (
          <View style={styles.placeholderBanner}>
            <View style={styles.placeholderIconWrap}>
              <Ionicons
                name={isGlobal ? "globe-outline" : "megaphone-outline"}
                size={36}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.placeholderText}>
              {isGlobal ? "Global Announcement" : "Masjid Announcement"}
            </Text>
          </View>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isGlobal ? styles.globalBadge : styles.masjidBadge]}>
              <Ionicons
                name={isGlobal ? "globe" : "location"}
                size={12}
                color={isGlobal ? "#fff" : Colors.accent}
              />
              <Text style={[styles.badgeText, isGlobal ? styles.globalBadgeText : styles.masjidBadgeText]}>
                {isGlobal ? "Global" : masjid ? masjid.city : "Masjid"}
              </Text>
            </View>
          </View>

          <Text style={styles.eventTitle}>{event.title}</Text>

          {event.description ? (
            <Text style={styles.eventDescription}>{event.description}</Text>
          ) : (
            <Text style={styles.noDescription}>No description provided.</Text>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaLabel}>Active Until</Text>
              <Text style={styles.metaValue}>{formattedExpiry}</Text>
            </View>
          </View>

          {event.link ? (
            <Pressable
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
              onPress={handleOpenLink}
            >
              <Ionicons name="globe-outline" size={18} color={Colors.primary} />
              <Text style={styles.linkButtonText} numberOfLines={1}>
                {event.link}
              </Text>
              <Ionicons name="open-outline" size={16} color={Colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {!isGlobal && (
          <View style={styles.masjidSection}>
            <Text style={styles.sectionTitle}>Organized By</Text>
            {loadingMasjid ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : masjid ? (
              <Pressable
                style={({ pressed }) => [styles.masjidCard, pressed && styles.masjidCardPressed]}
                onPress={handleGoToMasjid}
              >
                <View style={styles.masjidCardHeader}>
                  <View style={styles.masjidIconWrap}>
                    <Ionicons name="moon" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.masjidInfo}>
                    <Text style={styles.masjidName} numberOfLines={1}>
                      {masjid.name}
                    </Text>
                    <Text style={styles.masjidCity} numberOfLines={1}>
                      {masjid.city}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
                <Text style={styles.masjidAddress} numberOfLines={2}>
                  {masjid.address}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.emptyMasjidCard}>
                <Text style={styles.emptyMasjidText}>Masjid details unavailable</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
          onPress={handleShare}
        >
          <Ionicons name="share-social-outline" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Share Event Details</Text>
        </Pressable>
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
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  bannerContainer: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderBanner: {
    width: "100%",
    height: 160,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
  },
  placeholderIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  globalBadge: {
    backgroundColor: Colors.primary,
  },
  masjidBadge: {
    backgroundColor: Colors.overlay,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  globalBadgeText: {
    color: "#fff",
  },
  masjidBadgeText: {
    color: Colors.primary,
  },
  eventTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 28,
  },
  eventDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  noDescription: {
    fontFamily: "Poppins_400Regular_Italic",
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginTop: 1,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  linkButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  linkButtonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  masjidSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  masjidCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  masjidCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  masjidCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  masjidIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  masjidInfo: {
    flex: 1,
  },
  masjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  masjidCity: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.primary,
    marginTop: -2,
  },
  masjidAddress: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyMasjidCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyMasjidText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
  },
  shareButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  shareButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
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
