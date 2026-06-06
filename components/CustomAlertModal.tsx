import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { registerAlertListener, unregisterAlertListener, CustomAlertConfig } from "@/lib/custom-alert";
import * as Haptics from "expo-haptics";

export default function CustomAlertModal() {
  const [config, setConfig] = useState<CustomAlertConfig>({
    title: "",
    message: "",
    buttons: [],
    visible: false,
  });

  useEffect(() => {
    registerAlertListener((newConfig) => {
      // Choose haptics based on alert type
      const titleLower = newConfig.title.toLowerCase();
      const messageLower = (newConfig.message || "").toLowerCase();

      if (titleLower.includes("error") || titleLower.includes("failed") || titleLower.includes("invalid")) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (titleLower.includes("saved") || titleLower.includes("success") || titleLower.includes("copied") || titleLower.includes("deleted")) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (titleLower.includes("warning") || titleLower.includes("delete") || titleLower.includes("unlink")) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setConfig(newConfig);
    });

    return () => {
      unregisterAlertListener();
    };
  }, []);

  const handleButtonPress = (onPress?: () => void) => {
    setConfig((prev) => ({ ...prev, visible: false }));
    if (onPress) {
      // Trigger callback asynchronously to ensure modal dismisses cleanly first
      setTimeout(() => {
        onPress();
      }, 100);
    }
  };

  if (!config.visible) return null;

  // Dynamically determine icon, colors, and design tokens based on keywords in title
  const getAlertStyle = () => {
    const titleLower = config.title.toLowerCase();

    if (titleLower.includes("error") || titleLower.includes("fail") || titleLower.includes("invalid") || titleLower.includes("not allowed")) {
      return {
        icon: "close-circle" as const,
        iconColor: Colors.error,
        accentBg: "rgba(231, 76, 60, 0.08)",
      };
    }
    if (titleLower.includes("saved") || titleLower.includes("success") || titleLower.includes("copied") || titleLower.includes("success") || titleLower.includes("done")) {
      return {
        icon: "checkmark-circle" as const,
        iconColor: Colors.primary, // Green theme primary
        accentBg: "rgba(46, 204, 113, 0.08)",
      };
    }
    if (titleLower.includes("warning") || titleLower.includes("delete") || titleLower.includes("remove") || titleLower.includes("unlink") || titleLower.includes("sure")) {
      return {
        icon: "alert-circle" as const,
        iconColor: Colors.accent, // Gold accent for warning/danger
        accentBg: "rgba(241, 196, 15, 0.08)",
      };
    }
    // Default Info style
    return {
      icon: "information-circle" as const,
      iconColor: Colors.primary,
      accentBg: Colors.overlay,
    };
  };

  const styleDetails = getAlertStyle();

  // If no buttons are specified, default to a single "OK" button
  const alertButtons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: "OK" }];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={() => handleButtonPress()}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon */}
          <View style={[styles.iconWrapper, { backgroundColor: styleDetails.accentBg }]}>
            <Ionicons name={styleDetails.icon} size={38} color={styleDetails.iconColor} />
          </View>

          {/* Alert Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Alert Message */}
          {config.message ? (
            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
              nestedScrollEnabled
            >
              <Text style={styles.message}>{config.message}</Text>
            </ScrollView>
          ) : null}

          {/* Buttons Row / Column */}
          <View
            style={[
              styles.buttonContainer,
              alertButtons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal,
            ]}
          >
            {alertButtons.map((btn, index) => {
              // Custom styles for cancel/destructive buttons
              const isCancel = btn.style === "cancel" || btn.text?.toLowerCase() === "cancel" || btn.text?.toLowerCase() === "later";
              const isDestructive = btn.style === "destructive" || btn.text?.toLowerCase() === "delete" || btn.text?.toLowerCase() === "remove";

              let btnStyle = styles.defaultButton;
              let txtStyle = styles.defaultButtonText;

              if (isCancel) {
                btnStyle = styles.cancelButton;
                txtStyle = styles.cancelButtonText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveButton;
                txtStyle = styles.destructiveButtonText;
              } else {
                btnStyle = styles.primaryButton;
                txtStyle = styles.primaryButtonText;
              }

              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.button,
                    btnStyle,
                    alertButtons.length === 2 && styles.halfButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                >
                  <Text style={[styles.buttonText, txtStyle]} numberOfLines={1}>
                    {btn.text || "OK"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  messageScroll: {
    maxHeight: 140,
    marginTop: 8,
    width: "100%",
  },
  messageContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  message: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 20,
    gap: 8,
  },
  buttonContainerHorizontal: {
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonContainerVertical: {
    flexDirection: "column",
  },
  button: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  halfButton: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: "#fff",
  },
  cancelButton: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  destructiveButtonText: {
    color: "#fff",
  },
  defaultButton: {
    backgroundColor: Colors.primary,
  },
  defaultButtonText: {
    color: "#fff",
  },
});
