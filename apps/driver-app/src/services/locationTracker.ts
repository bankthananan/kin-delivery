import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';
import { useDriverStore } from '../store/driverStore';
import { socketService } from './socket';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      try {
        await api.put('/driver/location', { lat: latitude, lng: longitude });
        useDriverStore.getState().setCurrentLocation({ lat: latitude, lng: longitude });
        socketService.emitLocation(latitude, longitude);
      } catch (err) {
        console.error('Error updating location', err);
      }
    }
  }
});

export const locationTracker = {
  startTracking: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return false;
    }
    
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        try {
          await api.put('/driver/location', { lat: latitude, lng: longitude });
          useDriverStore.getState().setCurrentLocation({ lat: latitude, lng: longitude });
          socketService.emitLocation(latitude, longitude);
        } catch (err) {
          console.error('Error updating location', err);
        }
      }
    );
    return subscription;
  },
};
