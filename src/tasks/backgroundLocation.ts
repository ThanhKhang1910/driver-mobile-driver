import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axiosClient from '@/api/axiosClient';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const location = locations[0];
      
      try {
        const orderIdStr = await SecureStore.getItemAsync('active_order_id');
        
        await axiosClient.put('/driver/location', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          order_id: orderIdStr ? Number(orderIdStr) : null,
        });
        
        console.log(`[Background] Sent location: ${location.coords.latitude}, ${location.coords.longitude}`);
      } catch (err) {
        console.error('Failed to send background location:', err);
      }
    }
  }
});
