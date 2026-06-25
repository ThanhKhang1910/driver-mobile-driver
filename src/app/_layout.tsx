import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Định nghĩa các luồng chính trong Stack */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(driver)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="profile" />

        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
