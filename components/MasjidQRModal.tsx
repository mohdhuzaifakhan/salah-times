import React, { useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import Colors from "@/constants/colors";
import { showCustomAlert } from "@/lib/custom-alert";
import { Masjid } from "@/lib/types";

interface MasjidQRModalProps {
  visible: boolean;
  onClose: () => void;
  masjid: Masjid | null;
}

export function MasjidQRModal({ visible, onClose, masjid }: MasjidQRModalProps) {
  const qrRef = useRef<any>(null);

  if (!masjid) return null;

  const qrPayload = JSON.stringify({
    type: "masjid_guest_login",
    masjidId: masjid.id,
    masjidName: masjid.name,
  });

  const handleShareOrDownload = () => {
    if (!qrRef.current) {
      showCustomAlert("Error", "QR code is rendering, please try again in a moment.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    qrRef.current.toDataURL(async (data: string) => {
      try {
        const fileName = `${masjid.name.replace(/[^a-zA-Z0-9]/g, "_")}_QR.png`;
        if (Platform.OS === "web") {
          const link = document.createElement("a");
          link.href = `data:image/png;base64,${data}`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showCustomAlert("Downloaded!", "Masjid QR Code image downloaded.");
        } else {
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "image/png",
              dialogTitle: `Share ${masjid.name} 1-Day Login QR Code`,
              UTI: "public.png",
            });
          } else {
            showCustomAlert("Saved!", "QR Code image saved.");
          }
        }
      } catch (err) {
        console.error("Failed to share QR code image:", err);
        showCustomAlert("Error", "Could not export QR code image.");
      }
    });
  };

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(masjid.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showCustomAlert("Copied!", `Masjid ID "${masjid.id}" copied to clipboard.`);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>1-Day Login QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.masjidInfoBadge}>
              <Ionicons name="moon" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.masjidName}>{masjid.name}</Text>
                <Text style={styles.masjidLocation}>{masjid.address ? `${masjid.address}, ${masjid.city}` : masjid.city}</Text>
              </View>
            </View>

            <Text style={styles.instruction}>
              Scan this QR code with any phone camera or inside the app to log into this masjid for 1 Day without needing a password.
            </Text>

            {/* QR Card Container */}
            <View style={styles.qrCardContainer}>
              <View style={styles.qrFrame}>
                <QRCode
                  value={qrPayload}
                  size={200}
                  color={Colors.primary}
                  backgroundColor="#FFFFFF"
                  getRef={(c) => (qrRef.current = c)}
                />
              </View>
              <Text style={styles.qrCardLabel}>Scan for 1-Day Access</Text>
              <Text style={styles.qrCardSubtext}>Salah Times App</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleShareOrDownload}>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnPrimaryText}>Save / Share QR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleCopyId}>
                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                <Text style={styles.actionBtnSecondaryText}>Copy ID</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    alignItems: "center",
  },
  masjidInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    width: "100%",
    marginBottom: 14,
  },
  masjidName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
  masjidLocation: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  instruction: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  qrCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    width: "100%",
  },
  qrFrame: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  qrCardLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: Colors.primary,
    marginTop: 14,
  },
  qrCardSubtext: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtnPrimary: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnPrimaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnSecondaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
});
