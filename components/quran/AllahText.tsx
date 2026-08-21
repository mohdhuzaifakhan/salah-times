import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface AllahTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  highlightColor?: string;
}

export const AllahText: React.FC<AllahTextProps> = ({
  text,
  style,
  highlightColor = '#C0392B',
}) => {
  if (!text) return null;

  // Regex targeting variations of Allah in Uthmani / IndoPak scripts
  const allahRegex = /(ٱ?اللَّهِ|ٱ?اللَّهُ|ٱ?اللَّهَ|اللَّهِ|اللَّهُ|اللَّهَ|اللّه|الله)/g;
  const parts = text.split(allahRegex);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (allahRegex.test(part)) {
          allahRegex.lastIndex = 0;
          return (
            <Text key={index} style={{ color: highlightColor }}>
              {part}
            </Text>
          );
        }
        allahRegex.lastIndex = 0;
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export default AllahText;
