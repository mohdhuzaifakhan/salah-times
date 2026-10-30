import Colors from "@/constants/colors";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

export default function WelcomeSplashScreen() {
  const insets = useSafeAreaInsets();
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous spinner rotation
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // Route decision after brief splash display
    const timer = setTimeout(async () => {
      proceedToNextScreen();
    }, 2200);

    return () => {
      clearTimeout(timer);
      spinLoop.stop();
    };
  }, []);

  const proceedToNextScreen = async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    try {
      const completed = await hasCompletedOnboarding();
      if (completed) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      router.replace("/onboarding");
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Pressable
        style={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 20 },
        ]}
        onPress={proceedToNextScreen}
      >
        {/* Top/Center Mosque & Brand Section */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Mosque Architectural Graphic */}
          <View style={styles.graphicWrap}>
            <View style={styles.ambientHaloOuter} />
            <View style={styles.ambientHaloInner} />
            <View style={styles.imageCircleContainer}>
              <Image
                source={require("@/assets/images/welcome-mosque-circle.png")}
                style={styles.splashMosqueImage}
                resizeMode="contain"
              />
              <View style={styles.sheenOverlay} />
            </View>
          </View>

          {/* Arabic Calligraphy: As-Salah, As-Salah */}
          <Text style={styles.arabicCalligraphy}>الصَّلَاةَ الصَّلَاةَ</Text>

          {/* App Title */}
          <Text style={styles.appTitle}>Salah Times</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your Islamic Companion{"\n"}For A Better Life
          </Text>
        </Animated.View>

        {/* Bottom Loading Spinner Section */}
        <View style={styles.bottomContainer}>
          <Animated.View
            style={[
              styles.spinnerWrap,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Svg width={44} height={44} viewBox="0 0 44 44">
              {/* Background circle track */}
              <Circle
                cx="22"
                cy="22"
                r="18"
                stroke="#E2EDE6"
                strokeWidth="3.5"
                fill="none"
              />
              {/* Active spinning arc */}
              <Circle
                cx="22"
                cy="22"
                r="18"
                stroke={Colors.primary}
                strokeWidth="3.5"
                strokeDasharray="60 120"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          <Text style={styles.loadingText}>
            Loading...{"\n"}
            <Text style={styles.inshallahText}>Insha'Allah</Text>
          </Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 30 : 16,
    paddingBottom: 40,
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  graphicWrap: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  ambientHaloOuter: {
    position: "absolute",
    width: 255,
    height: 255,
    borderRadius: 127.5,
    backgroundColor: "rgba(13, 115, 119, 0.035)",
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.07)",
  },
  ambientHaloInner: {
    position: "absolute",
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: "rgba(13, 115, 119, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.12)",
  },
  imageCircleContainer: {
    width: 215,
    height: 215,
    borderRadius: 107.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#0D7377",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    position: "relative",
  },
  splashMosqueImage: {
    width: "100%",
    height: "100%",
  },
  sheenOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 107.5,
    borderWidth: 1.5,
    borderColor: "rgba(13, 115, 119, 0.16)",
  },
  arabicCalligraphy: {
    fontFamily: "Amiri_700Bold",
    fontSize: 32,
    color: Colors.primary,
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 6,
  },
  appTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 35,
    color: Colors.primaryDark,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  bottomContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  spinnerWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  loadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#728779",
    textAlign: "center",
  },
  inshallahText: {
    fontFamily: "Poppins_500Medium",
    color: "#4A6153",
  },
});

