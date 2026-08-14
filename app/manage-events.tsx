import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getGlobalEvents, getMasjidEvents, createEvent, updateEvent, deleteEvent } from "@/lib/store";
import { AppEvent } from "@/lib/types";
import { EventCard } from "@/components/EventCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ImageViewerModal } from "@/components/ImageViewerModal";

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
  const [link, setLink] = useState("");
  const [expiryHours, setExpiryHours] = useState(24);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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
      showCustomAlert("Error", "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [masjidId, isGlobal]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handlePickImage = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert("Permission Denied", "We need permission to access your library to upload a flyer.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setImageUri(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageUri(asset.uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showCustomAlert("Error", "Failed to select image.");
    }
  };

  const handleRemoveImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageUri(null);
  };

  const handleStartEdit = (event: AppEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEventId(event.id);
    setTitle(event.title);
    setDescription(event.description || "");
    setLink(event.link || "");
    setImageUri(event.imageUrl || null);

    const remainingHours = Math.max(1, Math.round((event.endDate - Date.now()) / (1000 * 60 * 60)));
    const closest = EXPIRY_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr.hours - remainingHours) < Math.abs(prev.hours - remainingHours) ? curr : prev
    );
    setExpiryHours(closest.hours);
  };

  const handleCancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEventId(null);
    setTitle("");
    setDescription("");
    setLink("");
    setImageUri(null);
    setExpiryHours(24);
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) {
      showCustomAlert("Error", "Event title is required.");
      return;
    }
    if (!admin?.uid) return;

    setSaving(true);
    try {
      const endDate = Date.now() + expiryHours * 60 * 60 * 1000;
      if (editingEventId) {
        await updateEvent(editingEventId, {
          title: title.trim(),
          description: description.trim(),
          endDate,
          imageUrl: imageUri || undefined,
          link: link.trim() || undefined,
        });
        showCustomAlert("Success", "Event updated successfully.");
      } else {
        await createEvent({
          title: title.trim(),
          description: description.trim(),
          endDate,
          masjidId: masjidId!,
          createdBy: admin.uid,
          imageUrl: imageUri || undefined,
          link: link.trim() || undefined,
        });
        showCustomAlert("Success", "Event created successfully.");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle("");
      setDescription("");
      setLink("");
      setImageUri(null);
      setEditingEventId(null);
      loadEvents();
    } catch (error) {
      console.error("Failed to save event:", error);
      showCustomAlert("Error", editingEventId ? "Could not update event." : "Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    showCustomAlert("Delete Event", "Are you sure you want to delete this event?", [
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
            showCustomAlert("Error", "Could not delete event.");
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

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>
              {editingEventId ? "Edit Event" : "Create New Event"}
            </Text>
            {editingEventId && (
              <Pressable onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
            )}
          </View>
          
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

          <Text style={styles.label}>Website Link / URL (Optional)</Text>
          <TextInput
            style={styles.input}
            value={link}
            onChangeText={setLink}
            placeholder="E.g. https://example.com/event-registration"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Event Flyer / Image (Optional)</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Pressable style={styles.imagePreviewPressable} onPress={() => setViewerVisible(true)}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand-outline" size={14} color="#fff" />
                  <Text style={styles.zoomBadgeText}>Tap to Zoom Full</Text>
                </View>
              </Pressable>
              <Pressable style={styles.removeImageBtn} onPress={handleRemoveImage}>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.removeImageText}>Remove Flyer</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.uploadBtn} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={Colors.primary} />
              <Text style={styles.uploadBtnText}>Select Event Flyer</Text>
            </Pressable>
          )}

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
            onPress={handleSaveEvent}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={editingEventId ? "save-outline" : "add"} size={20} color="#fff" />
                <Text style={styles.createBtnText}>
                  {editingEventId ? "Update Event" : "Create Event"}
                </Text>
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
              onEdit={handleStartEdit}
            />
          ))
        )}
      </KeyboardAwareScrollViewCompat>

      <ImageViewerModal
        visible={viewerVisible}
        imageUrl={imageUri}
        onClose={() => setViewerVisible(false)}
        title={title || "Flyer Preview"}
      />
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
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cancelEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelEditText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.error,
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
  imagePreviewContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: "#12161A",
    alignItems: "center",
  },
  imagePreviewPressable: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  zoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  zoomBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#ffffff",
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  removeImageText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: Colors.overlay,
    marginBottom: 16,
  },
  uploadBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
});
