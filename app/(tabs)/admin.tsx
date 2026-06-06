import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getAllMasjids, getMasjidById, getAdminNotifications, getGlobalEvents, getAppMessages } from "@/lib/store";
import { Masjid } from "@/lib/types";
import { PrayerTimesCard } from "@/components/PrayerTimeCard";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { admin, isLoading, logout } = useAuth();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loadingMasjid, setLoadingMasjid] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalMasjids: 0,
    totalEvents: 0,
    totalFeedbacks: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoadingMasjid(true);

      const fetchNotifications = async () => {
        if (!admin) return;
        try {
          const data = await getAdminNotifications(admin.role, admin.masjidId);
          const unread = data.filter((n) => !n.read).length;
          if (isMounted) setUnreadCount(unread);
        } catch (error) {
          console.error("Failed to load notifications count:", error);
        }
      };

      fetchNotifications();

      if (admin?.role === "super_admin") {
        (async () => {
          try {
            const masjidsData = await getAllMasjids();
            const eventsData = await getGlobalEvents();
            const feedbacksData = await getAppMessages();

            if (isMounted) {
              setMasjids(masjidsData);
              setStats({
                totalMasjids: masjidsData.length,
                totalEvents: eventsData.length,
                totalFeedbacks: feedbacksData.length,
              });
              setMasjid(null);
            }
          } catch (error) {
            console.error("Failed to load masjids:", error);
            if (isMounted) setMasjids([]);
          } finally {
            if (isMounted) setLoadingMasjid(false);
          }
        })();
      } else if (admin?.masjidId) {
        (async () => {
          try {
            const m = await getMasjidById(admin.masjidId!);
            if (isMounted) setMasjid(m);
          } catch (error) {
            console.error("Failed to load masjid:", error);
            if (isMounted) setMasjid(null);
          } finally {
            if (isMounted) setLoadingMasjid(false);
          }
        })();
      } else {
        setMasjids([]);
        setMasjid(null);
        setLoadingMasjid(false);
      }

      return () => {
        isMounted = false;
      };
    }, [admin?.masjidId, admin?.role])
  );

  const handleLogout = () => {
    showCustomAlert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        },
      },
    ]);
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!admin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.notLoggedIn}>
          <View style={styles.lockIcon}>
            <Ionicons name="key-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.nlTitle}>Masjid Admin</Text>
          <Text style={styles.nlSubtitle}>
            Login to manage your masjid's prayer timetable
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(auth)/login");
            }}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.loginBtnText}>Login</Text>
          </Pressable>
          {/* <Pressable
            style={({ pressed }) => [
              styles.registerBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/register");
            }}
          >
            <Text style={styles.registerBtnText}>Register New Masjid</Text>
          </Pressable> */}
        </View>
      </View>
    );
  }

  if (loadingMasjid) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const filteredMasjids = masjids.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.adminHeader}>
          <View>
            <Text style={styles.adminGreeting}>Welcome back</Text>
            <Text style={styles.adminEmail}>{admin.email}</Text>
            <Text style={styles.roleBadge}>
              {admin.role === "super_admin" ? "Super Admin" : "Masjid Admin"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/admin-notifications");
              }}
              style={styles.bellBtn}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {admin.role === "super_admin" ? (
          <>
            {/* Stats Cards Row */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: "rgba(13, 115, 119, 0.08)" }]}>
                  <Ionicons name="moon-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalMasjids}</Text>
                <Text style={styles.statLabel}>Masjids</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: "rgba(212, 168, 67, 0.08)" }]}>
                  <Ionicons name="megaphone-outline" size={18} color={Colors.accent} />
                </View>
                <Text style={styles.statValue}>{stats.totalEvents}</Text>
                <Text style={styles.statLabel}>Global Events</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: "rgba(92, 107, 92, 0.08)" }]}>
                  <Ionicons name="mail-unread-outline" size={18} color="#5C6B5C" />
                </View>
                <Text style={styles.statValue}>{stats.totalFeedbacks}</Text>
                <Text style={styles.statLabel}>App Feedbacks</Text>
              </View>
            </View>

            {/* Quick Actions Grid */}
            <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(auth)/register");
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "rgba(13, 115, 119, 0.08)" }]}>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Add Masjid</Text>
                <Text style={styles.actionDesc}>Register new account</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/manage-events", params: { masjidId: "global" } });
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "rgba(212, 168, 67, 0.08)" }]}>
                  <Ionicons name="megaphone-outline" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.actionTitle}>Global Events</Text>
                <Text style={styles.actionDesc}>Manage announcements</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/manage-global-feedback");
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "rgba(92, 107, 92, 0.08)" }]}>
                  <Ionicons name="mail-unread-outline" size={22} color="#5C6B5C" />
                </View>
                <Text style={styles.actionTitle}>Feedbacks</Text>
                <Text style={styles.actionDesc}>Manage app feedback</Text>
              </Pressable>
            </View>

            {/* Directory Header and Search Bar */}
            <View style={styles.directoryHeader}>
              <Text style={styles.sectionHeaderTitle}>Masjids Directory</Text>
              <View style={styles.directoryCountBadge}>
                <Text style={styles.directoryCountText}>{filteredMasjids.length} listed</Text>
              </View>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search masjids by name or city..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={styles.searchClearBtn}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Masjid Cards List */}
            {filteredMasjids.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color={Colors.textMuted} style={{ alignSelf: "center", marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { textAlign: "center" }]}>No masjids found</Text>
                <Text style={[styles.emptyText, { textAlign: "center" }]}>
                  Try adjusting your search terms or register a new masjid admin.
                </Text>
              </View>
            ) : (
              filteredMasjids.map((item) => {
                const masjidInitials = item.name
                  ? item.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
                  : "M";

                return (
                  <View key={item.id} style={styles.superMasjidCard}>
                    <View style={styles.superMasjidHeader}>
                      <View style={styles.avatarBadge}>
                        <Text style={styles.avatarBadgeText}>{masjidInitials}</Text>
                      </View>

                      <View style={styles.masjidInfoText}>
                        <Text style={styles.masjidName}>{item.name}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                          <Text style={styles.masjidLocation} numberOfLines={1}>
                            {item.address}, {item.city}
                          </Text>
                        </View>
                        {item.adminEmail && (
                          <View style={styles.emailRow}>
                            <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.emailText} numberOfLines={1}>
                              {item.adminEmail}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.superMasjidFooter}>
                      <Pressable
                        style={styles.superEditBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/edit-timetable",
                            params: { masjidId: item.id },
                          });
                        }}
                      >
                        <Ionicons name="time-outline" size={14} color={Colors.primary} />
                        <Text style={styles.superEditBtnText}>Timetable</Text>
                      </Pressable>

                      <Pressable
                        style={styles.superFeedbackBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/masjid-feedback",
                            params: { masjidId: item.id, masjidName: item.name },
                          });
                        }}
                      >
                        <Ionicons name="mail-unread-outline" size={14} color={Colors.accent} />
                        <Text style={styles.superFeedbackBtnText}>Feedbacks</Text>
                      </Pressable>

                      <Pressable
                        style={styles.superManageBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/edit-masjid-details",
                            params: { masjidId: item.id },
                          });
                        }}
                      >
                        <Ionicons name="settings-outline" size={14} color="#5C6B5C" />
                        <Text style={styles.superManageBtnText}>Manage Info</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : masjid ? (
          <>
            <View style={styles.masjidInfoCard}>
              <View style={styles.masjidInfoHeader}>
                <View style={styles.masjidIconWrap}>
                  <Ionicons name="moon" size={24} color={Colors.primary} />
                </View>
                <View style={styles.masjidInfoText}>
                  <Text style={styles.masjidName}>{masjid.name}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.masjidLocation}>
                      {masjid.address}, {masjid.city}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.editLocalityBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/edit-masjid-details",
                      params: { masjidId: masjid.id },
                    });
                  }}
                >
                  <Ionicons name="create-outline" size={14} color={Colors.primary} />
                  <Text style={styles.editLocalityText}>Edit</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prayer Timetable</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: "/edit-timetable",
                    params: { masjidId: masjid.id },
                  });
                }}
              >
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.editBtnText}>Edit Times</Text>
              </Pressable>
            </View>

            <PrayerTimesCard timetable={masjid.timetable} />

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Masjid Events</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editBtn,
                  { backgroundColor: Colors.accent },
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: "/manage-events",
                    params: { masjidId: masjid.id },
                  });
                }}
              >
                <Ionicons name="megaphone-outline" size={16} color="#fff" />
                <Text style={styles.editBtnText}>Manage</Text>
              </Pressable>
            </View>

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Wrong Time Messages</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editBtn,
                  { backgroundColor: Colors.error },
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: "/masjid-feedback",
                    params: { masjidId: masjid.id },
                  });
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#fff" />
                <Text style={styles.editBtnText}>View Feedback</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No masjid account found</Text>
            <Text style={styles.emptyText}>
              Contact super admin to assign your account to a masjid.
            </Text>
          </View>
        )}
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notLoggedIn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  nlTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  nlSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
  },
  loginBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  registerBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  registerBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  adminHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 4,
  },
  adminGreeting: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  adminEmail: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  roleBadge: {
    marginTop: 4,
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(192, 57, 43, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  masjidInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  masjidInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  masjidIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  masjidInfoText: {
    flex: 1,
  },
  superMasjidCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  superMasjidHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.primary,
  },
  masjidName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  masjidLocation: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  emailText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  registerButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  editLocalityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editLocalityText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  superMasjidFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  superEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  superEditBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  superFeedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(212, 168, 67, 0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.15)",
  },
  superFeedbackBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.accent,
  },
  superManageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(92, 107, 92, 0.06)",
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(92, 107, 92, 0.12)",
  },
  superManageBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Upgraded Super Admin Layout styles
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  actionDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  directoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  directoryCountBadge: {
    backgroundColor: Colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  directoryCountText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.text,
    padding: 0,
  },
  searchClearBtn: {
    padding: 2,
  },
});
