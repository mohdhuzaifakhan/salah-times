import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getMasjidById, updateMasjidTimetable } from "@/lib/store";
import { Timetable, PRAYER_NAMES, PRAYER_ORDER } from "@/lib/types";

const PRAYER_ICONS: Record<string, string> = {
  fajr: "sunny-outline",
  dhuhr: "sunny",
  asr: "partly-sunny",
  maghrib: "cloudy-night",
  isha: "moon",
  jummah: "people",
};

export default function EditTimetableScreen() {
  const { masjidId } = useLocalSearchParams<{ masjidId: string }>();
  const insets = useSafeAreaInsets();
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [masjidName, setMasjidName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (masjidId) {
      getMasjidById(masjidId).then((m) => {
        if (m) {
          setTimetable({ ...m.timetable });
          setMasjidName(m.name);
        }
        setLoading(false);
      });
    }
  }, [masjidId]);

  const updateTime = (prayer: keyof Timetable, value: string) => {
    if (!timetable) return;
    let cleaned = value.replace(/[^0-9:]/g, "");
    if (cleaned.length === 2 && !cleaned.includes(":") && value.length > (timetable[prayer] || "").length) {
      cleaned = cleaned + ":";
    }
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    setTimetable({ ...timetable, [prayer]: cleaned });
  };

  const handleSave = async () => {
    if (!timetable || !masjidId) return;

    for (const prayer of PRAYER_ORDER) {
      const time = timetable[prayer];
      if (!/^\d{2}:\d{2}$/.test(time)) {
        Alert.alert("Invalid Time", `Please enter a valid time for ${PRAYER_NAMES[prayer]} (HH:MM format).`);
        return;
      }
      const [h, m] = time.split(":").map(Number);
      if (h < 0 || h > 23 || m < 0 || m > 59) {
        Alert.alert("Invalid Time", `${PRAYER_NAMES[prayer]} has an invalid time value.`);
        return;
      }
    }

    setSaving(true);
    await updateMasjidTimetable(masjidId, timetable);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    Alert.alert("Saved", "Prayer times have been updated.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!timetable) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Masjid not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Timetable</Text>
        <Text style={styles.subtitle}>{masjidName}</Text>

        <View style={styles.card}>
          {PRAYER_ORDER.map((prayer) => (
            <View key={prayer} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={PRAYER_ICONS[prayer] as any}
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.prayerName}>{PRAYER_NAMES[prayer]}</Text>
              </View>
              <TextInput
                style={styles.timeInput}
                value={timetable[prayer]}
                onChangeText={(v) => updateTime(prayer, v)}
                keyboardType="numbers-and-punctuation"
                placeholder="HH:MM"
                placeholderTextColor={Colors.textMuted}
                maxLength={5}
              />
            </View>
          ))}
        </View>

        <Text style={styles.hint}>Use 24-hour format (e.g. 05:10, 13:30, 18:45)</Text>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.btnPressed,
            saving && styles.btnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  prayerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  timeInput: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.primaryDark,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnText: {
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
  errorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: Colors.textMuted,
  },
});
