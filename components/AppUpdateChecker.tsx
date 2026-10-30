import React, { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  fetchAppUpdateConfig,
  subscribeToAppUpdate,
  compareVersions,
  CURRENT_VERSION,
  AppUpdateConfig,
  notifyUserOfUpdate,
  SKIPPED_VERSION_KEY,
} from "@/lib/updates";
import AppUpdateModal from "./AppUpdateModal";

export default function AppUpdateChecker() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<AppUpdateConfig | null>(null);

  // Process a fresh update config (from initial load, onSnapshot, or app resume)
  const processUpdateConfig = useCallback(async (config: AppUpdateConfig) => {
    try {
      if (!config || !config.enabled) {
        setModalVisible(false);
        return;
      }

      setUpdateConfig(config);

      // 1. Compare current version with min required version -> FORCED UPDATE
      const forcedCompare = compareVersions(CURRENT_VERSION, config.minVersion);
      if (forcedCompare < 0) {
        setIsForced(true);
        setModalVisible(true);
        if (config.notifyUsers !== false) {
          void notifyUserOfUpdate(config);
        }
        return;
      }

      // 2. Compare current version with latest release version -> OPTIONAL UPDATE
      const optionalCompare = compareVersions(CURRENT_VERSION, config.latestVersion);
      if (optionalCompare < 0) {
        setIsForced(false);

        // Check if user has previously dismissed/skipped this exact version
        const skippedVersion = await AsyncStorage.getItem(SKIPPED_VERSION_KEY);
        if (skippedVersion !== config.latestVersion) {
          setModalVisible(true);
        }

        // Notify user via status bar push notification if enabled
        if (config.notifyUsers !== false) {
          void notifyUserOfUpdate(config);
        }
      } else {
        // App is up to date or ahead of release
        setModalVisible(false);
      }
    } catch (err) {
      console.error("[Updates] Error processing update config:", err);
    }
  }, []);

  useEffect(() => {
    // 1. Real-time Firestore subscription (immediate notification when Admin updates release in Firestore)
    const unsubscribeSnapshot = subscribeToAppUpdate((config) => {
      void processUpdateConfig(config);
    });

    // 2. Fetch directly from server when app returns to foreground
    const subscriptionAppState = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        void fetchAppUpdateConfig(true).then((cfg) => {
          void processUpdateConfig(cfg);
        });
      }
    });

    // 3. User taps on update push notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === "app_update") {
        setModalVisible(true);
      }
    });

    return () => {
      unsubscribeSnapshot();
      subscriptionAppState.remove();
      responseListener.remove();
    };
  }, [processUpdateConfig]);

  const handleCloseModal = async () => {
    if (updateConfig && !isForced) {
      try {
        // Save that user tapped 'Later' for this version
        await AsyncStorage.setItem(SKIPPED_VERSION_KEY, updateConfig.latestVersion);
      } catch (err) {
        console.error("[Updates] Failed to save skipped version to AsyncStorage:", err);
      }
    }
    setModalVisible(false);
  };

  const handleUpdatePress = async () => {
    if (updateConfig && !isForced) {
      try {
        await AsyncStorage.setItem(SKIPPED_VERSION_KEY, updateConfig.latestVersion);
      } catch (err) {
        console.error("[Updates] Failed to save update version to AsyncStorage:", err);
      }
    }
    setModalVisible(false);
  };

  if (!updateConfig) return null;

  return (
    <AppUpdateModal
      visible={modalVisible}
      config={updateConfig}
      isForced={isForced}
      onClose={handleCloseModal}
      onUpdate={handleUpdatePress}
    />
  );
}
