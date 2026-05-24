import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, DimensionValue } from "react-native";
import Colors from "@/constants/colors";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ----------------------------------------------------
// Specific Screen Skeleton Layouts
// ----------------------------------------------------

export const ExploreSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Skeleton width={160} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width={240} height={28} borderRadius={6} />
      </View>

      {/* Search Input Skeleton */}
      <View style={styles.searchBar}>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>

      {/* Primary Card Skeleton */}
      <View style={styles.cardContainer}>
        <View style={styles.primaryCard}>
          <View style={styles.row}>
            <Skeleton width={40} height={40} borderRadius={12} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width={120} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width={180} height={18} borderRadius={6} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeRow}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <View key={idx} style={{ alignItems: "center" }}>
                <Skeleton width={32} height={10} borderRadius={2} style={{ marginBottom: 6 }} />
                <Skeleton width={48} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Explore Masjids Header */}
      <View style={styles.sectionHeader}>
        <Skeleton width={140} height={18} borderRadius={4} />
      </View>

      {/* List Card Skeletons */}
      <View style={styles.cardContainer}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={idx} style={styles.listCard}>
            <View style={styles.row}>
              <Skeleton width={40} height={40} borderRadius={12} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width={160} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={100} height={12} borderRadius={3} />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.timeRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={{ alignItems: "center" }}>
                  <Skeleton width={16} height={10} borderRadius={2} style={{ marginBottom: 6 }} />
                  <Skeleton width={40} height={12} borderRadius={3} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const HadithSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Title */}
      <View style={styles.header}>
        <Skeleton width={180} height={28} borderRadius={6} />
      </View>

      {/* Daily Card */}
      <View style={styles.cardContainer}>
        <View style={styles.dailyCard}>
          <View style={[styles.row, { justifyContent: "space-between", marginBottom: 16 }]}>
            <Skeleton width={120} height={12} borderRadius={4} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
          <Skeleton width="100%" height={14} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="90%" height={14} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={14} borderRadius={3} style={{ marginBottom: 16 }} />
          <Skeleton width={100} height={24} borderRadius={8} style={{ alignSelf: "flex-end" }} />
        </View>
      </View>

      {/* Search Box */}
      <View style={styles.searchBar}>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>

      {/* Hadith Books Cards */}
      <View style={styles.cardContainer}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={idx} style={styles.bookCard}>
            <Skeleton width={48} height={48} borderRadius={12} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="90%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
              <Skeleton width={64} height={14} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const QuranSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={100} height={28} borderRadius={6} />
      </View>

      {/* Search Box */}
      <View style={styles.searchBar}>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>

      {/* Surah List Cards */}
      <View style={styles.cardContainer}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <View key={idx} style={styles.surahCard}>
            <Skeleton width={40} height={40} borderRadius={10} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width={80} height={12} borderRadius={3} />
            </View>
            <View style={{ alignItems: "flex-end", marginRight: 12 }}>
              <Skeleton width={60} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width={40} height={10} borderRadius={2} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CalendarSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={200} height={28} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={styles.todayCard}>
          <Skeleton width={180} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width={120} height={12} borderRadius={3} />
        </View>
      </View>

      {/* Calendar Grid Placeholder */}
      <View style={styles.calendarGrid}>
        <View style={[styles.row, { justifyContent: "space-between", marginBottom: 16 }]}>
          <Skeleton width={100} height={16} borderRadius={4} />
          <Skeleton width={100} height={16} borderRadius={4} />
        </View>
        <Skeleton width="100%" height={240} borderRadius={16} />
      </View>
    </View>
  );
};

export const MasjidDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.row, { justifyContent: "space-between", paddingVertical: 12, marginBottom: 20 }]}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <View style={styles.row}>
          <Skeleton width={40} height={40} borderRadius={12} style={{ marginRight: 8 }} />
          <Skeleton width={40} height={40} borderRadius={12} />
        </View>
      </View>

      {/* Hero Section */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Skeleton width={72} height={72} borderRadius={22} style={{ marginBottom: 16 }} />
        <Skeleton width={220} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={180} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width={80} height={22} borderRadius={8} />
      </View>

      {/* Timetable Card Skeleton */}
      <View style={styles.sectionHeader}>
        <Skeleton width={140} height={18} borderRadius={4} />
      </View>

      <View style={styles.primaryCard}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <View key={idx} style={[styles.row, { justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: idx < 4 ? 1 : 0, borderBottomColor: Colors.borderLight }]}>
            <View style={styles.row}>
              <Skeleton width={20} height={20} borderRadius={4} style={{ marginRight: 12 }} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
            <Skeleton width={60} height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    marginVertical: 12,
  },
  cardContainer: {
    marginBottom: 16,
  },
  primaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  surahCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  dailyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  todayCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  calendarGrid: {
    marginTop: 16,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeleton: {
    backgroundColor: Colors.surfaceAlt,
  },
});
