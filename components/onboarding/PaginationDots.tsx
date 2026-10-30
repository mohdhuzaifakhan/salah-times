import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Colors from "@/constants/colors";

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
  onDotPress?: (index: number) => void;
}

export const PaginationDots: React.FC<PaginationDotsProps> = ({
  total,
  activeIndex,
  onDotPress,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            disabled={!onDotPress}
            onPress={() => onDotPress?.(index)}
            style={[
              styles.dot,
              isActive ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 18,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  activeDot: {
    width: 22,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 7,
    backgroundColor: "#CBD5E1",
  },
});

