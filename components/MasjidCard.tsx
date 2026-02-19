import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { Masjid } from "@/lib/types";
import * as Haptics from "expo-haptics";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getNextPrayer(timetable: Masjid["timetable"]): { name: string; time: string } | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers = [
    { name: "Fajr", time: timetable.fajr },
    { name: "Dhuhr", time: timetable.dhuhr },
    { name: "Asr", time: timetable.asr },
    { name: "Maghrib", time: timetable.maghrib },
    { name: "Isha", time: timetable.isha },
  ];
  for (const p of prayers) {
    const [h, m] = p.time.split(":");
    if (parseInt(h, 10) * 60 + parseInt(m, 10) > currentMinutes) {
      return p;
    }
  }
  return prayers[0];
}

export function MasjidCard({
  masjid,
  onPress,
}: {
  masjid: Masjid;
  onPress: () => void;
}) {
  const next = getNextPrayer(masjid.timetable);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="moon" size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {masjid.name}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.city} numberOfLines={1}>
              {masjid.city}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
      {next && (
        <View style={styles.nextPrayer}>
          <Text style={styles.nextLabel}>Next</Text>
          <Text style={styles.nextName}>{next.name}</Text>
          <Text style={styles.nextTime}>{formatTime(next.time)}</Text>
        </View>
      )}
      <View style={styles.timesRow}>
        {[
          { label: "F", time: masjid.timetable.fajr },
          { label: "D", time: masjid.timetable.dhuhr },
          { label: "A", time: masjid.timetable.asr },
          { label: "M", time: masjid.timetable.maghrib },
          { label: "I", time: masjid.timetable.isha },
        ].map((item) => (
          <View key={item.label} style={styles.timeItem}>
            <Text style={styles.timeLabel}>{item.label}</Text>
            <Text style={styles.timeValue}>{formatTime(item.time)}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  city: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  nextPrayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.overlay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  nextLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nextName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  nextTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primaryDark,
    marginLeft: "auto",
  },
  timesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeItem: {
    alignItems: "center",
    gap: 2,
  },
  timeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  timeValue: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
