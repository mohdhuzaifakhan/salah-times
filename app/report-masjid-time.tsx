import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createMasjidMessage, createAdminNotification } from "@/lib/store";
import { PRAYER_NAMES, PRAYER_ORDER, RAMADAN_TIMES_ORDER, OTHER_TIMES_ORDER, Timetable } from "@/lib/types";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth-context";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";

const ALL_REPORT_KEYS: (keyof Timetable)[] = [
  ...PRAYER_ORDER,
  ...RAMADAN_TIMES_ORDER,
  ...OTHER_TIMES_ORDER,
];

export default function ReportMasjidTimeScreen() {
  const { masjidId: paramMasjidId, masjidName: paramMasjidName } = useLocalSearchParams<{ masjidId: string; masjidName: string }>();
  const { primaryMasjid } = usePrimaryMasjid();
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();

  const masjidId = paramMasjidId || primaryMasjid?.id || "";
  const masjidName = paramMasjidName || primaryMasjid?.name || "Masjid";

  const [prayer, setPrayer] = useState<string>("fajr");
  const [time, setTime] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [timetablePhoto, setTimetablePhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTimeInput = (val: string) => {
    let cleaned = val.replace(/[^0-9:]/g, "");
    if (cleaned.length === 2 && !cleaned.includes(":") && val.length > time.length) {
      cleaned = cleaned + ":";
    }
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    setTime(cleaned);
  };

  const handlePickTimetablePhoto = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Required",
          "Please grant access to your photo library to select a timetable image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formattedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setTimetablePhoto(formattedUri);
      }
    } catch (error) {
      console.error("Error picking timetable photo:", error);
      showCustomAlert("Error", "Failed to select timetable photo.");
    }
  };

  const handleSubmit = async () => {
    if (!masjidId) {
      showCustomAlert(
        "No Masjid Selected",
        "Please select your primary masjid before submitting a correction."
      );
      return;
    }

    const hasTime = time.trim().length > 0;
    const hasPhoto = !!timetablePhoto;

    if (!hasTime && !hasPhoto) {
      showCustomAlert(
        "Time or Photo Required",
        "Please enter the suggested correct time OR upload a photo of the timetable board."
      );
      return;
    }

    if (hasTime) {
      if (!/^\d{2}:\d{2}$/.test(time)) {
        showCustomAlert("Invalid Time format", "Please enter suggested time in HH:MM format (e.g. 05:30).");
        return;
      }
      const [h, m] = time.split(":").map(Number);
      if (h < 1 || h > 12 || m < 0 || m > 59) {
        showCustomAlert("Invalid Time", "Please enter a valid hour (01-12) and minute (00-59).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const displaySuggested = hasTime ? `${time} ${ampm}` : "See Attached Photo";
      const prayerLabel = PRAYER_NAMES[prayer as keyof typeof PRAYER_NAMES];
      await createMasjidMessage(
        masjidId,
        masjidName || "Masjid",
        prayerLabel,
        displaySuggested,
        message,
        phone,
        "timetable_update",
        timetablePhoto || undefined
      );

      const notifBody = hasPhoto
        ? `${masjidName || "Masjid"}: Timetable correction report with attached board photo.`
        : `${masjidName || "Masjid"}: Suggested ${prayerLabel} time is ${displaySuggested}.`;

      await createAdminNotification(
        "Timetable Correction Request",
        notifBody,
        "timetable_update",
        masjidId,
        masjidName || "Masjid"
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        "Report Submitted",
        "Thank you! Your report with timetable details has been sent to the masjid admin for review.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      showCustomAlert("Submission Failed", "Something went wrong. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>Report Incorrect Times</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>{masjidName}</Text>
        <Text style={styles.hindiSubtitle}>galat samay ke bare mein btaye</Text>
        <Text style={styles.hindiSubtitle}>गलत समय के बारे में बताएं</Text>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Which prayer or event time is incorrect?</Text>
          <View style={styles.prayerSelector}>
            {ALL_REPORT_KEYS.map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.prayerChip,
                  prayer === p && styles.activePrayerChip,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPrayer(p);
                }}
              >
                <Text style={[
                  styles.prayerChipText,
                  prayer === p && styles.activePrayerChipText,
                ]}>
                  {PRAYER_NAMES[p] || p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>What is the correct jamat time?</Text>
          <View style={styles.timeContainer}>
            <TextInput
              style={styles.timeInput}
              value={time}
              onChangeText={handleTimeInput}
              keyboardType="number-pad"
              placeholder="12:00"
              placeholderTextColor={Colors.textMuted}
              maxLength={5}
            />
            
            <View style={styles.ampmContainer}>
              <Pressable
                style={[
                  styles.ampmButton,
                  ampm === "AM" && styles.ampmActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmpm("AM");
                }}
              >
                <Text style={[
                  styles.ampmText,
                  ampm === "AM" && styles.ampmActiveText,
                ]}>AM</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ampmButton,
                  ampm === "PM" && styles.ampmActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmpm("PM");
                }}
              >
                <Text style={[
                  styles.ampmText,
                  ampm === "PM" && styles.ampmActiveText,
                ]}>PM</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Timetable Photo Upload (Optional) */}
        <View style={styles.formGroup}>
          <View style={styles.labelHeaderRow}>
            <Text style={styles.label}>Photo of Timetable Board (Optional)</Text>
            <View style={styles.badgeOptionalWrap}>
              <Text style={styles.badgeOptionalText}>Photo Upload</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            If you don't know how to write exact times, simply upload a photo of the masjid's timetable board!
          </Text>

          {timetablePhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: timetablePhoto }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimetablePhoto(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={15} color="#FFFFFF" />
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickTimetablePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={20} color={Colors.primary} />
              <Text style={styles.uploadBtnText}>Upload Timetable Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. +91 9876543210"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Additional Details / Message</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholder="e.g. Congregation time changed from beginning of this month..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && styles.btnPressed,
            submitting && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  hindiSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 10,
  },
  prayerSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prayerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activePrayerChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  prayerChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activePrayerChipText: {
    color: "#fff",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeInput: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.primaryDark,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 90,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ampmContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
  },
  ampmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ampmActive: {
    backgroundColor: Colors.primary,
  },
  ampmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
  },
  ampmActiveText: {
    color: "#fff",
  },
  textInput: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
  },
  submitBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: {
    opacity: 0.7,
  },
  labelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badgeOptionalWrap: {
    backgroundColor: Colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeOptionalText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.primary,
  },
  helperText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  uploadBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  photoPreviewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.border,
    height: 180,
    backgroundColor: "#000",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removePhotoBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  removePhotoText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
  },
});
