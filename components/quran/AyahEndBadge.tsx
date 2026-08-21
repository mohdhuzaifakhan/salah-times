import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface AyahEndBadgeProps {
  number: number;
  waqfMark?: string;
  size?: number;
  color?: string;
}

export const AyahEndBadge: React.FC<AyahEndBadgeProps> = ({
  number,
  waqfMark,
  size = 32,
  color = '#4E5D8C',
}) => {
  return (
    <View style={styles.container}>
      {waqfMark ? (
        <Text style={[styles.waqfText, { color: '#C0392B' }]}>{waqfMark}</Text>
      ) : null}
      <View style={[styles.badgeWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 36 36">
          {/* 8-pointed scalloped star / Islamic rosette ornament */}
          <Path
            d="M18 2 L22 6 L27 4 L28 9 L33 11 L31 16 L35 20 L31 24 L33 29 L28 31 L27 36 L22 34 L18 38 L14 34 L9 36 L8 31 L3 29 L5 24 L1 20 L5 16 L3 11 L8 9 L9 4 L14 6 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
          />
        </Svg>
        <Text style={[styles.numberText, { color, fontSize: size * 0.38 }]}>
          {number}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  waqfText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: -2,
  },
  badgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    position: 'absolute',
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
});

export default AyahEndBadge;
