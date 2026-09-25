import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth, deleteMasjidAndAuth } from "@/lib/auth-context";
import { getMasjidById, updateMasjidDetails, getUserProfile, getUserProfileByEmail } from "@/lib/store";
import { useLocation } from "@/lib/location-context";
import * as Clipboard from "expo-clipboard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function EditMasjidDetailsScreen() {
  const { masjidId } = useLocalSearchParams<{ masjidId: string }>();
  const insets = useSafeAreaInsets();
  const { admin, resetMasjidPasswordByAdmin } = useAuth();
  const { locations } = useLocation();

  const canManageCredentials = 
    admin?.role === "super_admin" || 
    (admin?.role === "masjid_admin" && admin.masjidId === masjidId);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedState, setSelectedState] = useState(locations[0]?.state || "Uttar Pradesh");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminUid, setAdminUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Password reset modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const availableCities = useMemo(() => {
    const stDoc = locations.find((l) => l.state === selectedState);
    return stDoc ? stDoc.cities : [];
  }, [locations, selectedState]);

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
              showCustomAlert("Not Allowed", "You can only update your own masjid details.");
              router.back();
              return;
            }
            setName(m.name);
            setAddress(m.address);
            setCity(m.city);
            setAdminUid(m.adminUid);

            if (m.city && locations.length > 0) {
              const matchedLoc = locations.find((l) =>
                l.cities.some((c) => c.toLowerCase() === m.city.toLowerCase())
              );
              if (matchedLoc) {
                setSelectedState(matchedLoc.state);
              }
            }

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
                if (profile.password) setCurrentPassword(profile.password);
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

  const handleResetPassword = async () => {
    if (!masjidId) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      showCustomAlert("Invalid Password", "Password must be at least 6 characters long.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetMasjidPasswordByAdmin(masjidId, newPasswordInput.trim());
      if (res.success) {
        setCurrentPassword(newPasswordInput.trim());
        setShowResetModal(false);
        const newPass = newPasswordInput.trim();
        setNewPasswordInput("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Auto copy credentials to clipboard
        await Clipboard.setStringAsync(`Masjid: ${name}\nEmail: ${email}\nPassword: ${newPass}`);
        showCustomAlert(
          "Password Reset Successful!",
          `New password has been set for "${name}".\n\nEmail: ${email}\nPassword: ${newPass}\n\n(Copied to clipboard!)`
        );
      } else {
        showCustomAlert("Error", res.error || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      showCustomAlert("Error", err.message || "Something went wrong.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyCredentials = async () => {
    const credText = `Masjid: ${name}\nEmail: ${email}\nPassword: ${currentPassword || "Not Set"}`;
    await Clipboard.setStringAsync(credText);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showCustomAlert("Copied!", "Account credentials copied to clipboard.");
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
          <Text style={styles.label}>State</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
            {locations.map((loc) => {
              const isSel = loc.state === selectedState;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.chip, isSel && styles.chipActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedState(loc.state);
                    if (loc.cities.length > 0) setCity(loc.cities[0]);
                  }}
                >
                  <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{loc.state}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select City</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
            {availableCities.map((c) => {
              const isSel = c.toLowerCase() === city.toLowerCase();
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, isSel && styles.chipActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCity(c);
                  }}
                >
                  <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            style={[styles.textInput, { marginTop: 8 }]}
            value={city}
            onChangeText={setCity}
            placeholder="Or enter city name manually"
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

            {admin?.role === "super_admin" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword || "••••••••"}
                    editable={false}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {admin?.role === "super_admin" && (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TouchableOpacity style={styles.resetPassBtn} onPress={() => setShowResetModal(true)}>
                  <Ionicons name="key-outline" size={16} color="#fff" />
                  <Text style={styles.resetPassBtnText}>Reset Password</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCredentials}>
                  <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  <Text style={styles.copyBtnText}>Copy Credentials</Text>
                </TouchableOpacity>
              </View>
            )}
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

      {/* Reset Password Modal */}
      <Modal
        visible={showResetModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Masjid Password</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Set a new password for <Text style={{ fontFamily: "Poppins_700Bold" }}>{name}</Text> ({email}).
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={Colors.textMuted}
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
                secureTextEntry={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isResetting && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  resetPassBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  resetPassBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  copyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.overlay,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  modalDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
