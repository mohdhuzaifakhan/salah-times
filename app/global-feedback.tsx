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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createAppMessage } from "@/lib/store";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES = [
  {
    id: "register_masjid",
    label: "Request New Masjid & Timetable",
    icon: "add-circle-outline",
    defaultSubject: "Request New Masjid Registration & Timetable",
    placeholder: "Please specify Masjid name, full address, city, and local Imam/Admin contact details so we can add & configure it...",
  },
  {
    id: "report_bug",
    label: "Report Bug / App Issue",
    icon: "bug-outline",
    defaultSubject: "Report App Bug / Technical Error",
    placeholder: "Please describe what error happened, which screen, and steps to reproduce...",
  },
  {
    id: "feature_idea",
    label: "Suggest Feature Idea",
    icon: "bulb-outline",
    defaultSubject: "Suggest New App Feature / Improvement",
    placeholder: "What new feature or improvement would make this app even better? Share your ideas!",
  },
  {
    id: "general",
    label: "General Inquiry / Feedback",
    icon: "chatbubble-ellipses-outline",
    defaultSubject: "General Inquiry / Feedback",
    placeholder: "Write your message or inquiry here...",
  },
];

export default function GlobalFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("register_masjid");
  const [message, setMessage] = useState(CATEGORIES[0].defaultSubject);
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  const handleSubmit = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      showCustomAlert("Contact Phone Required", "Please enter a valid phone number so our support team can contact you.");
      return;
    }
    if (!message.trim()) {
      showCustomAlert("Subject Required", "Please enter a summary or subject for your feedback.");
      return;
    }
    if (!details.trim()) {
      showCustomAlert("Details Required", "Please provide description details for your request or feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const fullSubject = `[${activeCategory.label}] ${message.trim()}`;
      await createAppMessage(fullSubject, phone.trim(), details.trim(), idea.trim());

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        "Feedback Submitted",
        "Thank you! Your feedback has been sent directly to the development team.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Failed to submit app feedback:", error);
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
          <Text style={styles.topBarTitle}>App Issue & Feedback</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Have feedback, want to add a new masjid, or facing an issue? Contact support directly.
        </Text>

        {/* Category Chips Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Feedback Reason / Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id);
                    if (!message.trim() || CATEGORIES.some((c) => c.defaultSubject === message.trim())) {
                      setMessage(cat.defaultSubject);
                    }
                  }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={isSelected ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.categoryCardText, isSelected && styles.categoryCardTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Mandatory Phone Field */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Contact Phone Number *</Text>
            <Text style={styles.requiredTag}>Mandatory</Text>
          </View>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject / Summary *</Text>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. Request to add Masjid Al-Noor in Rampur"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description & Details *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            placeholder={activeCategory.placeholder}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Suggested Feature or Extra Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaSmall]}
            value={idea}
            onChangeText={setIdea}
            multiline
            numberOfLines={3}
            placeholder="Any extra suggestions or feature ideas..."
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
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
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
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  requiredTag: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.error,
    backgroundColor: "rgba(224, 86, 36, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryGrid: {
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  categoryCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.overlay,
  },
  categoryCardText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  categoryCardTextActive: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputField: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
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
    height: 120,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    height: 80,
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
