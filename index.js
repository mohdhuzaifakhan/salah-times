import notifee from '@notifee/react-native';
import { handleNotifeeBackgroundEvent } from './lib/notifications';
import "expo-router/entry";

// Background event handler for process-surviving prayer alarms
notifee.onBackgroundEvent(async (event) => {
  await handleNotifeeBackgroundEvent(event);
});


