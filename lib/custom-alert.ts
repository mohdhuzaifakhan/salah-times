type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export interface CustomAlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  visible: boolean;
}

type AlertListener = (config: CustomAlertConfig) => void;
let alertListener: AlertListener | null = null;

/**
 * Registers the UI component's callback handler to receive alert dispatches.
 */
export const registerAlertListener = (listener: AlertListener) => {
  alertListener = listener;
};

/**
 * Unregisters the callback handler.
 */
export const unregisterAlertListener = () => {
  alertListener = null;
};

/**
 * Dispatches a custom alert request. If the UI container is not mounted yet,
 * it falls back to the saved original react-native Alert function.
 */
export const showCustomAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (alertListener) {
    alertListener({
      title,
      message,
      buttons,
      visible: true,
    });
  } else {
    // Dynamic fall back to native Alert
    try {
      const { Alert } = require("react-native");
      const original = (Alert as any).__originalAlert;
      if (original) {
        original(title, message, buttons);
      } else {
        console.warn(`[Alert Fallback] ${title}: ${message}`);
      }
    } catch (e) {
      console.warn(`[Alert Fallback Exception] ${title}: ${message}`);
    }
  }
};
