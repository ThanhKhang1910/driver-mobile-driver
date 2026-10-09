import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen 
        name="active_ride" 
        options={{ 
          headerShown: true,
          title: 'Chuyến xe hiện tại', 
          headerStyle: { backgroundColor: '#3399FF' }, 
          headerTintColor: '#FFF' 
        }} 
      />
      <Stack.Screen name="history" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="reviews" />
    </Stack>
  );
}
