import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '[expo-notifications]',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Định nghĩa các luồng chính trong Stack */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(driver)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="profile" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
