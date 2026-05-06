import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getGlobalEvents, getMasjidEvents, createEvent, deleteEvent } from "@/lib/store";
import { AppEvent } from "@/lib/types";
import { EventCard } from "@/components/EventCard";

const EXPIRY_OPTIONS = [
  { label: "1 Day", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "1 Week", hours: 168 },
];

export default function ManageEventsScreen() {
  const params = useLocalSearchParams();
  const masjidId = typeof params.masjidId === "string" ? params.masjidId : (Array.isArray(params.masjidId) ? params.masjidId[0] : "global");
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();
  
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryHours, setExpiryHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const isGlobal = masjidId === "global";
  const pageTitle = isGlobal ? "Global Events" : "Masjid Events";

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (isGlobal) {
        const data = await getGlobalEvents();
        setEvents(data);
      } else if (masjidId) {
        const data = await getMasjidEvents(masjidId);
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
      Alert.alert("Error", "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [masjidId, isGlobal]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Event title is required.");
      return;
    }
    if (!admin?.uid) return;

    setSaving(true);
    try {
      const endDate = Date.now() + expiryHours * 60 * 60 * 1000;
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        endDate,
        masjidId: masjidId!,
        createdBy: admin.uid,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle("");
      setDescription("");
      loadEvents();
    } catch (error) {
      console.error("Failed to create event:", error);
      Alert.alert("Error", "Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(eventId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadEvents();
          } catch (error) {
            console.error("Failed to delete event:", error);
            Alert.alert("Error", "Could not delete event.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.topBarBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create New Event</Text>
          
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="E.g. Eid Prayer Time"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Expires In</Text>
          <View style={styles.expiryRow}>
            {EXPIRY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.hours}
                style={[
                  styles.expiryChip,
                  expiryHours === opt.hours && styles.expiryChipActive,
                ]}
                onPress={() => setExpiryHours(opt.hours)}
              >
                <Text
                  style={[
                    styles.expiryChipText,
                    expiryHours === opt.hours && styles.expiryChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.createBtn,
              pressed && styles.btnPressed,
              saving && styles.btnDisabled,
            ]}
            onPress={handleCreateEvent}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Create Event</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
          Active Events
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active events.</Text>
          </View>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isAdmin={true}
              onDelete={handleDelete}
            />
          ))
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
  },
  expiryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  expiryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  expiryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  expiryChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  expiryChipTextActive: {
    color: "#fff",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  createBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.7,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});
