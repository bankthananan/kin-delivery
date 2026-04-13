import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { initializeSocket, disconnectSocket } from '../services/socket';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LocationSelectScreen } from '../screens/LocationSelectScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { OrderHistoryScreen } from '../screens/OrderHistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WalletTopupScreen } from '../screens/WalletTopupScreen';
import { useLocationStore } from '../store/locationStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="OrdersTab" component={OrderHistoryScreen} options={{ title: 'Orders' }} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { token } = useAuthStore();
  const { selectedAddress, currentLocation } = useLocationStore();

  useEffect(() => {
    if (token) {
      initializeSocket();
    } else {
      disconnectSocket();
    }
  }, [token]);

  return (
    <Stack.Navigator>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      ) : (!selectedAddress && !currentLocation) ? (
        <Stack.Screen name="LocationSelect" component={LocationSelectScreen} options={{ title: 'Set Location' }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="LocationSelect" component={LocationSelectScreen} options={{ title: 'Change Location' }} />
          <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} options={{ title: 'Restaurant' }} />
          <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Track Order' }} />
          <Stack.Screen name="WalletTopup" component={WalletTopupScreen} options={{ title: 'Top Up Wallet' }} />
        </>
      )}
    </Stack.Navigator>
  );
};
