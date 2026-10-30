import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { DEFAULT_AMAL_LIST, getCompletedAmal, toggleAmalItem } from "@/lib/amal";

interface AmalTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdateCount?: (completed: number, total: number) => void;
}

export const AmalTrackerModal: React.FC<AmalTrackerModalProps> = ({
  visible,
  onClose,
  onUpdateCount,
}) => {
  const insets = useSafeAreaInsets();
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadAmal();
    }
  }, [visible]);

  const loadAmal = async () => {
    const ids = await getCompletedAmal();
    setCompletedIds(ids);
    onUpdateCount?.(ids.length, DEFAULT_AMAL_LIST.length);
  };

  const handleToggle = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleAmalItem(id);
    setCompletedIds(updated);
    onUpdateCount?.(updated.length, DEFAULT_AMAL_LIST.length);
  };

  const progress = Math.round((completedIds.length / DEFAULT_AMAL_LIST.length) * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Today's Amal</Text>
              <Text style={styles.subtitle}>Daily Good Deeds & Prayers Tracker</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Completed Today</Text>
              <Text style={styles.progressCount}>
                {completedIds.length} / {DEFAULT_AMAL_LIST.length} ({progress}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {DEFAULT_AMAL_LIST.map((item) => {
              const done = completedIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, done && styles.itemRowDone]}
                  onPress={() => handleToggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                    {done && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.itemTitle, done && styles.itemTitleDone]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#1A2E1A",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F0F4EC",
  },
  progressCard: {
    backgroundColor: "#E8F4EC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.primaryDark,
  },
  progressCount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: Colors.primaryDark,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C6E4D1",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  list: {
    maxHeight: 400,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAF8",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  itemRowDone: {
    backgroundColor: "#EAF4F4",
    borderColor: "#A0D5D6",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkCircleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#1A2E1A",
    flex: 1,
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
    color: "#8A998A",
  },
});

