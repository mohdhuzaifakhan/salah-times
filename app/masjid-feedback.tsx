import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { deleteMasjidMessage, getMasjidMessages } from "@/lib/store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const openCall = (phone: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Linking.openURL(`tel:${phone}`);
  };

  const handleDelete = (id: string) => {
    showCustomAlert(
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
              showCustomAlert("Error", "Failed to delete message. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
        {masjidId ? (
          <Pressable
            style={styles.headerTimetableBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/edit-timetable",
                params: { masjidId },
              });
            }}
          >
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
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
                {item.createdAt ? (
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                ) : null}
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

              {item.phone ? (
                <View style={styles.contactSection}>
                  <View style={styles.phoneLabelRow}>
                    <Ionicons name="person-circle-outline" size={15} color={Colors.textMuted} />
                    <Text style={styles.phoneLabelText}>Contact: {item.phone}</Text>
                  </View>
                  <View style={styles.contactBtnGroup}>
                    <TouchableOpacity
                      style={styles.whatsAppBtn}
                      onPress={() => openWhatsApp(item.phone)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
                      <Text style={styles.contactBtnText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.phoneCallBtn}
                      onPress={() => openCall(item.phone)}
                    >
                      <Ionicons name="call" size={13} color="#ffffff" />
                      <Text style={styles.contactBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View />
                <View style={styles.actionRow}>
                  {(item.masjidId || masjidId) && (
                    <Pressable
                      style={styles.editTimetableBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/edit-timetable",
                          params: { masjidId: item.masjidId || masjidId },
                        });
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.primary} />
                      <Text style={styles.editTimetableBtnText}>Edit Timetable</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
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
  headerTimetableBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(13, 115, 119, 0.08)",
  },
  typeBadgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editTimetableBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(13, 115, 119, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.18)",
  },
  editTimetableBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
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
  contactSection: {
    backgroundColor: "rgba(13, 115, 119, 0.04)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.08)",
  },
  phoneLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  phoneLabelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.text,
  },
  contactBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  phoneCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  contactBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#ffffff",
  },
});
