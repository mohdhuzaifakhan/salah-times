import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AppEvent } from "@/lib/types";

interface EventCardProps {
  event: AppEvent;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export function EventCard({ event, onDelete, isAdmin }: EventCardProps) {
  const isGlobal = event.masjidId === "global";
  const endDateStr = new Date(event.endDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, isGlobal ? styles.globalIcon : styles.masjidIcon]}>
            <Ionicons name={isGlobal ? "globe-outline" : "megaphone-outline"} size={20} color="#fff" />
          </View>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        </View>
        {isAdmin && onDelete && (
          <Pressable onPress={() => onDelete(event.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        )}
      </View>

      {event.description ? (
        <Text style={styles.description}>{event.description}</Text>
      ) : null}

      <View style={styles.footer}>
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.footerText}>Expires: {endDateStr}</Text>
      </View>
    </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  globalIcon: {
    backgroundColor: Colors.primary,
  },
  masjidIcon: {
    backgroundColor: Colors.accent,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
});
