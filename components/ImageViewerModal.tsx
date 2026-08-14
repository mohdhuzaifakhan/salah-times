import React, { useEffect } from "react";
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
  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        onClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  if (!imageUrl) return null;

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
                <Text style={styles.hintText}>Pinch to zoom • Tap outside to close</Text>
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

        {/* Zoomable Image Container */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={5}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent={true}
          bouncesZoom={true}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.imageTouchable}
            onPress={onClose}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Hint */}
        <SafeAreaView style={styles.bottomSafeArea}>
          <View style={styles.bottomHintContainer}>
            <Ionicons name="search" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.bottomHintText}>Pinch to zoom in / out</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  bottomSafeArea: {
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  bottomHintText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
});
