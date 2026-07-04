import React, { useState } from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
  Modal,
  useColorScheme,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resetting, setResetting] = useState(false);

  const theme = {
    background: isDark ? "#121212" : "#FAFBF6",
    cardBackground: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A2E1A",
    textSecondary: isDark ? "rgba(255, 255, 255, 0.7)" : "#5A6E5A",
    primary: "#1E4620",
    accent: "#D4A843",
    buttonText: "#FFFFFF",
  };

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const handleResetData = async () => {
    try {
      setResetting(true);
      await AsyncStorage.clear();
      await reloadAppAsync();
    } catch (clearError) {
      console.error("Failed to clear data:", clearError);
      resetError();
    } finally {
      setResetting(false);
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {__DEV__ && (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={[
            styles.topButton,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.accent,
              borderWidth: 1,
            },
          ]}
        >
          <Feather name="code" size={20} color={theme.accent} />
        </Pressable>
      )}

      <View style={[styles.contentCard, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(30, 70, 32, 0.08)' }]}>
          <Ionicons name="alert-circle" size={48} color={theme.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Oops! Kuch galat ho gaya
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Something went wrong
        </Text>

        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {error.message || "An unexpected error has occurred. Please restart the app or reset cached data to recover."}
        </Text>

        <View style={styles.buttonGroup}>
          <Pressable
            onPress={handleRestart}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              Try Again / Reload
            </Text>
          </Pressable>

          <Pressable
            onPress={handleResetData}
            disabled={resetting}
            style={({ pressed }) => [
              styles.outlineButton,
              {
                borderColor: '#D4A843',
                opacity: (pressed || resetting) ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.outlineButtonText, { color: '#D4A843' }]}>
              {resetting ? "Resetting..." : "Reset App Cache"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Error Details</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.text, fontFamily: monoFont }]} selectable>
                  {formatErrorDetails()}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  topButton: {
    position: "absolute",
    right: 20,
    top: 50,
    width: 44,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  contentCard: {
    width: "100%",
    maxWidth: 450,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.2)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.6,
  },
  message: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  outlineButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    padding: 20,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
