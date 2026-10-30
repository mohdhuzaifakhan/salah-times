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
  Ellipse,
} from "react-native-svg";
import { View, StyleSheet, Dimensions } from "react-native";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MosqueGraphicProps {
  width?: number | string;
  height?: number;
}

export const MosqueGraphic: React.FC<MosqueGraphicProps> = ({
  width,
  height = 230,
}) => {
  const graphicWidth =
    typeof width === "number"
      ? width
      : Math.min(SCREEN_WIDTH - 48, 320);

  return (
    <View style={[styles.container, { width: "100%", height }]}>
      <Svg
        width={graphicWidth}
        height={height}
        viewBox="0 0 320 230"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          {/* Main Dome Gradient */}
          <LinearGradient id="mainDomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#14A3A8" />
            <Stop offset="45%" stopColor={Colors.primary} />
            <Stop offset="100%" stopColor="#095456" />
          </LinearGradient>

          {/* Left / Secondary Dome Gradient */}
          <LinearGradient id="sideDomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#14A3A8" />
            <Stop offset="60%" stopColor={Colors.primary} />
            <Stop offset="100%" stopColor="#095456" />
          </LinearGradient>

          {/* Facade Wall Gradient */}
          <LinearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#EBF2EA" />
          </LinearGradient>

          {/* Arch Depth Gradient */}
          <LinearGradient id="archDepthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D4E4D8" />
            <Stop offset="100%" stopColor="#ABC4B2" />
          </LinearGradient>

          {/* Door Inner Gradient */}
          <LinearGradient id="doorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0B4D44" />
            <Stop offset="100%" stopColor="#062F29" />
          </LinearGradient>

          {/* Soft background aura/clouds */}
          <RadialGradient id="cloudGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#E4F2E9" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#EDF7F1" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FAFBF6" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* --- Background Ambient Clouds / Misty Aura --- */}
        <Circle cx="160" cy="120" r="110" fill="url(#cloudGrad)" />
        <Path
          d="M 50 170 C 40 145, 70 130, 95 140 C 110 120, 140 125, 150 145 C 165 130, 195 130, 205 148 C 220 125, 255 125, 270 150 C 290 140, 310 155, 305 175 C 310 195, 290 205, 270 205 L 50 205 Z"
          fill="#E7F3EC"
          opacity="0.5"
        />

        {/* --- Back Wall Silhouette --- */}
        <Path
          d="M 68 185 L 68 155 L 90 155 L 90 145 L 230 145 L 230 155 L 252 155 L 252 185 Z"
          fill="#DCECE1"
        />

        {/* --- Left Minaret --- */}
        <G id="leftMinaret">
          {/* Base */}
          <Rect x="42" y="160" width="16" height="50" fill="url(#wallGrad)" rx="1" />
          <Rect x="40" y="158" width="20" height="3" fill="#D3E2D6" />

          {/* Lower Balcony */}
          <Path d="M 39 128 L 61 128 L 59 133 L 41 133 Z" fill="#C5D9CA" />
          <Rect x="40" y="125" width="20" height="3" fill="#13695F" rx="1" />
          {/* Middle Shaft */}
          <Rect x="44" y="90" width="12" height="35" fill="url(#wallGrad)" />
          {/* Shadow accent on shaft */}
          <Rect x="52" y="90" width="4" height="35" fill="#D5E4D8" />

          {/* Upper Balcony */}
          <Path d="M 40 88 L 60 88 L 58 92 L 42 92 Z" fill="#C5D9CA" />
          <Rect x="41" y="86" width="18" height="2" fill="#13695F" rx="1" />

          {/* Pavilion with Arched Windows */}
          <Rect x="44" y="66" width="12" height="20" fill="url(#wallGrad)" />
          <Path d="M 47 78 C 47 72, 53 72, 53 78 L 53 84 L 47 84 Z" fill="#145E55" />

          {/* Minaret Dome */}
          <Path
            d="M 43 66 C 43 53, 50 48, 50 44 C 50 48, 57 53, 57 66 Z"
            fill="url(#sideDomeGrad)"
          />
          {/* Crescent Finial */}
          <Path
            d="M 50 44 L 50 35 M 48 37 C 48 34, 52 34, 52 37 C 52 39, 49 40, 48 37 Z"
            stroke="#13695F"
            strokeWidth="1.2"
            fill="none"
          />
        </G>

        {/* --- Right Minaret (Symmetrical) --- */}
        <G id="rightMinaret">
          {/* Base */}
          <Rect x="262" y="160" width="16" height="50" fill="url(#wallGrad)" rx="1" />
          <Rect x="260" y="158" width="20" height="3" fill="#D3E2D6" />

          {/* Lower Balcony */}
          <Path d="M 259 128 L 281 128 L 279 133 L 261 133 Z" fill="#C5D9CA" />
          <Rect x="260" y="125" width="20" height="3" fill="#13695F" rx="1" />
          {/* Middle Shaft */}
          <Rect x="264" y="90" width="12" height="35" fill="url(#wallGrad)" />
          <Rect x="272" y="90" width="4" height="35" fill="#D5E4D8" />

          {/* Upper Balcony */}
          <Path d="M 260 88 L 280 88 L 278 92 L 262 92 Z" fill="#C5D9CA" />
          <Rect x="261" y="86" width="18" height="2" fill="#13695F" rx="1" />

          {/* Pavilion with Arched Windows */}
          <Rect x="264" y="66" width="12" height="20" fill="url(#wallGrad)" />
          <Path d="M 267 78 C 267 72, 273 72, 273 78 L 273 84 L 267 84 Z" fill="#145E55" />

          {/* Minaret Dome */}
          <Path
            d="M 263 66 C 263 53, 270 48, 270 44 C 270 48, 277 53, 277 66 Z"
            fill="url(#sideDomeGrad)"
          />
          {/* Crescent Finial */}
          <Path
            d="M 270 44 L 270 35 M 268 37 C 268 34, 272 34, 272 37 C 272 39, 269 40, 268 37 Z"
            stroke="#13695F"
            strokeWidth="1.2"
            fill="none"
          />
        </G>

        {/* --- Left Flanking Dome --- */}
        <G id="leftSideDome">
          {/* Drum */}
          <Rect x="82" y="140" width="34" height="15" fill="#E2EEE4" />
          {/* Arched windows on drum */}
          <Path d="M 87 148 C 87 143, 91 143, 91 148 L 91 152 L 87 152 Z" fill="#ADC7B4" />
          <Path d="M 95 148 C 95 143, 99 143, 99 148 L 99 152 L 95 152 Z" fill="#ADC7B4" />
          <Path d="M 103 148 C 103 143, 107 143, 107 148 L 107 152 L 103 152 Z" fill="#ADC7B4" />
          {/* Dome */}
          <Path
            d="M 78 140 C 78 116, 99 108, 99 100 C 99 108, 120 116, 120 140 Z"
            fill="url(#sideDomeGrad)"
          />
          {/* Finial with crescent */}
          <Path
            d="M 99 100 L 99 92 M 97 94 C 97 91, 101 91, 101 94 C 101 96, 98 97, 97 94 Z"
            stroke="#13695F"
            strokeWidth="1.2"
            fill="none"
          />
        </G>

        {/* --- Right Flanking Dome --- */}
        <G id="rightSideDome">
          {/* Drum */}
          <Rect x="204" y="140" width="34" height="15" fill="#E2EEE4" />
          {/* Arched windows on drum */}
          <Path d="M 209 148 C 209 143, 213 143, 213 148 L 213 152 L 209 152 Z" fill="#ADC7B4" />
          <Path d="M 217 148 C 217 143, 221 143, 221 148 L 221 152 L 217 152 Z" fill="#ADC7B4" />
          <Path d="M 225 148 C 225 143, 229 143, 229 148 L 229 152 L 225 152 Z" fill="#ADC7B4" />
          {/* Dome */}
          <Path
            d="M 200 140 C 200 116, 221 108, 221 100 C 221 108, 242 116, 242 140 Z"
            fill="url(#sideDomeGrad)"
          />
          {/* Finial with crescent */}
          <Path
            d="M 221 100 L 221 92 M 219 94 C 219 91, 223 91, 223 94 C 223 96, 220 97, 219 94 Z"
            stroke="#13695F"
            strokeWidth="1.2"
            fill="none"
          />
        </G>

        {/* --- Central Mosque Drum --- */}
        <Rect x="122" y="120" width="76" height="25" fill="#EBF3ED" />
        {/* Clerestory arched windows on drum */}
        <Path d="M 128 132 C 128 126, 134 126, 134 132 L 134 140 L 128 140 Z" fill="#A8C4B0" />
        <Path d="M 140 132 C 140 126, 146 126, 146 132 L 146 140 L 140 140 Z" fill="#A8C4B0" />
        <Path d="M 152 132 C 152 126, 158 126, 158 132 L 158 140 L 152 140 Z" fill="#A8C4B0" />
        <Path d="M 164 132 C 164 126, 170 126, 170 132 L 170 140 L 164 140 Z" fill="#A8C4B0" />
        <Path d="M 176 132 C 176 126, 182 126, 182 132 L 182 140 L 176 140 Z" fill="#A8C4B0" />
        <Path d="M 188 132 C 188 126, 194 126, 194 132 L 194 140 L 188 140 Z" fill="#A8C4B0" />

        {/* --- Main Center Dome --- */}
        <G id="centerDome">
          {/* Base cornice ring */}
          <Rect x="118" y="117" width="84" height="4" fill="#C5DCCB" rx="1.5" />

          {/* Central Dome Body */}
          <Path
            d="M 118 118 C 118 78, 160 66, 160 52 C 160 66, 202 78, 202 118 Z"
            fill="url(#mainDomeGrad)"
          />

          {/* Light reflection highlight arc on left edge */}
          <Path
            d="M 124 115 C 124 86, 154 75, 158 58 C 152 75, 130 87, 130 115 Z"
            fill="#FFFFFF"
            opacity="0.32"
          />

          {/* Crescent Finial at Top */}
          <Path
            d="M 160 52 L 160 40 M 157 43 C 157 39, 163 39, 163 43 C 163 46, 159 47, 157 43 Z"
            stroke="#0A4D45"
            strokeWidth="1.6"
            fill="none"
          />
        </G>

        {/* --- Main Facade Wall --- */}
        <G id="facade">
          {/* Main front wall block */}
          <Rect x="68" y="145" width="184" height="65" fill="url(#wallGrad)" />

          {/* Cornice horizontal molding */}
          <Rect x="66" y="145" width="188" height="3" fill="#D3E4D7" />
          <Rect x="68" y="148" width="184" height="2" fill="#E8F1EA" />

          {/* Left arched portal/window on facade */}
          <Path
            d="M 86 172 C 86 160, 102 160, 102 172 L 102 205 L 86 205 Z"
            fill="url(#archDepthGrad)"
          />
          <Path
            d="M 89 175 C 89 165, 99 165, 99 175 L 99 205 L 89 205 Z"
            fill="url(#doorGrad)"
          />

          {/* Intermediate Left Arch */}
          <Path
            d="M 112 172 C 112 160, 126 160, 126 172 L 126 205 L 112 205 Z"
            fill="url(#archDepthGrad)"
          />
          <Path
            d="M 114 175 C 114 165, 124 165, 124 175 L 124 205 L 114 205 Z"
            fill="url(#doorGrad)"
          />

          {/* Grand Central Portal Arch */}
          {/* Outer Arch Molding */}
          <Path
            d="M 136 160 C 136 142, 160 134, 160 134 C 160 134, 184 142, 184 160 L 184 210 L 136 210 Z"
            fill="#D5E5D9"
          />
          {/* Inner Recessed Arch */}
          <Path
            d="M 140 163 C 140 146, 160 138, 160 138 C 160 138, 180 146, 180 163 L 180 210 L 140 210 Z"
            fill="url(#archDepthGrad)"
          />
          {/* Main Center Doorway */}
          <Path
            d="M 144 167 C 144 151, 160 144, 160 144 C 160 144, 176 151, 176 167 L 176 210 L 144 210 Z"
            fill="url(#doorGrad)"
          />
          {/* Door inner arch accent */}
          <Path
            d="M 148 174 C 148 160, 160 154, 160 154 C 160 154, 172 160, 172 174 L 172 210 L 148 210 Z"
            fill="#05201B"
          />

          {/* Intermediate Right Arch */}
          <Path
            d="M 194 172 C 194 160, 208 160, 208 172 L 208 205 L 194 205 Z"
            fill="url(#archDepthGrad)"
          />
          <Path
            d="M 196 175 C 196 165, 206 165, 206 175 L 206 205 L 196 205 Z"
            fill="url(#doorGrad)"
          />

          {/* Right arched portal/window on facade */}
          <Path
            d="M 218 172 C 218 160, 234 160, 234 172 L 234 205 L 218 205 Z"
            fill="url(#archDepthGrad)"
          />
          <Path
            d="M 221 175 C 221 165, 231 165, 231 175 L 231 205 L 221 205 Z"
            fill="url(#doorGrad)"
          />
        </G>

        {/* --- Foreground Steps & Courtyard Base --- */}
        {/* Step 1 */}
        <Rect x="20" y="210" width="280" height="4" fill="#E2EEE4" rx="1" />
        <Rect x="20" y="210" width="280" height="1" fill="#FFFFFF" />
        {/* Step 2 */}
        <Rect x="12" y="214" width="296" height="5" fill="#D3E4D7" rx="1" />
        <Rect x="12" y="214" width="296" height="1" fill="#EBF4EE" />
        {/* Base ground line */}
        <Rect x="0" y="219" width="320" height="11" fill="#F4FAF5" />
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

