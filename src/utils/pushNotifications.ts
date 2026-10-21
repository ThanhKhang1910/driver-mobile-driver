import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Khởi tạo an toàn cho expo-notifications
let Notifications: typeof import('expo-notifications') | null = null;

try {
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Chạy trên Expo Go hoặc môi trường thiếu native notification module, bỏ qua âm thầm
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Kiểm tra nếu đang chạy trong Expo Go thì bỏ qua đăng ký push token (do Expo SDK 53+ không hỗ trợ trong Expo Go)
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';

  if (isExpoGo || !Notifications) {
    return 'dummy-token';
  }

  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch {
        // Bỏ qua nếu channel manager không khả dụng
      }
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        if (!projectId) {
          return 'dummy-token';
        }

        const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = pushTokenData.data;
      } catch {
        token = 'dummy-token';
      }
    } else {
      token = 'dummy-token';
    }
  } catch {
    token = 'dummy-token';
  }

  return token;
}
