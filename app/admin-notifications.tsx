import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getAdminNotifications, markNotificationAsRead, deleteAdminNotification } from "@/lib/store";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  masjidId: string;
  masjidName: string;
  createdAt: number;
  read: boolean;
}

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [admin]);

  const loadNotifications = async () => {
    if (!admin) return;
    try {
      setLoading(true);
      const data = await getAdminNotifications(admin.role, admin.masjidId);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load admin notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (item: AdminNotification) => {
    if (item.read) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await markNotificationAsRead(item.id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await deleteAdminNotification(id);
            if (success) {
              setNotifications((prev) => prev.filter((n) => n.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert("Error", "Failed to delete notification.");
            }
          },
        },
      ]
    );
  };

  const handleNotificationTap = async (item: AdminNotification) => {
    // 1. Mark as read in DB if unread
    if (!item.read) {
      await handleMarkRead(item);
    }

    // 2. Redirect to masjid feedback viewer page
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/masjid-feedback",
      params: { masjidId: item.masjidId, masjidName: item.masjidName },
    });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Notifications</Text>
        <Pressable onPress={loadNotifications} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={88} color={Colors.border} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>All caught up! You have no notifications.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => handleNotificationTap(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
                {item.type === "timetable_update" && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>Timetable</Text>
                  </View>
                )}
              </View>

              <Text style={styles.bodyText}>{item.body}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.tapToView}>Tap to view correction list</Text>
                <View style={styles.actionRow}>
                  {!item.read && (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleMarkRead(item)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                      <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Mark Read</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
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
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    backgroundColor: "rgba(13, 115, 119, 0.02)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  dateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#B08E35",
  },
  bodyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  tapToView: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.primary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  deleteBtn: {
    marginLeft: 4,
  },
});
