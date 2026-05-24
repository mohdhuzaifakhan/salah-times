import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getMasjidById, updateMasjidTimetable } from "@/lib/store";
import { Timetable, PRAYER_NAMES, PRAYER_ORDER } from "@/lib/types";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { refreshPrimaryMasjidNotifications } from "@/lib/notifications";

const PRAYER_ICONS: Record<string, string> = {
  fajr: "sunny-outline",
  dhuhr: "sunny",
  asr: "partly-sunny",
  maghrib: "cloudy-night",
  isha: "moon",
  jummah: "people",
};

interface FormTime {
  time: string; // "01:30" (12-hour format)
  ampm: "AM" | "PM";
}

type FormTimetable = Record<keyof Timetable, FormTime>;

// Helper: Convert 24-hour database times to 12-hour form state
const convert24ToForm = (timetable24: Timetable): FormTimetable => {
  const form: Partial<FormTimetable> = {};
  for (const key of PRAYER_ORDER) {
    const time24 = timetable24[key];
    const [h, m] = time24.split(":");
    const hour24 = parseInt(h, 10);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    const padHour = hour12.toString().padStart(2, "0");
    form[key] = {
      time: `${padHour}:${m}`,
      ampm,
    };
  }
  return form as FormTimetable;
};

// Helper: Convert 12-hour form state to 24-hour database times
const convertFormTo24 = (form: FormTimetable): Timetable => {
  const timetable24: Partial<Timetable> = {};
  for (const key of PRAYER_ORDER) {
    const { time, ampm } = form[key];
    const [h, m] = time.split(":");
    let hour = parseInt(h, 10);
    if (ampm === "PM" && hour < 12) {
      hour += 12;
    } else if (ampm === "AM" && hour === 12) {
      hour = 0;
    }
    const padHour = hour.toString().padStart(2, "0");
    timetable24[key] = `${padHour}:${m}`;
  }
  return timetable24 as Timetable;
};

export default function EditTimetableScreen() {
  const { masjidId } = useLocalSearchParams<{ masjidId: string }>();
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();
  const [formTimetable, setFormTimetable] = useState<FormTimetable | null>(null);
  const [masjidName, setMasjidName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (masjidId) {
      (async () => {
        try {
          const m = await getMasjidById(masjidId);
          if (!isMounted) return;
          if (m) {
            if (
              admin?.role === "masjid_admin" &&
              admin.masjidId &&
              admin.masjidId !== m.id
            ) {
              Alert.alert("Not Allowed", "You can only update your own masjid timetable.");
              router.back();
              return;
            }
            setFormTimetable(convert24ToForm(m.timetable));
            setMasjidName(m.name);
          }
        } catch (error) {
          console.error("Failed to load timetable:", error);
          if (isMounted) {
            Alert.alert("Error", "Unable to load timetable.");
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [admin?.masjidId, admin?.role, masjidId]);

  const updateFormTime = (prayer: keyof Timetable, value: string) => {
    if (!formTimetable) return;
    let cleaned = value.replace(/[^0-9:]/g, "");
    if (cleaned.length === 2 && !cleaned.includes(":") && value.length > (formTimetable[prayer].time || "").length) {
      cleaned = cleaned + ":";
    }
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    setFormTimetable({
      ...formTimetable,
      [prayer]: {
        ...formTimetable[prayer],
        time: cleaned,
      },
    });
  };

  const toggleAMPM = (prayer: keyof Timetable, ampm: "AM" | "PM") => {
    if (!formTimetable) return;
    setFormTimetable({
      ...formTimetable,
      [prayer]: {
        ...formTimetable[prayer],
        ampm,
      },
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!formTimetable || !masjidId) return;
    if (admin?.role === "masjid_admin" && admin.masjidId !== masjidId) {
      Alert.alert("Not Allowed", "You can only update your own masjid timetable.");
      return;
    }

    // Validate 12-hour formatted inputs
    for (const prayer of PRAYER_ORDER) {
      const { time } = formTimetable[prayer];
      if (!/^\d{2}:\d{2}$/.test(time)) {
        Alert.alert("Invalid Time", `Please enter a valid time for ${PRAYER_NAMES[prayer]} (HH:MM format).`);
        return;
      }
      const [h, m] = time.split(":").map(Number);
      if (h < 1 || h > 12 || m < 0 || m > 59) {
        Alert.alert("Invalid Time", `${PRAYER_NAMES[prayer]} has an invalid time value (must be between 01:00 and 12:59).`);
        return;
      }
    }

    setSaving(true);
    try {
      const timetable24 = convertFormTo24(formTimetable);
      const updated = await updateMasjidTimetable(masjidId, timetable24);
      if (!updated) {
        Alert.alert("Error", "Failed to save timetable. Please try again.");
        return;
      }

      // Automatically refresh local notifications if this is the user's primary masjid
      await refreshPrimaryMasjidNotifications();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Prayer times have been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to save timetable:", error);
      Alert.alert("Error", "Something went wrong while saving timetable.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!formTimetable) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Masjid not found</Text>
      </View>
    );
  }

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

              <View style={styles.timeContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={formTimetable[prayer].time}
                  onChangeText={(v) => updateFormTime(prayer, v)}
                  keyboardType="number-pad"
                  placeholder="12:00"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                />
                
                <View style={styles.ampmContainer}>
                  <Pressable
                    style={[
                      styles.ampmButton,
                      formTimetable[prayer].ampm === "AM" && styles.ampmActive,
                    ]}
                    onPress={() => toggleAMPM(prayer, "AM")}
                  >
                    <Text style={[
                      styles.ampmText,
                      formTimetable[prayer].ampm === "AM" && styles.ampmActiveText,
                    ]}>AM</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.ampmButton,
                      formTimetable[prayer].ampm === "PM" && styles.ampmActive,
                    ]}
                    onPress={() => toggleAMPM(prayer, "PM")}
                  >
                    <Text style={[
                      styles.ampmText,
                      formTimetable[prayer].ampm === "PM" && styles.ampmActiveText,
                    ]}>PM</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>Enter times in 12-hour format (e.g. 05:10 AM, 01:30 PM)</Text>

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
      </KeyboardAwareScrollViewCompat>
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
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.primaryDark,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 75,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ampmContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    overflow: "hidden",
  },
  ampmButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
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
