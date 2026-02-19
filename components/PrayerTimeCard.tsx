import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { PRAYER_NAMES, PRAYER_ORDER, Timetable } from "@/lib/types";

const PRAYER_ICONS: Record<string, string> = {
  fajr: "sunny-outline",
  dhuhr: "sunny",
  asr: "partly-sunny",
  maghrib: "cloudy-night",
  isha: "moon",
  jummah: "people",
};

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function PrayerTimeRow({
  prayer,
  time,
  isNext,
}: {
  prayer: keyof Timetable;
  time: string;
  isNext?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        isNext && styles.activeRow,
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconCircle, isNext && styles.activeIconCircle]}>
          <Ionicons
            name={PRAYER_ICONS[prayer] as any}
            size={18}
            color={isNext ? "#fff" : Colors.primary}
          />
        </View>
        <View>
          <Text style={[styles.prayerName, isNext && styles.activeText]}>
            {PRAYER_NAMES[prayer]}
          </Text>
          {prayer === "jummah" && (
            <Text style={styles.prayerSub}>Friday</Text>
          )}
        </View>
      </View>
      <Text style={[styles.prayerTime, isNext && styles.activeTime]}>
        {formatTime(time)}
      </Text>
    </View>
  );
}

export function PrayerTimesCard({ timetable }: { timetable: Timetable }) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dailyPrayers: (keyof Timetable)[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  let nextPrayer: keyof Timetable | null = null;
  for (const prayer of dailyPrayers) {
    const [h, m] = timetable[prayer].split(":");
    const prayerMinutes = parseInt(h, 10) * 60 + parseInt(m, 10);
    if (prayerMinutes > currentMinutes) {
      nextPrayer = prayer;
      break;
    }
  }

  return (
    <View style={styles.card}>
      {PRAYER_ORDER.map((prayer) => (
        <PrayerTimeRow
          key={prayer}
          prayer={prayer}
          time={timetable[prayer]}
          isNext={prayer === nextPrayer}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activeRow: {
    backgroundColor: Colors.primary,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconCircle: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  prayerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  activeText: {
    color: "#fff",
  },
  prayerSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: -2,
  },
  prayerTime: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primaryDark,
  },
  activeTime: {
    color: "#fff",
  },
});
