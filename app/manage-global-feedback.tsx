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
import { getAppMessages, deleteAppMessage } from "@/lib/store";

interface AppMessage {
  id: string;
  message: string;
  createdAt: number;
  email?: string;
  phone?: string;
  details?: string;
  idea?: string;
}

export default function ManageGlobalFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getAppMessages();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load global feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Ticket",
      "Are you sure you want to delete this global feedback ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const success = await deleteAppMessage(id);
            if (success) {
              setMessages((prev) => prev.filter((m) => m.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert("Error", "Failed to delete ticket. Please try again.");
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Global App Tickets</Text>
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
          <Text style={styles.emptyTitle}>Zero Open Tickets</Text>
          <Text style={styles.emptySubtitle}>All user support tickets have been resolved!</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.infoCol}>
                  {item.phone ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoText}>{item.phone}</Text>
                    </View>
                  ) : null}
                  {item.email ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoText}>{item.email}</Text>
                    </View>
                  ) : null}
                  {!item.phone && !item.email ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoText}>Anonymous User</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.subjectLabel}>Subject:</Text>
              <Text style={styles.messageText}>{item.message}</Text>

              {item.details ? (
                <>
                  <Text style={styles.sectionLabel}>Additional Details:</Text>
                  <Text style={styles.detailText}>{item.details}</Text>
                </>
              ) : null}

              {item.idea ? (
                <View style={styles.ideaContainer}>
                  <Text style={styles.ideaLabel}>
                    <Ionicons name="bulb-outline" size={14} color="#B08E35" /> Suggested Idea:
                  </Text>
                  <Text style={styles.ideaText}>{item.idea}</Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.deleteBtnText}>Resolve Ticket</Text>
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 8,
  },
  infoCol: {
    gap: 4,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  subjectLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  ideaContainer: {
    backgroundColor: 'rgba(212, 168, 67, 0.05)',
    borderColor: '#EADBB6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  ideaLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: '#B08E35',
    marginBottom: 4,
  },
  ideaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  dateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  messageText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  deleteBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
});
