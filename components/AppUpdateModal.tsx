import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  BackHandler,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AppUpdateConfig, openPlayStore, CURRENT_VERSION } from "@/lib/updates";
import * as Haptics from "expo-haptics";

interface AppUpdateModalProps {
  visible: boolean;
  config: AppUpdateConfig;
  isForced: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AppUpdateModal({
  visible,
  config,
  isForced,
  onClose,
  onUpdate,
}: AppUpdateModalProps) {
  // Prevent dismissal of forced updates via Android back button
  useEffect(() => {
    if (visible && isForced) {
      const backAction = () => {
        return true; // Block default back behavior
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }
  }, [visible, isForced]);

  const handleUpdatePress = async () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await openPlayStore(config.playStoreUrl);
      if (onUpdate) {
        onUpdate();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("[Updates] Failed to redirect to store:", err);
    }
  };

  const handleLaterPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={isForced ? () => { } : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Graphic */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="rocket-outline" size={32} color="#fff" />
            </View>
          </View>

          {/* Update Title */}
          <Text style={styles.title}>
            {isForced ? "Critical Update Available" : "New Version Available"}
          </Text>

          {/* Version Comparison Row */}
          <View style={styles.versionRow}>
            <View style={styles.currentVerBadge}>
              <Text style={styles.currentVerText}>Current: v{CURRENT_VERSION}</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color={Colors.primary} style={{ marginHorizontal: 6 }} />
            <View style={styles.newVerBadge}>
              <Text style={styles.newVerText}>Latest: v{config.latestVersion}</Text>
            </View>
          </View>

          <Text style={styles.description}>
            {isForced
              ? "Your current version is no longer supported. Please update to the latest version to continue using the app."
              : "A new version of Salah Times is available. Update now to enjoy the latest features and bug fixes!"}
          </Text>

          {/* Release Notes */}
          {config.releaseNotes && config.releaseNotes.length > 0 && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>What&apos;s New:</Text>
              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesContent}
                nestedScrollEnabled
              >
                {config.releaseNotes.map((note, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={[styles.actions, isForced && styles.forcedActions]}>
            {!isForced && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.laterButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleLaterPress}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.updateButton,
                isForced && styles.fullWidthButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleUpdatePress}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.text,
    textAlign: "center",
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  currentVerBadge: {
    backgroundColor: "#F0F4EC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentVerText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  newVerBadge: {
    backgroundColor: "#E2F3E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newVerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  versionBadge: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.accent,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    overflow: "hidden",
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  notesContainer: {
    width: "100%",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  notesTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 100,
  },
  notesContent: {
    paddingBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingRight: 8,
  },
  bulletPoint: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary,
    fontSize: 14,
    marginRight: 6,
    lineHeight: 16,
  },
  bulletText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  forcedActions: {
    justifyContent: "center",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  laterButton: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  laterButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  updateButton: {
    backgroundColor: Colors.primary,
  },
  fullWidthButton: {
    flex: 1,
    width: "100%",
  },
  updateButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
