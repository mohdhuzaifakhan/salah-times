import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import * as Haptics from "expo-haptics";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  size?: number;
  color?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onTranscript,
  size = 20,
  color = Colors.primary,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [manualText, setManualText] = useState("");

  const handleResult = (text: string) => {
    setManualText(text);
  };

  const { isListening, isProcessing, transcript, setTranscript, error, startListening, stopListening } =
    useVoiceSearch(handleResult);

  const handlePress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setManualText("");
    setModalVisible(true);
    await startListening();
  };

  const handleApply = async () => {
    const finalQuery = manualText.trim() || transcript.trim();
    if (finalQuery) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTranscript(finalQuery);
    }
    await stopListening();
    setModalVisible(false);
  };

  const handleClose = async () => {
    await stopListening();
    setModalVisible(false);
  };

  const displayText = manualText || transcript;

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.micButton}
        activeOpacity={0.7}
        accessibilityLabel="Voice Search"
        accessibilityRole="button"
      >
        <Ionicons
          name={isListening ? "mic" : "mic-outline"}
          size={size}
          color={isListening ? "#E53E3E" : color}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity onPress={handleClose} style={styles.topCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.micCircleWrap}>
              <View style={[styles.micCircle, (isListening || isProcessing) && styles.micCircleActive]}>
                <Ionicons
                  name={isListening ? "mic" : isProcessing ? "sync-outline" : "mic-off"}
                  size={36}
                  color="#ffffff"
                />
              </View>
              {(isListening || isProcessing) && (
                <ActivityIndicator color={Colors.primary} style={styles.spinner} size="large" />
              )}
            </View>

            <Text style={styles.statusTitle}>
              {isListening
                ? "Listening... Speak now"
                : isProcessing
                ? "Converting speech to text..."
                : "Voice Search"}
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.voiceTextInput}
                value={displayText}
                onChangeText={(val) => {
                  setManualText(val);
                  setTranscript(val);
                }}
                placeholder={error ? error : "Speak now or type your query..."}
                placeholderTextColor={error ? "#E53E3E" : Colors.textMuted}
                multiline
                autoFocus={Platform.OS !== "web"}
              />
              {displayText ? (
                <TouchableOpacity
                  onPress={() => {
                    setManualText("");
                    setTranscript("");
                  }}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  micButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "88%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
  },
  topCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 4,
  },
  micCircleWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    marginTop: 8,
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  micCircleActive: {
    backgroundColor: Colors.primary,
  },
  spinner: {
    position: "absolute",
  },
  statusTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    width: "100%",
  },
  errorBannerText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#92400E",
  },
  inputContainer: {
    width: "100%",
    minHeight: 54,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  voiceTextInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: "top",
  },
  clearBtn: {
    padding: 4,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "flex-end",
    gap: 12,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
});

