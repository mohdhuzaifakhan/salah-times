import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { stopPrayerAlarm, subscribeAlarmState } from "@/lib/notifications";

export const PrayerAlarmModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [prayerName, setPrayerName] = useState("Namaaz");
  const [masjidName, setMasjidName] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(15);

  const pulseAnim = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const unsubscribe = subscribeAlarmState((state) => {
      setVisible(state.isPlaying);
      if (state.isPlaying) {
        setPrayerName(state.prayerName || "Namaaz");
        setMasjidName(state.masjidName || "");
        setSecondsLeft(15);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (visible && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, secondsLeft]);

  useEffect(() => {
    if (visible) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [visible, pulseAnim]);

  const handleStop = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await stopPrayerAlarm();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleStop}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Animated.View
            style={[
              styles.iconWrap,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="notifications" size={40} color="#FFFFFF" />
          </Animated.View>

          <Text style={styles.title}>🕌 {prayerName} Alert!</Text>
          <Text style={styles.subtitle}>
            10 minutes remaining for {prayerName} namaaz
            {masjidName ? ` at ${masjidName}` : ""}.
          </Text>

          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={14} color={Colors.primary} />
            <Text style={styles.timerText}>Ringing ({secondsLeft}s)</Text>
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStop}
            activeOpacity={0.8}
          >
            <Ionicons name="stop-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.stopButtonText}>STOP ALARM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  timerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
  },
  stopButton: {
    width: "100%",
    height: 48,
    backgroundColor: Colors.error,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButtonText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
