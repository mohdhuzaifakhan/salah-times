import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Svg, {
  Circle,
  Path,
  G,
  Line,
  Text as SvgText,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { useLocation } from "@/lib/location-context";

// Kaaba Coordinates in Makkah, Saudi Arabia
const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

function calculateQiblaAngle(lat: number, lng: number): number {
  const phiK = (KAABA_LAT * Math.PI) / 180.0;
  const lambdaK = (KAABA_LNG * Math.PI) / 180.0;
  const phi = (lat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;

  const y = Math.sin(lambdaK - lambda);
  const x =
    Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
  let qibla = (Math.atan2(y, x) * 180.0) / Math.PI;
  return Math.round((qibla + 360) % 360);
}

function calculateDistanceToKaaba(lat: number, lng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
  const dLon = ((KAABA_LNG - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((KAABA_LAT * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(267); // default 267° for South Asia / Rampur
  const [distanceKm, setDistanceKm] = useState(3995.8);
  const [isFacingQibla, setIsFacingQibla] = useState(false);
  const headingAnim = useRef(new Animated.Value(0)).current;
  const hasVibratedRef = useRef(false);

  useEffect(() => {
    let headingSubscription: Location.LocationSubscription | null = null;

    async function initCompass() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);

          if (loc?.coords) {
            const angle = calculateQiblaAngle(loc.coords.latitude, loc.coords.longitude);
            const dist = calculateDistanceToKaaba(loc.coords.latitude, loc.coords.longitude);
            setQiblaAngle(angle);
            setDistanceKm(dist);
          }

          headingSubscription = await Location.watchHeadingAsync((headingData) => {
            const heading = Math.round(headingData.trueHeading ?? headingData.magHeading ?? 0);
            setDeviceHeading(heading);

            Animated.timing(headingAnim, {
              toValue: heading,
              duration: 150,
              useNativeDriver: true,
            }).start();
          });
        }
      } catch (e) {
        console.warn("Compass watch error:", e);
      }
    }

    void initCompass();

    return () => {
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, []);

  // Check if device is facing within +/- 4 degrees of Qibla
  const diff = Math.abs((deviceHeading - qiblaAngle + 360) % 360);
  const facing = diff <= 4 || diff >= 356;

  useEffect(() => {
    setIsFacingQibla(facing);
    if (facing && !hasVibratedRef.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      hasVibratedRef.current = true;
    } else if (!facing) {
      hasVibratedRef.current = false;
    }
  }, [facing]);

  // Relative rotation of compass dial: needle points north when heading=0
  const compassRotate = headingAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Qibla</Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings")}
          style={styles.settingsBtn}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Makkah Map Distance Card */}
      <View style={styles.mapCard}>
        {/* World Map SVG Graphic Silhouette */}
        <Svg width="100%" height={90} viewBox="0 0 320 90">
          <Defs>
            <LinearGradient id="mapCardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#F0F8F4" />
              <Stop offset="100%" stopColor="#E6F4ED" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="320" height="90" rx="16" fill="url(#mapCardGrad)" />

          {/* World map stylized landmass silhouettes */}
          <Path
            d="M 20 25 Q 35 15, 60 22 Q 80 18, 95 35 Q 85 55, 65 50 Q 40 60, 20 40 Z"
            fill="#D5ECE0"
          />
          <Path
            d="M 120 20 Q 150 15, 175 25 Q 190 35, 170 60 Q 140 65, 125 45 Z"
            fill="#D5ECE0"
          />
          <Path
            d="M 210 22 Q 240 18, 270 30 Q 285 50, 260 70 Q 230 65, 215 45 Z"
            fill="#D5ECE0"
          />

          {/* Dotted green trajectory line from User location to Kaaba */}
          <Path
            d="M 75 50 Q 170 30, 260 38"
            stroke={Colors.primary}
            strokeWidth="2.5"
            strokeDasharray="4 4"
            fill="none"
          />

          {/* Origin ping (User position) */}
          <Circle cx="75" cy="50" r="5" fill={Colors.primary} />
          <Circle cx="75" cy="50" r="2.5" fill="#FFFFFF" />
        </Svg>

        {/* Floating Distance Badge on left */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceValue}>{distanceKm} km</Text>
          <Text style={styles.distanceLabel}>to Makkah</Text>
        </View>

        {/* Kaaba Vector Icon on right */}
        <View style={styles.kaabaIconBadge}>
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Rect width="32" height="32" rx="6" fill="#151E22" />
            <Rect x="0" y="7" width="32" height="4" fill="#D4A843" />
            <Rect x="12" y="16" width="8" height="16" rx="2" fill="#D4A843" />
          </Svg>
        </View>
      </View>

      {/* Main Compass Area */}
      <View style={styles.compassSection}>
        <Animated.View
          style={[
            styles.compassDialWrap,
            { transform: [{ rotate: compassRotate }] },
          ]}
        >
          <Svg width={270} height={270} viewBox="0 0 270 270">
            <Defs>
              <LinearGradient id="outerDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#14A3A8" />
                <Stop offset="100%" stopColor="#0D7377" />
              </LinearGradient>
            </Defs>

            {/* Outer Green Ring */}
            <Circle
              cx="135"
              cy="135"
              r="128"
              stroke="url(#outerDialGrad)"
              strokeWidth="6"
              fill="#FFFFFF"
            />
            <Circle cx="135" cy="135" r="121" stroke="#E2EBE5" strokeWidth="1.5" fill="none" />

            {/* Degree Tick Marks */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = i * 5;
              const isMajor = angle % 30 === 0;
              const rad = (angle * Math.PI) / 180;
              const r1 = 118;
              const r2 = isMajor ? 108 : 113;
              const x1 = 135 + r1 * Math.sin(rad);
              const y1 = 135 - r1 * Math.cos(rad);
              const x2 = 135 + r2 * Math.sin(rad);
              const y2 = 135 - r2 * Math.cos(rad);
              return (
                <Line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? Colors.primary : "#CBD5E1"}
                  strokeWidth={isMajor ? 2 : 1}
                />
              );
            })}

            {/* Cardinal Direction Letters */}
            <SvgText
              x="135"
              y="40"
              fontSize="16"
              fontWeight="bold"
              fill={Colors.primary}
              textAnchor="middle"
            >
              N
            </SvgText>
            <SvgText
              x="235"
              y="141"
              fontSize="15"
              fontWeight="bold"
              fill="#4A5568"
              textAnchor="middle"
            >
              E
            </SvgText>
            <SvgText
              x="135"
              y="242"
              fontSize="15"
              fontWeight="bold"
              fill="#4A5568"
              textAnchor="middle"
            >
              S
            </SvgText>
            <SvgText
              x="36"
              y="141"
              fontSize="15"
              fontWeight="bold"
              fill="#4A5568"
              textAnchor="middle"
            >
              W
            </SvgText>

            {/* Qibla Direction Needle (Fixed at qiblaAngle relative to compass dial) */}
            <G transform={`rotate(${qiblaAngle}, 135, 135)`}>
              {/* Green Kaaba Arrow Needle */}
              <Path
                d="M 135 48 L 146 125 L 124 125 Z"
                fill={Colors.primary}
              />
              <Path
                d="M 135 125 L 144 140 L 126 140 Z"
                fill="#CBD5E1"
              />
              {/* Center Kaaba Badge */}
              <Rect
                x="121"
                y="105"
                width="28"
                height="28"
                rx="6"
                fill="#151E22"
              />
              <Rect x="121" y="112" width="28" height="4" fill="#D4A843" />
            </G>

            {/* Center Pivot Point */}
            <Circle cx="135" cy="135" r="6" fill={Colors.primary} />
            <Circle cx="135" cy="135" r="3" fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {/* Angle Readout */}
        <View style={styles.angleReadout}>
          <Text style={styles.degreeText}>{qiblaAngle}°</Text>
          <Text style={styles.qiblaLabel}>Qibla Direction</Text>
        </View>
      </View>

      {/* Bottom Status Feedback Banner */}
      <View style={[styles.bottomBannerWrap, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 16 }]}>
        <View
          style={[
            styles.statusBanner,
            isFacingQibla ? styles.statusBannerSuccess : styles.statusBannerPending,
          ]}
        >
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={isFacingQibla ? "checkmark-circle" : "compass-outline"}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.statusText}>
            {isFacingQibla
              ? "You are facing Qibla"
              : `Turn ${(qiblaAngle - deviceHeading + 360) % 360 > 180 ? "left" : "right"} towards ${qiblaAngle}°`}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 50,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  settingsBtn: {
    padding: 6,
  },
  mapCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2EDE6",
  },
  distanceBadge: {
    position: "absolute",
    left: 14,
    top: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  distanceValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  distanceLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#E2F6ED",
  },
  kaabaIconBadge: {
    position: "absolute",
    right: 18,
    top: 22,
  },
  compassSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compassDialWrap: {
    width: 270,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
  },
  angleReadout: {
    alignItems: "center",
    marginTop: 28,
  },
  degreeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    color: "#1A2E1A",
  },
  qiblaLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  bottomBannerWrap: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 20 : 32,
  },
  statusBanner: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  statusBannerSuccess: {
    backgroundColor: Colors.primary,
  },
  statusBannerPending: {
    backgroundColor: "#1F2937",
  },
  statusIconWrap: {
    marginRight: 10,
  },
  statusText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});

