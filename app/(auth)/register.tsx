import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function RegisterScreen() {
  const { admin, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masjidName, setMasjidName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!admin || admin.role !== "super_admin") {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>Access denied</Text>
        <Text style={styles.deniedText}>Only super admin can register masjid accounts.</Text>
      </View>
    );
  }

  const handleRegister = async () => {
    if (!admin || admin.role !== "super_admin") {
      Alert.alert("Not Allowed", "Only super admin can register masjid accounts.");
      return;
    }
    if (!email.trim() || !password.trim() || !masjidName.trim() || !city.trim() || !address.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await register(email.trim(), password, masjidName.trim(), city.trim(), address.trim());
      if (result.error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Registration Failed", result.error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your masjid has been registered!", [
        { text: "OK", onPress: () => router.dismissAll() },
      ]);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <Ionicons name="add-circle" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Register Masjid</Text>
        <Text style={styles.subtitle}>Create masjid and masjid admin account</Text>

        <View style={styles.sectionLabel}>
          <Ionicons name="person-outline" size={16} color={Colors.primary} />
          <Text style={styles.sectionText}>Account Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Masjid Admin Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="imam@masjid.com"
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
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Create a password"
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

        <View style={[styles.sectionLabel, { marginTop: 8 }]}>
          <Ionicons name="moon-outline" size={16} color={Colors.primary} />
          <Text style={styles.sectionText}>Masjid Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Masjid Name</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Masjid Al-Noor"
              placeholderTextColor={Colors.textMuted}
              value={masjidName}
              onChangeText={setMasjidName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="business-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. London"
              placeholderTextColor={Colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Full address"
              placeholderTextColor={Colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.registerBtn,
            pressed && styles.btnPressed,
            loading && styles.btnDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>Register Masjid</Text>
          )}
        </Pressable>
      </ScrollView>
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
    paddingTop: 24,
    gap: 14,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: -4,
  },
  sectionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  registerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  registerBtnText: {
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
  deniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  deniedTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  deniedText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
