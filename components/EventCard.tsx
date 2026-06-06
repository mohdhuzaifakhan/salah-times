import React from "react";
import { StyleSheet, Text, View, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { AppEvent } from "@/lib/types";

interface EventCardProps {
  event: AppEvent;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
  onPress?: () => void;
}

export function EventCard({ event, onDelete, isAdmin, onPress }: EventCardProps) {
  const isGlobal = event.masjidId === "global";
  const endDateStr = new Date(event.endDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/event/[id]",
        params: { id: event.id },
      });
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressedCard
      ]}
      onPress={handlePress}
    >
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.cardImage} />
      ) : null}
      
      <View style={styles.cardBody}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, isGlobal ? styles.globalIcon : styles.masjidIcon]}>
              <Ionicons name={isGlobal ? "globe-outline" : "megaphone-outline"} size={20} color="#fff" />
            </View>
            <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          </View>
          {isAdmin && onDelete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </Pressable>
          )}
        </View>

        {event.description ? (
          <Text style={styles.description} numberOfLines={2}>{event.description}</Text>
        ) : null}

        <View style={styles.footer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.footerText}>Expires: {endDateStr}</Text>
          </View>
          {event.link && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <Ionicons name="link-outline" size={14} color={Colors.primary} />
              <Text style={[styles.footerText, { color: Colors.primary, fontFamily: "Poppins_600SemiBold" }]}>Link Available</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  pressedCard: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  cardImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  cardBody: {
    padding: 16,
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
