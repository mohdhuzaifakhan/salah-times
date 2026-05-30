import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getAllMasjids, getMasjidById } from "@/lib/store";
import { Masjid } from "@/lib/types";
import { PrayerTimesCard } from "@/components/PrayerTimeCard";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { admin, isLoading, logout } = useAuth();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loadingMasjid, setLoadingMasjid] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoadingMasjid(true);

      if (admin?.role === "super_admin") {
        (async () => {
          try {
            const data = await getAllMasjids();
            if (isMounted) {
              setMasjids(data);
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
    Alert.alert("Logout", "Are you sure you want to logout?", [
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
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          </Pressable>
        </View>

        {admin.role === "super_admin" ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.btnPressed,
              ]}
              onPress={() => router.push("/(auth)/register")}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.registerButtonText}>Register New Masjid</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                { backgroundColor: Colors.accent, marginTop: -4 },
                pressed && styles.btnPressed,
              ]}
              onPress={() => router.push({ pathname: "/manage-events", params: { masjidId: "global" } })}
            >
              <Ionicons name="megaphone-outline" size={18} color="#fff" />
              <Text style={styles.registerButtonText}>Manage Global Events</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                { backgroundColor: "#5C6B5C", marginTop: -4 },
                pressed && styles.btnPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/manage-global-feedback");
              }}
            >
              <Ionicons name="mail-unread-outline" size={18} color="#fff" />
              <Text style={styles.registerButtonText}>Manage App Feedbacks</Text>
            </Pressable>

            {masjids.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No masjids registered</Text>
                <Text style={styles.emptyText}>
                  Use "Register New Masjid" to create the first masjid account.
                </Text>
              </View>
            ) : (
              masjids.map((item) => (
                <View key={item.id} style={styles.superMasjidCard}>
                  <View style={styles.superMasjidHeader}>
                    <View style={styles.masjidInfoText}>
                      <Text style={styles.masjidName}>{item.name}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.masjidLocation} numberOfLines={1}>
                          {item.address}, {item.city}
                        </Text>
                      </View>
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
                      <Ionicons name="time-outline" size={16} color={Colors.primary} />
                      <Text style={styles.superEditBtnText}>Update Timetable</Text>
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
                      <Ionicons name="mail-unread-outline" size={16} color={Colors.accent} />
                      <Text style={styles.superFeedbackBtnText}>View Feedbacks</Text>
                    </Pressable>
                  </View>
                </View>
              ))
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  superMasjidHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  masjidName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
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
    padding: 16,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
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
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  superEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  superEditBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  superFeedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(212, 168, 67, 0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.15)",
  },
  superFeedbackBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.accent,
  },
});
