import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { useAuth } from "@/lib/auth-context";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessLogin?: (masjidName: string) => void;
}

export function QRScannerModal({ visible, onClose, onSuccessLogin }: QRScannerModalProps) {
  const { loginAsGuest } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setManualInput("");
      setShowManualInput(false);
    }
  }, [visible]);

  const extractMasjidId = (data: string): string | null => {
    if (!data) return null;
    let cleanData = data.trim();

    if (
      (cleanData.startsWith('"') && cleanData.endsWith('"')) ||
      (cleanData.startsWith("'") && cleanData.endsWith("'"))
    ) {
      cleanData = cleanData.slice(1, -1).trim();
    }

    // 1. Try direct JSON parse on clean string
    try {
      const parsed = JSON.parse(cleanData);
      if (typeof parsed === "object" && parsed !== null && parsed.masjidId) {
        return String(parsed.masjidId).trim();
      }
      if (typeof parsed === "string") {
        try {
          const innerParsed = JSON.parse(parsed);
          if (innerParsed && innerParsed.masjidId) return String(innerParsed.masjidId).trim();
        } catch {}
      }
    } catch {}

    // 2. Try regex matching JSON block {...} inside text
    const jsonBlockMatch = cleanData.match(/\{[\s\S]*\}/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[0]);
        if (parsed && parsed.masjidId) return String(parsed.masjidId).trim();
      } catch {}
    }

    // 3. Try matching "masjidId": "xxx" or "masjidId":"xxx" or masjidId=xxx anywhere in text
    const keyMatch = cleanData.match(/["']?masjidId["']?\s*[:=]\s*["']?([^"'\s,}&}]+)/i);
    if (keyMatch && keyMatch[1]) {
      return decodeURIComponent(keyMatch[1].trim());
    }

    // 4. URL scheme format: salah-times://guest-login?masjidId=xxx
    if (cleanData.includes("masjidId=")) {
      const match = cleanData.match(/masjidId=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1].trim());
    }

    // 5. URL path format: /masjid/12345
    const urlPathMatch = cleanData.match(/\/masjid\/([a-zA-Z0-9_-]+)/i);
    if (urlPathMatch && urlPathMatch[1]) {
      return urlPathMatch[1].trim();
    }

    // 6. Fallback: treat as raw masjid ID (alphanumeric string with _ or -)
    if (/^[a-zA-Z0-9_-]+$/.test(cleanData) && cleanData.length >= 3) {
      return cleanData;
    }

    return null;
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await processCode(data);
  };

  const processCode = async (rawCode: string) => {
    const masjidId = extractMasjidId(rawCode);

    if (!masjidId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showCustomAlert(
        "Invalid QR Code",
        `The scanned QR code is not a valid Masjid Login QR code.\n\nDetected text: "${rawCode.trim().slice(0, 80)}"`,
        [
          { text: "Try Again", onPress: () => setScanned(false) },
          { text: "Enter Code Manually", onPress: () => setShowManualInput(true) },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await loginAsGuest(masjidId);
      if (result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
        if (onSuccessLogin) {
          onSuccessLogin(result.masjidName || "Masjid");
        } else {
          showCustomAlert(
            "⚡ 1-Day Guest Login Active!",
            `You are now logged in as guest to "${result.masjidName}" for 24 hours. Your access will automatically end after 1 day.`
          );
        }
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showCustomAlert("Login Failed", result.error || "Could not log into this masjid.");
        setScanned(false);
      }
    } catch (err: any) {
      console.error("Error processing QR login:", err);
      showCustomAlert("Error", "Failed to process QR login.");
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Required",
          "Permission to access photo gallery is required to select a saved QR code image."
        );
        return;
      }

      // Quality 0.5 compresses high-resolution photos/screenshots to a size ML Kit can decode reliably
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickerUri = result.assets[0].uri;
      setLoading(true);

      const ALL_TYPES: any[] = [
        "qr",
        "aztec",
        "ean13",
        "ean8",
        "pdf417",
        "upc_e",
        "datamatrix",
        "code39",
        "code93",
        "itf14",
        "codabar",
        "code128",
        "upc_a",
      ];

      let scannedCodes: any[] = [];

      // Attempt 1: Scan picker URI directly
      try {
        scannedCodes = await Camera.scanFromURLAsync(pickerUri, ALL_TYPES);
      } catch (e) {
        console.warn("Direct scan error:", e);
      }

      // Attempt 2: Copy to local cache file URI on Android content:// paths
      if ((!scannedCodes || scannedCodes.length === 0) && Platform.OS === "android") {
        try {
          const fileExt = pickerUri.toLowerCase().includes("png") ? "png" : "jpg";
          const tempFile = `${FileSystem.cacheDirectory}qr_scan_${Date.now()}.${fileExt}`;
          await FileSystem.copyAsync({
            from: pickerUri,
            to: tempFile,
          });
          scannedCodes = await Camera.scanFromURLAsync(tempFile, ALL_TYPES);
        } catch (e) {
          console.warn("File copy scan error:", e);
        }
      }

      // Process scanned code candidates
      if (scannedCodes && scannedCodes.length > 0) {
        for (const item of scannedCodes) {
          const rawData = item.data || (item as any).raw || (item as any).value || "";
          if (rawData) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await processCode(rawData);
            return;
          }
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showCustomAlert(
        "No QR Code Detected",
        "Could not detect a QR code in the selected photo.\n\nTip: You can also enter the Masjid ID directly using 'Enter Code'.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter Code Manually", onPress: () => setShowManualInput(true) },
        ]
      );
    } catch (error: any) {
      console.error("Error scanning image from gallery:", error);
      showCustomAlert(
        "Scan Failed",
        "Could not read QR code from the selected image. Please try another photo or enter the code manually.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter Code Manually", onPress: () => setShowManualInput(true) },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      showCustomAlert("Required", "Please enter a valid Masjid ID or QR Code text.");
      return;
    }
    await processCode(manualInput.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Masjid QR Code</Text>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.torchBtn}>
            <Ionicons
              name={torch ? "flash" : "flash-outline"}
              size={22}
              color={torch ? "#FFD700" : "#fff"}
            />
          </TouchableOpacity>
        </View>

        {/* Scanner View */}
        <View style={styles.scannerContainer}>
          {permission === null ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.statusText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerBox}>
              <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionText}>
                Please grant camera permission to scan the Masjid QR code, or upload a saved QR image directly from your gallery.
              </Text>

              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.galleryPickBtn} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={18} color={Colors.accent} />
                <Text style={styles.galleryPickBtnText}>Upload QR from Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : showManualInput ? (
            <View style={styles.manualContainer}>
              <Ionicons name="key-outline" size={42} color={Colors.primary} style={{ alignSelf: "center" }} />
              <Text style={styles.manualTitle}>Enter Masjid Code</Text>
              <Text style={styles.manualSubtitle}>
                If you have a printed QR or Masjid ID, paste or enter it below to log in for 1 day.
              </Text>

              <TextInput
                style={styles.manualInput}
                placeholder="e.g. masjid_12345 or QR content"
                placeholderTextColor={Colors.textMuted}
                value={manualInput}
                onChangeText={setManualInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleManualSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit & Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.galleryPickBtnAlt} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={18} color={Colors.accent} />
                <Text style={styles.galleryPickBtnTextAlt}>Upload QR from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchScanBtn}
                onPress={() => setShowManualInput(false)}
              >
                <Ionicons name="qr-code-outline" size={18} color={Colors.primary} />
                <Text style={styles.switchScanBtnText}>Switch back to Camera Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, width: "100%" }}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                enableTorch={torch}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
              />

              {/* Overlay graphics */}
              <View style={styles.overlayMask}>
                <Text style={styles.instructionText}>
                  Align any Masjid QR Code within the frame or upload from gallery
                </Text>

                <View style={styles.scanTargetBox}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color={Colors.accent} />
                      <Text style={styles.loggingInText}>Processing QR Code...</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.galleryToggleBtn}
                    onPress={handlePickImage}
                    disabled={loading}
                  >
                    <Ionicons name="image-outline" size={18} color={Colors.accent} />
                    <Text style={styles.galleryToggleText}>Upload QR Image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.manualToggleBtn}
                    onPress={() => setShowManualInput(true)}
                    disabled={loading}
                  >
                    <Ionicons name="text-outline" size={18} color="#fff" />
                    <Text style={styles.manualToggleText}>Enter Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0F172A",
  },
  closeBtn: {
    padding: 6,
  },
  torchBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#fff",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  centerBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  statusText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 12,
  },
  permissionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#fff",
    marginTop: 12,
  },
  permissionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  grantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  grantBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  galleryPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    marginTop: 12,
  },
  galleryPickBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  galleryPickBtnAlt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  galleryPickBtnTextAlt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  overlayMask: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  instructionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 20,
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: Colors.accent,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loggingInText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
    marginTop: 10,
  },
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  galleryToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  galleryToggleText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.accent,
  },
  manualToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  manualToggleText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  manualContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: "center",
  },
  manualTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginTop: 12,
  },
  manualSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  manualInput: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  switchScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
  },
  switchScanBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
});
