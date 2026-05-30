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
import { getMasjidById, updateMasjidDetails } from "@/lib/store";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function EditMasjidDetailsScreen() {
  const { masjidId } = useLocalSearchParams<{ masjidId: string }>();
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
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
            // Permission check
            if (
              admin?.role === "masjid_admin" &&
              admin.masjidId &&
              admin.masjidId !== m.id
            ) {
              Alert.alert("Not Allowed", "You can only update your own masjid details.");
              router.back();
              return;
            }
            setName(m.name);
            setAddress(m.address);
            setCity(m.city);
          }
        } catch (error) {
          console.error("Failed to load masjid details:", error);
          if (isMounted) {
            Alert.alert("Error", "Unable to load details.");
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

  const handleSave = async () => {
    if (!masjidId) return;
    if (!name.trim()) {
      Alert.alert("Required", "Masjid Name is required.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Required", "Address is required.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Required", "City is required.");
      return;
    }

    if (admin?.role === "masjid_admin" && admin.masjidId !== masjidId) {
      Alert.alert("Not Allowed", "You can only update your own masjid.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMasjidDetails(masjidId, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
      });

      if (!updated) {
        Alert.alert("Error", "Failed to save details. Please try again.");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Masjid details have been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to save details:", error);
      Alert.alert("Error", "Something went wrong while saving details.");
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
          <Text style={styles.topBarTitle}>Edit Masjid Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>Update the Name, Address, or Locality details</Text>

        {/* Input Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Masjid Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Masjid Al-Rahman"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address / Locality</Text>
          <TextInput
            style={styles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 123 Main St, Sector 4"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. New Delhi"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

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
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 10,
  },
  textInput: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
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
});
