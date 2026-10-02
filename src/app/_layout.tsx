import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Đăng ký TaskManager ở Global Scope
import '@/tasks/backgroundLocation';
import { AuthProvider } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
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
  );
}
