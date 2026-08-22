import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  BackHandler,
  SafeAreaView,
  Text,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export function ImageViewerModal({ visible, imageUrl, onClose, title }: ImageViewerModalProps) {
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    if (visible) {
      setZoomScale(1);
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        onClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  if (!imageUrl) return null;

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Header */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              {title ? (
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                <Text style={styles.hintText}>Full Image View</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Zoomable Image View */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={0.5}
          maximumZoomScale={5}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent={true}
          bouncesZoom={true}
        >
          <View style={[styles.imageWrapper, { transform: [{ scale: zoomScale }] }]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
        </ScrollView>

        {/* Bottom Zoom Controls */}
        <SafeAreaView style={styles.bottomSafeArea}>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut} activeOpacity={0.7}>
              <Ionicons name="remove-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.controlBtnText}>Zoom Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleResetZoom} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.controlBtnText}>{Math.round(zoomScale * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.controlBtnText}>Zoom In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  headerSafeArea: {
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight || 20 : 0,
  },
  titleWrap: {
    flex: 1,
    marginRight: 16,
  },
  titleText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#ffffff",
  },
  hintText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
    minHeight: 320,
  },
  bottomSafeArea: {
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#ffffff",
  },
});
