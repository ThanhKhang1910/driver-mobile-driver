import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="home" 
        options={{ 
          title: 'Tài xế', 
          headerStyle: { backgroundColor: '#3399FF' }, 
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: 'bold' } 
        }} 
      />
      <Stack.Screen 
        name="active_ride" 
        options={{ 
          title: 'Chuyến xe hiện tại', 
          headerStyle: { backgroundColor: '#3399FF' }, 
          headerTintColor: '#FFF' 
        }} 
      />
    </Stack>
  );
}
