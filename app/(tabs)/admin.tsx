import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Switch,
} from "react-native";
import { Modal, TouchableOpacity } from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getAllMasjids, getMasjidById, getAdminNotifications, getGlobalEvents, getAppMessages, addState, addCityToState } from "@/lib/store";
import { Masjid } from "@/lib/types";
import { PrayerTimesCard } from "@/components/PrayerTimeCard";
import { useLocation } from "@/lib/location-context";
import { fetchAppUpdateConfig, saveAppUpdateConfig, AppUpdateConfig } from "@/lib/updates";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { admin, isLoading, logout } = useAuth();
  const { locations, selectedCity, refreshLocations } = useLocation();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [masjids, setMasjids] = useState<Masjid[]>([]);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseLatestVersion, setReleaseLatestVersion] = useState("1.0.0");
  const [releaseMinVersion, setReleaseMinVersion] = useState("1.0.0");
  const [releaseNotesText, setReleaseNotesText] = useState("Performance improvements\nGeneral bug fixes");
  const [releaseEnabled, setReleaseEnabled] = useState(true);
  const [isSavingRelease, setIsSavingRelease] = useState(false);

  const handleOpenReleaseModal = async () => {
    try {
      const config = await fetchAppUpdateConfig();
      setReleaseLatestVersion(config.latestVersion || "1.0.0");
      setReleaseMinVersion(config.minVersion || "1.0.0");
      setReleaseNotesText((config.releaseNotes || []).join("\n"));
      setReleaseEnabled(config.enabled ?? true);
      setShowReleaseModal(true);
    } catch (error) {
      console.error("Failed to load release config:", error);
      showCustomAlert("Error", "Could not load release configuration.");
    }
  };

  const handleSaveRelease = async () => {
    if (!releaseLatestVersion.trim() || !releaseMinVersion.trim()) {
      showCustomAlert("Error", "Please enter valid version numbers.");
      return;
    }
    setIsSavingRelease(true);
    try {
      const notes = releaseNotesText.split("\n").map((n) => n.trim()).filter(Boolean);
      const updatedConfig: AppUpdateConfig = {
        latestVersion: releaseLatestVersion.trim(),
        minVersion: releaseMinVersion.trim(),
        releaseNotes: notes.length > 0 ? notes : ["New features and performance improvements"],
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
        appStoreUrl: "https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes",
        enabled: releaseEnabled,
      };
      await saveAppUpdateConfig(updatedConfig);
      setShowReleaseModal(false);
      showCustomAlert(
        "🚀 Release Published!",
        `App Update v${updatedConfig.latestVersion} has been saved. All users will now receive the update prompt.`
      );
    } catch (error) {
      console.error("Failed to publish release:", error);
      showCustomAlert("Error", "Failed to publish app release update.");
    } finally {
      setIsSavingRelease(false);
    }
  };
  const [loadingMasjid, setLoadingMasjid] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminCityFilter, setAdminCityFilter] = useState<string>("All");
  const [stats, setStats] = useState({
    totalMasjids: 0,
    totalEvents: 0,
    totalFeedbacks: 0,
  });

  const configuredCitiesSet = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => {
      loc.cities.forEach((c) => set.add(c.trim().toLowerCase()));
    });
    return set;
  }, [locations]);

  const allCitiesList = useMemo(() => {
    const list: string[] = ["All"];
    locations.forEach((loc) => {
      loc.cities.forEach((c) => {
        if (!list.includes(c)) list.push(c);
      });
    });
    list.push("Other");
    return list;
  }, [locations]);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const handleAddState = async () => {
    if (!newStateName.trim()) {
      showCustomAlert("Error", "Please enter a state name.");
      return;
    }
    setIsAddingLocation(true);
    try {
      const createdState = await addState(newStateName);
      await refreshLocations();
      setSelectedStateId(createdState.id);
      setNewStateName("");
      showCustomAlert("Success", `Added State: ${createdState.state}`);
    } catch (e) {
      showCustomAlert("Error", "Failed to add state.");
    } finally {
      setIsAddingLocation(false);
    }
  };

  const handleAddCity = async () => {
    const targetId = selectedStateId || (locations[0]?.id);
    if (!targetId) {
      showCustomAlert("Error", "Please select or create a State first.");
      return;
    }
    if (!newCityName.trim()) {
      showCustomAlert("Error", "Please enter a city name.");
      return;
    }
    setIsAddingLocation(true);
    try {
      await addCityToState(targetId, newCityName);
      await refreshLocations();
      setNewCityName("");
      showCustomAlert("Success", `Added City: ${newCityName.trim()}`);
    } catch (e) {
      showCustomAlert("Error", "Failed to add city.");
    } finally {
      setIsAddingLocation(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      // Only show full loader on initial fetch when no data is cached yet
      setMasjids((currentMasjids) => {
        setMasjid((currentMasjid) => {
          if (currentMasjids.length === 0 && !currentMasjid) {
            setLoadingMasjid(true);
          }
          return currentMasjid;
        });
        return currentMasjids;
      });

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
            Login to manage your masjid&apos;s prayer timetable
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

  const filteredMasjids = masjids.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCity = (() => {
      if (adminCityFilter === "All") return true;
      if (adminCityFilter === "Other") {
        return !m.city || !configuredCitiesSet.has(m.city.trim().toLowerCase());
      }
      return m.city.trim().toLowerCase() === adminCityFilter.trim().toLowerCase();
    })();

    return matchesSearch && matchesCity;
  });

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
                  setShowLocationModal(true);
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "rgba(13, 115, 119, 0.08)" }]}>
                  <Ionicons name="location-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Manage Cities</Text>
                <Text style={styles.actionDesc}>Add States & Cities</Text>
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

              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void handleOpenReleaseModal();
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "rgba(13, 115, 119, 0.08)" }]}>
                  <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Publish Update</Text>
                <Text style={styles.actionDesc}>App Store Release</Text>
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

            {/* Location Filter Chips Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminCityScroll}>
              {allCitiesList.map((c) => {
                const isSel = adminCityFilter === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.adminCityChip, isSel && styles.adminCityChipActive]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAdminCityFilter(c);
                    }}
                  >
                    <Ionicons
                      name={c === "All" ? "globe-outline" : "location-outline"}
                      size={13}
                      color={isSel ? "#FFFFFF" : Colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.adminCityChipText, isSel && styles.adminCityChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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

      {/* Location Management Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage States & Cities</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Add State Form */}
              <View style={styles.locFormCard}>
                <Text style={styles.locFormTitle}>Add New State</Text>
                <View style={styles.locFormRow}>
                  <TextInput
                    style={styles.locInput}
                    placeholder="e.g. Maharashtra"
                    placeholderTextColor={Colors.textMuted}
                    value={newStateName}
                    onChangeText={setNewStateName}
                  />
                  <TouchableOpacity
                    style={[styles.locAddBtn, isAddingLocation && styles.btnDisabled]}
                    onPress={handleAddState}
                    disabled={isAddingLocation}
                  >
                    {isAddingLocation ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.locAddBtnText}>Add State</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Add City Form */}
              <View style={styles.locFormCard}>
                <Text style={styles.locFormTitle}>Add City to State</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {locations.map((loc) => {
                    const isSel = (selectedStateId || locations[0]?.id) === loc.id;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[styles.locStateChip, isSel && styles.locStateChipActive]}
                        onPress={() => setSelectedStateId(loc.id)}
                      >
                        <Text style={[styles.locStateChipText, isSel && styles.locStateChipTextActive]}>
                          {loc.state}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.locFormRow}>
                  <TextInput
                    style={styles.locInput}
                    placeholder="e.g. Mumbai, Pune..."
                    placeholderTextColor={Colors.textMuted}
                    value={newCityName}
                    onChangeText={setNewCityName}
                  />
                  <TouchableOpacity
                    style={[styles.locAddBtn, isAddingLocation && styles.btnDisabled]}
                    onPress={handleAddCity}
                    disabled={isAddingLocation}
                  >
                    {isAddingLocation ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.locAddBtnText}>Add City</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* List Current States & Cities */}
              <Text style={[styles.sectionHeaderTitle, { marginTop: 12 }]}>Configured Locations</Text>
              {locations.map((loc) => (
                <View key={loc.id} style={styles.locListCard}>
                  <Text style={styles.locListStateName}>{loc.state}</Text>
                  <View style={styles.locCitiesWrap}>
                    {loc.cities.length > 0 ? (
                      loc.cities.map((c) => (
                        <View key={c} style={styles.locCityBadge}>
                          <Text style={styles.locCityText}>{c}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noCitiesText}>No cities added yet.</Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Publish App Release Modal */}
      <Modal
        visible={showReleaseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReleaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Publish App Update</Text>
                <Text style={styles.modalSubtitle}>
                  Configure the latest Play Store version release for all users.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowReleaseModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={styles.locFormCard}>
                <Text style={styles.locFormTitle}>Latest Version Name</Text>
                <TextInput
                  style={styles.locInput}
                  placeholder="e.g. 1.0.1 or 1.1.0"
                  placeholderTextColor={Colors.textMuted}
                  value={releaseLatestVersion}
                  onChangeText={setReleaseLatestVersion}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.locFormCard}>
                <Text style={styles.locFormTitle}>Minimum Required Version (Forced Update)</Text>
                <TextInput
                  style={styles.locInput}
                  placeholder="e.g. 1.0.0"
                  placeholderTextColor={Colors.textMuted}
                  value={releaseMinVersion}
                  onChangeText={setReleaseMinVersion}
                  autoCapitalize="none"
                />
                <Text style={[styles.modalSubtitle, { marginTop: 4 }]}>
                  Users on versions below this will be forced to update before using the app.
                </Text>
              </View>

              <View style={styles.locFormCard}>
                <Text style={styles.locFormTitle}>Release Notes (1 feature per line)</Text>
                <TextInput
                  style={[styles.locInput, { height: 90, paddingTop: 10 }]}
                  placeholder="Enter release notes..."
                  placeholderTextColor={Colors.textMuted}
                  value={releaseNotesText}
                  onChangeText={setReleaseNotesText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={[styles.locFormCard, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.locFormTitle}>Enable In-App Update Prompt</Text>
                  <Text style={styles.modalSubtitle}>Show update alert to users on app open</Text>
                </View>
                <Switch
                  value={releaseEnabled}
                  onValueChange={setReleaseEnabled}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, { marginTop: 12 }, isSavingRelease && styles.btnDisabled]}
                onPress={handleSaveRelease}
                disabled={isSavingRelease}
              >
                {isSavingRelease ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                    <Text style={styles.loginBtnText}>Publish & Notify Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    width: "31%",
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
  adminCityScroll: {
    marginBottom: 16,
  },
  adminCityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  adminCityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  adminCityChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  adminCityChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "65%",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  modalSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  locFormCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locFormTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  locFormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locInput: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.text,
  },
  locAddBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  locAddBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  locStateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: 6,
  },
  locStateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  locStateChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  locStateChipTextActive: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },
  locListCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locListStateName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 8,
  },
  locCitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  locCityBadge: {
    backgroundColor: Colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locCityText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.text,
  },
  noCitiesText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
});
