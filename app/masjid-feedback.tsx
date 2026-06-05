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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getMasjidMessages, deleteMasjidMessage } from "@/lib/store";

interface MasjidMessage {
  id: string;
  masjidId: string;
  masjidName: string;
  prayerName: string;
  suggestedTime: string;
  message: string;
  phone: string;
  createdAt: number;
  messageType?: string;
}

export default function MasjidFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { masjidId, masjidName } = useLocalSearchParams<{ masjidId: string; masjidName?: string }>();
  const [messages, setMessages] = useState<MasjidMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [masjidId]);

  const loadMessages = async () => {
    if (!masjidId) return;
    try {
      setLoading(true);
      const data = await getMasjidMessages(masjidId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load feedback messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message? This action is permanent.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await deleteMasjidMessage(id);
            if (success) {
              setMessages((prev) => prev.filter((m) => m.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert("Error", "Failed to delete message. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {masjidName ? `${masjidName} Feedbacks` : "Time Feedbacks"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="mail-open-outline" size={88} color={Colors.border} />
          </View>
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptySubtitle}>
            No reported wrong times for {masjidName || "your masjid"}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.typeBadgeContainer}>
                {item.messageType === "timetable_update" ? (
                  <View style={[styles.typeBadge, styles.timetableTypeBadge]}>
                    <Ionicons name="time-outline" size={13} color="#B08E35" />
                    <Text style={[styles.typeBadgeText, styles.timetableTypeText]}>Timetable Correction Request</Text>
                  </View>
                ) : (
                  <View style={[styles.typeBadge, styles.feedbackTypeBadge]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.primary} />
                    <Text style={[styles.typeBadgeText, styles.feedbackTypeText]}>General Feedback</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardHeader}>
                <View style={styles.prayerBadge}>
                  <Text style={styles.prayerName}>{item.prayerName}</Text>
                </View>
                <Text style={styles.suggestedTime}>Suggested: {item.suggestedTime}</Text>
              </View>

              {item.message.trim() !== "" && (
                <Text style={styles.messageText}>{item.message}</Text>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.emailRow}>
                  <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.emailText}>{item.phone}</Text>
                </View>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
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
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  typeBadgeContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  timetableTypeBadge: {
    backgroundColor: "rgba(212, 168, 67, 0.12)",
  },
  timetableTypeText: {
    color: "#B08E35",
  },
  feedbackTypeBadge: {
    backgroundColor: Colors.overlay,
  },
  feedbackTypeText: {
    color: Colors.primary,
  },
  typeBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 8,
  },
  prayerBadge: {
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prayerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  suggestedTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  messageText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  emailText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(192, 57, 43, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(192, 57, 43, 0.15)",
  },
  deleteBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.error,
  },
});
