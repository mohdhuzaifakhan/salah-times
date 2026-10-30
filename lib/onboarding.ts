import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_COMPLETED_KEY = "@salah_times_onboarding_completed_v1";

/**
 * Check if the user has completed the onboarding flow.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return val === "true";
  } catch (error) {
    console.error("[Onboarding] Error checking onboarding status:", error);
    return false;
  }
}

/**
 * Mark the onboarding as completed.
 */
export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  } catch (error) {
    console.error("[Onboarding] Error setting onboarding completed:", error);
  }
}

/**
 * Reset onboarding status for testing or re-touring.
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error("[Onboarding] Error resetting onboarding status:", error);
  }
}

