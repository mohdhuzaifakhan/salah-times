import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { showCustomAlert } from "@/lib/custom-alert";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { QRScannerModal } from "@/components/QRScannerModal";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showCustomAlert("Missing Fields", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.user) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showCustomAlert("Login Failed", result.error || "Invalid email or password.");
    }
  };

  const handleForgotPassword = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showCustomAlert(
      "Forgot Password?",
      "Masjid accounts use custom credentials managed directly by the Super Admin.\n\nIf you forgot your password, please contact the Super Admin to get your password reset.",
      [
        { text: "OK" },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="key" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to manage your masjid</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="admin@masjid.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.loginBtn,
            pressed && styles.btnPressed,
            loading && styles.btnDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Login</Text>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 1-Day Guest QR Scan Login Button */}
        <TouchableOpacity
          style={styles.qrScanBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowQRScanner(true);
          }}
        >
          <View style={styles.qrIconBadge}>
            <Ionicons name="qr-code-outline" size={22} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrScanTitle}>Scan QR for 1-Day Login</Text>
            <Text style={styles.qrScanDesc}>Instant guest access without email or password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
        </TouchableOpacity>
      </ScrollView>

      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccessLogin={() => {
          setShowQRScanner(false);
          router.dismissAll();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
    gap: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 4,
  },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  forgotText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    width: "100%",
  },
  loginBtnText: {
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
  },
  qrScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    width: "100%",
  },
  qrIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrScanTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  qrScanDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
