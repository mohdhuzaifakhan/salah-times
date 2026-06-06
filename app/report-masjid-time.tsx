import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createMasjidMessage, createAdminNotification } from "@/lib/store";
import { PRAYER_NAMES, PRAYER_ORDER } from "@/lib/types";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth-context";

export default function ReportMasjidTimeScreen() {
  const { masjidId, masjidName } = useLocalSearchParams<{ masjidId: string; masjidName: string }>();
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();

  const [prayer, setPrayer] = useState<string>("fajr");
  const [time, setTime] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleTimeInput = (val: string) => {
    let cleaned = val.replace(/[^0-9:]/g, "");
    if (cleaned.length === 2 && !cleaned.includes(":") && val.length > time.length) {
      cleaned = cleaned + ":";
    }
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    setTime(cleaned);
  };

  const handleSubmit = async () => {
    if (!masjidId) return;
    if (!time.trim()) {
      showCustomAlert("Time Required", "Please enter the suggested correct time.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      showCustomAlert("Invalid Time format", "Please enter suggested time in HH:MM format.");
      return;
    }
    const [h, m] = time.split(":").map(Number);
    if (h < 1 || h > 12 || m < 0 || m > 59) {
      showCustomAlert("Invalid Time", "Please enter a valid hour (01-12) and minute (00-59).");
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      showCustomAlert("Phone Number Required", "Please enter a valid contact phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const displaySuggested = `${time} ${ampm}`;
      const prayerLabel = PRAYER_NAMES[prayer as keyof typeof PRAYER_NAMES];
      await createMasjidMessage(
        masjidId,
        masjidName || "Masjid",
        prayerLabel,
        displaySuggested,
        message,
        phone,
        "timetable_update"
      );

      await createAdminNotification(
        "Timetable Correction Request",
        `${masjidName || "Masjid"}: Suggested ${prayerLabel} time is ${displaySuggested}.`,
        "timetable_update",
        masjidId,
        masjidName || "Masjid"
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        "Report Submitted",
        "Thank you! Your feedback has been sent to the masjid admin for review.",
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
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
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

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Which prayer time is incorrect?</Text>
          <View style={styles.prayerSelector}>
            {PRAYER_ORDER.map((p) => (
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
                  {PRAYER_NAMES[p]}
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
    marginBottom: 24,
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
});
