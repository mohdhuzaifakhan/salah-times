import React, { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchAppUpdateConfig, compareVersions, CURRENT_VERSION, AppUpdateConfig } from "@/lib/updates";
import AppUpdateModal from "./AppUpdateModal";

const SKIPPED_VERSION_KEY = "skipped_update_version";

export default function AppUpdateChecker() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<AppUpdateConfig | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      const config = await fetchAppUpdateConfig();

      if (!config.enabled) {
        console.log("[Updates] Update checks disabled by Firestore configuration.");
        return;
      }

      // Compare current version with min required version
      const forcedCompare = compareVersions(CURRENT_VERSION, config.minVersion);
      if (forcedCompare < 0) {
        // Current version is less than min support version -> FORCE UPDATE
        setUpdateConfig(config);
        setIsForced(true);
        setModalVisible(true);
        return;
      }

      // Compare current version with latest version
      const optionalCompare = compareVersions(CURRENT_VERSION, config.latestVersion);
      if (optionalCompare < 0) {
        // Current version is less than latest version -> OPTIONAL UPDATE
        // Check if user has previously skipped this specific version
        const skippedVersion = await AsyncStorage.getItem(SKIPPED_VERSION_KEY);
        if (skippedVersion !== config.latestVersion) {
          setUpdateConfig(config);
          setIsForced(false);
          setModalVisible(true);
        }
      }
    } catch (err) {
      console.error("[Updates] Auto update check failed:", err);
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        void checkForUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdates]);

  const handleCloseModal = async () => {
    if (updateConfig && !isForced) {
      try {
        // Remember that user skipped this specific version
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
        // Remember that user acknowledged update for this version so optional modal doesn't reappear immediately
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
