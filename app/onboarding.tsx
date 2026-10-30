import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { PhoneMockupGraphic } from "@/components/onboarding/PhoneMockupGraphic";
import { PaginationDots } from "@/components/onboarding/PaginationDots";
import { setOnboardingCompleted } from "@/lib/onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  slideIndex: number;
  image?: any;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "masjids",
    title: "Accurate Prayer Times\n& Nearby Masjids",
    description:
      "Get verified prayer times, find nearby masjids and access complete Islamic tools.",
    slideIndex: 0,
    image: require("@/assets/images/onboarding-1-circle.png"),
  },
  {
    id: "quran",
    title: "Holy Quran &\nAudio Recitations",
    description:
      "Read, listen, and search the Holy Quran with verse-by-verse recitations and translations.",
    slideIndex: 1,
    image: require("@/assets/images/onboarding-2-circle.png"),
  },
  {
    id: "reminders",
    title: "Timely Prayer Alerts\n& Islamic Calendar",
    description:
      "Never miss a prayer with customizable Azaan reminders and keep track of Islamic events.",
    slideIndex: 2,
    image: require("@/assets/images/onboarding-3-circle.png"),
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleFinishOnboarding = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setOnboardingCompleted();
    router.replace("/(tabs)");
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      await handleFinishOnboarding();
    }
  };

  const handleSkip = async () => {
    await handleFinishOnboarding();
  };

  const onMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
      void Haptics.selectionAsync();
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderSlideItem = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Mockup Graphic Area with Rounded Frame & Ambient Overlay */}
        <View style={styles.graphicArea}>
          {/* Ambient Outer & Inner Glow Halo Rings */}
          <View style={styles.ambientHaloOuter} />
          <View style={styles.ambientHaloInner} />

          {/* Rounded Circular Image Frame */}
          <View style={styles.imageCardContainer}>
            {item.image ? (
              <Image
                source={item.image}
                style={styles.graphicImage}
                resizeMode="contain"
              />
            ) : (
              <PhoneMockupGraphic slideIndex={item.slideIndex} height={250} />
            )}
            {/* Subtle Overlay Sheen */}
            <View style={styles.sheenOverlay} />
          </View>
        </View>

        {/* Text Area */}
        <View style={styles.textArea}>
          <Text style={styles.titleText}>{item.title}</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Top Bar with Skip Button */}
      <View style={styles.topBar}>
        <View style={styles.placeholderBox} />
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={styles.skipButton}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swiper / Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlideItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.flatList}
        />
      </View>

      {/* Bottom Controls Area */}
      <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 24 : 16) + 16 }]}>
        {/* Pagination Dots */}
        <PaginationDots
          total={SLIDES.length}
          activeIndex={currentIndex}
          onDotPress={(idx) => {
            flatListRef.current?.scrollToIndex({ index: idx, animated: true });
            setCurrentIndex(idx);
          }}
        />

        {/* Full-width Rounded Action Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>
            {isLastSlide ? "Get Started" : "Get Started"}
          </Text>
          <View style={styles.arrowIconWrap}>
            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    height: 44,
  },
  placeholderBox: {
    width: 44,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#0D7377",
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  graphicArea: {
    width: "100%",
    height: 290,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  ambientHaloOuter: {
    position: "absolute",
    width: 285,
    height: 285,
    borderRadius: 142.5,
    backgroundColor: "rgba(13, 115, 119, 0.035)",
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.07)",
  },
  ambientHaloInner: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(13, 115, 119, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(13, 115, 119, 0.12)",
  },
  imageCardContainer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#0D7377",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    position: "relative",
  },
  graphicImage: {
    width: "100%",
    height: "100%",
  },
  sheenOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: "rgba(13, 115, 119, 0.16)",
  },
  textArea: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  titleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    lineHeight: 35,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  descriptionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14.5,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 16 : 28,
    alignItems: "center",
  },
  actionButton: {
    width: "100%",
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16.5,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  arrowIconWrap: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

