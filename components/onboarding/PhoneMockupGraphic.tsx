import React from "react";
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
} from "react-native-svg";
import { View, StyleSheet, Dimensions } from "react-native";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PhoneMockupGraphicProps {
  slideIndex?: number;
  width?: number | string;
  height?: number;
}

export const PhoneMockupGraphic: React.FC<PhoneMockupGraphicProps> = ({
  slideIndex = 0,
  width,
  height = 290,
}) => {
  const graphicWidth =
    typeof width === "number"
      ? width
      : Math.min(SCREEN_WIDTH - 48, 330);

  return (
    <View style={[styles.container, { width: "100%", height }]}>
      <Svg
        width={graphicWidth}
        height={height}
        viewBox="0 0 340 300"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          {/* Backdrop Aura Gradient */}
          <RadialGradient id="auraGrad" cx="50%" cy="46%" rx="48%" ry="48%">
            <Stop offset="0%" stopColor="#E2F3E9" stopOpacity="0.95" />
            <Stop offset="70%" stopColor="#EBF7F0" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#FAFBF6" stopOpacity="0" />
          </RadialGradient>

          {/* Leaf Branch Green Gradient */}
          <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#1E7A5A" />
            <Stop offset="50%" stopColor="#2E9E74" />
            <Stop offset="100%" stopColor="#48BF91" />
          </LinearGradient>

          {/* Phone Frame Gradient */}
          <LinearGradient id="phoneBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2B363A" />
            <Stop offset="50%" stopColor="#151E22" />
            <Stop offset="100%" stopColor="#2A383D" />
          </LinearGradient>

          {/* Phone Header Bar Gradient */}
          <LinearGradient id="appBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0B4E4A" />
            <Stop offset="50%" stopColor={Colors.primary} />
            <Stop offset="100%" stopColor="#10857D" />
          </LinearGradient>

          {/* Phone Screen Gradient (Map) */}
          <LinearGradient id="mapBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#F5F8F6" />
            <Stop offset="100%" stopColor="#ECF2EE" />
          </LinearGradient>

          {/* Floating Card Shadow Filter / Depth */}
          <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F8FAF8" />
          </LinearGradient>
        </Defs>

        {/* --- Soft Ambient Circular / Arched Aura Backdrop --- */}
        <Circle cx="170" cy="140" r="125" fill="url(#auraGrad)" />

        {/* --- Left Laurel Leaf Branch --- */}
        <G id="leftLaurel">
          {/* Main Stem */}
          <Path
            d="M 64 240 C 50 180, 52 110, 80 65"
            stroke="url(#leafGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Leaves climbing upwards */}
          {/* Leaf 1 (bottom) */}
          <Path d="M 62 225 C 45 220, 44 205, 58 212 C 60 216, 61 220, 62 225 Z" fill="url(#leafGrad)" />
          <Path d="M 60 215 C 68 205, 75 210, 61 216 Z" fill="url(#leafGrad)" />
          {/* Leaf 2 */}
          <Path d="M 57 195 C 40 190, 39 175, 53 182 C 55 186, 56 190, 57 195 Z" fill="url(#leafGrad)" />
          <Path d="M 55 185 C 64 175, 72 180, 56 186 Z" fill="url(#leafGrad)" />
          {/* Leaf 3 */}
          <Path d="M 53 162 C 36 155, 36 140, 50 148 C 51 153, 52 158, 53 162 Z" fill="url(#leafGrad)" />
          <Path d="M 52 152 C 62 142, 69 148, 54 153 Z" fill="url(#leafGrad)" />
          {/* Leaf 4 */}
          <Path d="M 54 128 C 38 120, 40 105, 53 113 C 54 118, 54 123, 54 128 Z" fill="url(#leafGrad)" />
          <Path d="M 54 118 C 65 108, 73 115, 56 120 Z" fill="url(#leafGrad)" />
          {/* Leaf 5 */}
          <Path d="M 59 95 C 46 84, 52 70, 61 80 C 60 85, 60 90, 59 95 Z" fill="url(#leafGrad)" />
          <Path d="M 62 86 C 73 78, 80 85, 65 89 Z" fill="url(#leafGrad)" />
          {/* Tip Leaf */}
          <Path d="M 80 65 C 75 52, 86 50, 84 62 Z" fill="url(#leafGrad)" />
        </G>

        {/* --- Right Laurel Leaf Branch (Symmetrical) --- */}
        <G id="rightLaurel">
          {/* Main Stem */}
          <Path
            d="M 276 240 C 290 180, 288 110, 260 65"
            stroke="url(#leafGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Leaf 1 (bottom) */}
          <Path d="M 278 225 C 295 220, 296 205, 282 212 C 280 216, 279 220, 278 225 Z" fill="url(#leafGrad)" />
          <Path d="M 280 215 C 272 205, 265 210, 279 216 Z" fill="url(#leafGrad)" />
          {/* Leaf 2 */}
          <Path d="M 283 195 C 300 190, 301 175, 287 182 C 285 186, 284 190, 283 195 Z" fill="url(#leafGrad)" />
          <Path d="M 285 185 C 276 175, 268 180, 284 186 Z" fill="url(#leafGrad)" />
          {/* Leaf 3 */}
          <Path d="M 287 162 C 304 155, 304 140, 290 148 C 289 153, 288 158, 287 162 Z" fill="url(#leafGrad)" />
          <Path d="M 288 152 C 278 142, 271 148, 286 153 Z" fill="url(#leafGrad)" />
          {/* Leaf 4 */}
          <Path d="M 286 128 C 302 120, 300 105, 287 113 C 286 118, 286 123, 286 128 Z" fill="url(#leafGrad)" />
          <Path d="M 286 118 C 275 108, 267 115, 284 120 Z" fill="url(#leafGrad)" />
          {/* Leaf 5 */}
          <Path d="M 281 95 C 294 84, 288 70, 279 80 C 280 85, 280 90, 281 95 Z" fill="url(#leafGrad)" />
          <Path d="M 278 86 C 267 78, 260 85, 275 89 Z" fill="url(#leafGrad)" />
          {/* Tip Leaf */}
          <Path d="M 260 65 C 265 52, 254 50, 256 62 Z" fill="url(#leafGrad)" />
        </G>

        {/* --- Phone Mockup Chassis --- */}
        <G id="phoneFrame">
          {/* Phone Outer Shadow */}
          <Rect
            x="88"
            y="38"
            width="164"
            height="236"
            rx="28"
            fill="#0F241C"
            opacity="0.12"
          />

          {/* Outer Bezel */}
          <Rect
            x="90"
            y="36"
            width="160"
            height="230"
            rx="26"
            fill="url(#phoneBorderGrad)"
          />

          {/* Inner Screen Border Accent */}
          <Rect
            x="94"
            y="40"
            width="152"
            height="222"
            rx="22"
            fill="#091210"
          />

          {/* Phone Glass Display */}
          <Rect
            x="96"
            y="42"
            width="148"
            height="218"
            rx="20"
            fill="url(#mapBgGrad)"
          />

          {/* --- Top Notch / Dynamic Island --- */}
          <Rect x="150" y="47" width="40" height="9" rx="4.5" fill="#000000" />
          <Circle cx="156" cy="51.5" r="2.5" fill="#1C2B27" />

          {/* ======================================================== */}
          {/* SLIDE 0: MASJIDS & MAP (matches Screen 2 in image)       */}
          {/* ======================================================== */}
          {slideIndex === 0 && (
            <G id="screenContentSlide1">
              {/* App Top Bar */}
              <Rect x="96" y="58" width="148" height="34" fill="url(#appBarGrad)" />
              {/* Left Back Arrow icon */}
              <Path
                d="M 108 75 L 104 79 L 108 83"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Screen Title */}
              <Rect x="114" y="75" width="46" height="8" rx="4" fill="#FFFFFF" opacity="0.9" />
              {/* Right Search Icon */}
              <Circle cx="230" cy="78" r="4" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
              <Path d="M 233 81 L 236 84" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

              {/* Sub Search Pill */}
              <Rect x="104" y="98" width="132" height="15" rx="7.5" fill="#FFFFFF" />
              <Circle cx="113" cy="105.5" r="3" stroke="#9EACA2" strokeWidth="1" fill="none" />
              <Rect x="120" y="103.5" width="55" height="4" rx="2" fill="#CAD6CE" />

              {/* Map Road Grid Lines */}
              <Path
                d="M 96 140 L 244 140 M 96 180 L 244 180 M 145 92 L 145 220 M 195 92 L 195 220 M 110 115 L 230 195"
                stroke="#DCE5DF"
                strokeWidth="2"
              />
              <Path
                d="M 120 160 C 145 155, 175 168, 210 150"
                stroke="#D1DFD6"
                strokeWidth="3.5"
                fill="none"
              />

              {/* Distant Masjid Pins (Green Dots) */}
              <Circle cx="120" cy="128" r="4.5" fill="#2ECC71" />
              <Circle cx="120" cy="128" r="2" fill="#FFFFFF" />

              <Circle cx="218" cy="130" r="4.5" fill="#2ECC71" />
              <Circle cx="218" cy="130" r="2" fill="#FFFFFF" />

              <Circle cx="210" cy="175" r="4" fill="#1ABC9C" />
              <Circle cx="210" cy="175" r="1.5" fill="#FFFFFF" />

              <Circle cx="132" cy="172" r="4" fill="#1ABC9C" />
              <Circle cx="132" cy="172" r="1.5" fill="#FFFFFF" />

              {/* Prominent Active Center Map Pin (Green Teardrop) */}
              <G id="centerMapPin">
                {/* Ping ripple effect */}
                <Circle cx="170" cy="150" r="12" fill={Colors.primaryLight} opacity="0.25" />
                <Circle cx="170" cy="150" r="7" fill={Colors.primary} opacity="0.35" />
                {/* Teardrop Pin */}
                <Path
                  d="M 170 138 C 164 138, 160 142, 160 147 C 160 154, 170 162, 170 162 C 170 162, 180 154, 180 147 C 180 142, 176 138, 170 138 Z"
                  fill="#0D7377"
                />
                {/* White Mosque Icon Inside Pin */}
                <Circle cx="170" cy="146" r="3.5" fill="#FFFFFF" />
                <Path d="M 168 147 L 170 144 L 172 147 Z" fill="#0D7377" />
              </G>

              {/* Floating Bottom Masjid Preview Card */}
              <Rect
                x="103"
                y="190"
                width="134"
                height="48"
                rx="10"
                fill="url(#cardGrad)"
              />
              <Rect
                x="103"
                y="190"
                width="134"
                height="48"
                rx="10"
                stroke="#E2EDE6"
                strokeWidth="1"
                fill="none"
              />

              {/* Green Icon Box */}
              <Rect x="110" y="198" width="30" height="32" rx="7" fill="#0D7377" />
              {/* Mosque Minaret graphic inside green icon box */}
              <Path
                d="M 125 204 C 122 206, 122 210, 122 216 L 128 216 C 128 210, 128 206, 125 204 Z"
                fill="#FFFFFF"
              />
              <Rect x="123" y="217" width="4" height="6" fill="#FFFFFF" />

              {/* Masjid Details Lines */}
              <Rect x="146" y="201" width="60" height="6" rx="3" fill="#1A2E1A" />
              <Rect x="146" y="210" width="42" height="4" rx="2" fill="#758B79" />
              <Rect x="146" y="217" width="52" height="4" rx="2" fill="#38A169" />

              {/* Tiny Right Location Badge */}
              <Circle cx="225" cy="202" r="5" fill="#E8F4EC" />
              <Circle cx="225" cy="202" r="2.5" fill="#0D7377" />
            </G>
          )}

          {/* ======================================================== */}
          {/* SLIDE 1: NOBLE QURAN MUSHAF                               */}
          {/* ======================================================== */}
          {slideIndex === 1 && (
            <G id="screenContentSlide2">
              {/* App Top Bar */}
              <Rect x="96" y="58" width="148" height="34" fill="url(#appBarGrad)" />
              <Path
                d="M 108 75 L 104 79 L 108 83"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Rect x="115" y="75" width="50" height="8" rx="4" fill="#FFFFFF" opacity="0.9" />

              {/* Mushaf Page Frame */}
              <Rect x="102" y="98" width="136" height="116" rx="6" fill="#FDFBF7" stroke="#E6DECE" strokeWidth="1" />

              {/* Surah Ornamental Header Banner */}
              <Rect x="108" y="104" width="124" height="20" rx="4" fill="#0D7377" />
              <Rect x="110" y="106" width="120" height="16" rx="3" stroke="#D4A843" strokeWidth="1" fill="none" />
              <Circle cx="170" cy="114" r="5" fill="#D4A843" />
              <Circle cx="170" cy="114" r="3" fill="#0D7377" />

              {/* Bismillah line */}
              <Rect x="135" y="128" width="70" height="6" rx="3" fill="#095456" />

              {/* Ayah text lines with Arabic ornamental end markers */}
              <Rect x="112" y="140" width="102" height="4.5" rx="2" fill="#2D3748" />
              <Circle cx="220" cy="142" r="3" stroke="#D4A843" strokeWidth="1" fill="#FFF" />

              <Rect x="112" y="150" width="116" height="4.5" rx="2" fill="#2D3748" />
              <Rect x="112" y="160" width="90" height="4.5" rx="2" fill="#2D3748" />
              <Circle cx="208" cy="162" r="3" stroke="#D4A843" strokeWidth="1" fill="#FFF" />

              <Rect x="112" y="170" width="116" height="4.5" rx="2" fill="#2D3748" />
              <Rect x="112" y="180" width="75" height="4.5" rx="2" fill="#2D3748" />
              <Circle cx="193" cy="182" r="3" stroke="#D4A843" strokeWidth="1" fill="#FFF" />

              {/* Bottom Audio Player Bar */}
              <Rect x="102" y="218" width="136" height="26" rx="8" fill="#FFFFFF" stroke="#E2E8DA" strokeWidth="1" />
              <Circle cx="118" cy="231" r="7" fill="#0D7377" />
              <Path d="M 117 228 L 121 231 L 117 234 Z" fill="#FFFFFF" />
              <Rect x="132" y="228" width="60" height="4" rx="2" fill="#1A2E1A" />
              <Rect x="132" y="234" width="40" height="3" rx="1.5" fill="#8A998A" />
            </G>
          )}

          {/* ======================================================== */}
          {/* SLIDE 2: PRAYER TIMETABLE & ALARMS                        */}
          {/* ======================================================== */}
          {slideIndex === 2 && (
            <G id="screenContentSlide3">
              {/* App Top Bar */}
              <Rect x="96" y="58" width="148" height="34" fill="url(#appBarGrad)" />
              <Rect x="115" y="75" width="55" height="8" rx="4" fill="#FFFFFF" opacity="0.9" />

              {/* Active Prayer Card (Hero) */}
              <Rect x="103" y="98" width="134" height="46" rx="8" fill="#0D7377" />
              <Circle cx="120" cy="121" r="10" fill="#14A3A8" />
              {/* Sun/clock icon */}
              <Circle cx="120" cy="121" r="5" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
              <Path d="M 120 118 L 120 121 L 122 122" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              {/* Next Prayer: Asr in 35m */}
              <Rect x="136" y="110" width="45" height="6" rx="3" fill="#FFFFFF" />
              <Rect x="136" y="120" width="70" height="10" rx="3" fill="#E8C97A" />

              {/* Timetable Rows */}
              {/* Fajr */}
              <Rect x="103" y="148" width="134" height="17" rx="4" fill="#FFFFFF" />
              <Rect x="110" y="154" width="28" height="5" rx="2" fill="#4A5568" />
              <Rect x="175" y="154" width="30" height="5" rx="2" fill="#1A2E1A" />
              <Circle cx="225" cy="156.5" r="3.5" fill="#E2E8DA" />

              {/* Dhuhr */}
              <Rect x="103" y="167" width="134" height="17" rx="4" fill="#FFFFFF" />
              <Rect x="110" y="173" width="30" height="5" rx="2" fill="#4A5568" />
              <Rect x="175" y="173" width="30" height="5" rx="2" fill="#1A2E1A" />
              <Circle cx="225" cy="175.5" r="3.5" fill="#E2E8DA" />

              {/* Asr (Active Highlight) */}
              <Rect x="103" y="186" width="134" height="17" rx="4" fill="#F0F9F6" stroke="#0D7377" strokeWidth="1" />
              <Rect x="110" y="192" width="24" height="5" rx="2" fill="#0D7377" />
              <Rect x="175" y="192" width="30" height="5" rx="2" fill="#0D7377" />
              <Circle cx="225" cy="194.5" r="3.5" fill="#0D7377" />

              {/* Maghrib */}
              <Rect x="103" y="205" width="134" height="17" rx="4" fill="#FFFFFF" />
              <Rect x="110" y="211" width="36" height="5" rx="2" fill="#4A5568" />
              <Rect x="175" y="211" width="30" height="5" rx="2" fill="#1A2E1A" />
              <Circle cx="225" cy="213.5" r="3.5" fill="#E2E8DA" />

              {/* Isha */}
              <Rect x="103" y="224" width="134" height="17" rx="4" fill="#FFFFFF" />
              <Rect x="110" y="230" width="26" height="5" rx="2" fill="#4A5568" />
              <Rect x="175" y="230" width="30" height="5" rx="2" fill="#1A2E1A" />
              <Circle cx="225" cy="232.5" r="3.5" fill="#E2E8DA" />
            </G>
          )}

          {/* Bottom Home Indicator Bar on Phone */}
          <Rect x="145" y="254" width="50" height="3" rx="1.5" fill="#3D4B48" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

