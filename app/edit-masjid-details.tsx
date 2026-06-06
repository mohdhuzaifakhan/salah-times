import React, { useState, useEffect } from "react";
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
import { useAuth, updateMasjidAdminCredentials, deleteMasjidAndAuth } from "@/lib/auth-context";
import { getMasjidById, updateMasjidDetails, getUserProfile, getUserProfileByEmail } from "@/lib/store";
import * as Clipboard from "expo-clipboard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function EditMasjidDetailsScreen() {
  const { masjidId } = useLocalSearchParams<{ masjidId: string }>();
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();

  const canManageCredentials = 
    admin?.role === "super_admin" || 
    (admin?.role === "masjid_admin" && admin.masjidId === masjidId);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [adminUid, setAdminUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
              showCustomAlert("Not Allowed", "You can only update your own masjid details.");
              router.back();
              return;
            }
            setName(m.name);
            setAddress(m.address);
            setCity(m.city);
            setAdminUid(m.adminUid);

            const canManageCreds =
              admin?.role === "super_admin" ||
              (admin?.role === "masjid_admin" && admin.masjidId === m.id);

            if (canManageCreds) {
              let profile = null;
              if (m.adminUid) {
                profile = await getUserProfile(m.adminUid);
              }
              
              if (!profile && m.adminEmail) {
                profile = await getUserProfileByEmail(m.adminEmail);
                if (profile && profile.uid && isMounted) {
                  setAdminUid(profile.uid);
                }
              }

              if (profile && isMounted) {
                setEmail(profile.email || m.adminEmail || "");
                setOrigEmail(profile.email || m.adminEmail || "");
              } else if (m.adminEmail && isMounted) {
                setEmail(m.adminEmail);
                setOrigEmail(m.adminEmail);
              }
            }
          }
        } catch (error) {
          console.error("Failed to load masjid details:", error);
          if (isMounted) {
            showCustomAlert("Error", "Unable to load details.");
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
      showCustomAlert("Required", "Masjid Name is required.");
      return;
    }
    if (!address.trim()) {
      showCustomAlert("Required", "Address is required.");
      return;
    }
    if (!city.trim()) {
      showCustomAlert("Required", "City is required.");
      return;
    }

    if (admin?.role === "masjid_admin" && admin.masjidId !== masjidId) {
      showCustomAlert("Not Allowed", "You can only update your own masjid.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMasjidDetails(masjidId, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        adminUid: adminUid || undefined,
      });

      if (!updated) {
        showCustomAlert("Error", "Failed to save details. Please try again.");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert("Saved", "Masjid details have been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to save details:", error);
      showCustomAlert("Error", "Something went wrong while saving details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!masjidId) return;
    
    showCustomAlert(
      "Delete Masjid",
      "This will permanently delete the masjid, its prayer timetable, events, feedbacks, and admin account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            showCustomAlert(
              "Confirm Deletion",
              "Are you absolutely sure you want to delete this masjid? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      let resolvedPassword: string | undefined = undefined;
                      if (adminUid) {
                        const profile = await getUserProfile(adminUid);
                        if (profile && profile.password) {
                          resolvedPassword = profile.password;
                        }
                      }
                      const res = await deleteMasjidAndAuth(masjidId, adminUid, origEmail, resolvedPassword);
                      if (res.success) {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showCustomAlert("Deleted", "Masjid has been deleted.", [
                          { text: "OK", onPress: () => router.back() }
                        ]);
                      } else {
                        showCustomAlert("Error", res.error || "Failed to delete masjid.");
                      }
                    } catch (err) {
                      console.error("Failed to delete masjid:", err);
                      showCustomAlert("Error", "Something went wrong.");
                    } finally {
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
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

        {canManageCredentials && (
          <>
            <View style={styles.sectionDivider} />
            
            <View style={styles.sectionLabelRow}>
              <Ionicons name="key-outline" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitleText}>Account Credentials</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Admin Email ID</Text>
              <TextInput
                style={[styles.textInput, styles.readOnlyInput]}
                value={email}
                editable={false}
                placeholder="imam@masjid.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </>
        )}

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

        {admin?.role === "super_admin" && (
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.btnPressed,
              deleting && styles.btnDisabled,
            ]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete Masjid</Text>
              </>
            )}
          </Pressable>
        )}
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
  readOnlyInput: {
    backgroundColor: Colors.borderLight,
    color: Colors.textMuted,
  },
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  eyeBtn: {
    paddingLeft: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 24,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: Colors.primary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.overlay,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  copyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  saveBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
  },
  deleteBtnText: {
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
