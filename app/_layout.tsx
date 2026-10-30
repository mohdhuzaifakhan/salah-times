import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import CustomAlertModal from "@/components/CustomAlertModal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppUpdateChecker from "@/components/AppUpdateChecker";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/auth-context";
import { QuranProvider } from "@/lib/quran/context";
import { HadithProvider } from "@/lib/hadith/context";
import { CalendarProvider } from "@/lib/calendar/context";
import { LanguageProvider } from "@/lib/language-context";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  Amiri_400Regular,
  Amiri_700Bold,
} from "@expo-google-fonts/amiri";
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from "@expo-google-fonts/scheherazade-new";
import {
  Lateef_400Regular,
} from "@expo-google-fonts/lateef";
import Colors from "@/constants/colors";
import { initializeAds } from "@/lib/ads";
import { refreshPrimaryMasjidNotifications, setupPrayerAlarmListeners } from "@/lib/notifications";
import { PrimaryMasjidProvider } from "@/lib/primary-masjid-context";
import { PrayerAlarmModal } from "@/components/PrayerAlarmModal";
import { LocationProvider } from "@/lib/location-context";

void SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-times" options={{ headerShown: false }} />
      <Stack.Screen name="qibla" options={{ headerShown: false }} />
      <Stack.Screen name="nearby-masjids" options={{ headerShown: false }} />
      <Stack.Screen name="tasbih" options={{ headerShown: false }} />
      <Stack.Screen name="duas" options={{ headerShown: false }} />
      <Stack.Screen name="fasting" options={{ headerShown: false }} />
      <Stack.Screen name="news" options={{ headerShown: false }} />
      <Stack.Screen name="community" options={{ headerShown: false }} />
      <Stack.Screen
        name="masjid/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-timetable"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-masjid-details"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="report-masjid-time"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="global-feedback"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="masjid-feedback"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-notifications"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manage-global-feedback"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manage-events"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manage-news"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
    Lateef_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {});
      void initializeAds();
      void refreshPrimaryMasjidNotifications();
      const unsubscribe = setupPrayerAlarmListeners();
      return () => unsubscribe();
    }
  }, [fontsLoaded, fontError]);

  // Safety fallback: if fonts take more than 3 seconds or fail, hide splash screen anyway
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <AuthProvider>
        <LanguageProvider>
          <LocationProvider>
            <PrimaryMasjidProvider>
              <QuranProvider>
                <HadithProvider>
                  <CalendarProvider>
                    <GestureHandlerRootView style={styles.container}>
                      <View style={styles.content}>
                        <RootLayoutNav />
                        <CustomAlertModal />
                        <PrayerAlarmModal />
                        <AppUpdateChecker />
                      </View>
                    </GestureHandlerRootView>
                  </CalendarProvider>
                </HadithProvider>
              </QuranProvider>
            </PrimaryMasjidProvider>
          </LocationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
