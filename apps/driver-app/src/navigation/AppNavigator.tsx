import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ActiveOrdersScreen from '../screens/ActiveOrdersScreen';
import WalletScreen from '../screens/WalletScreen';
import OrderPingScreen from '../screens/OrderPingScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import NavigationScreen from '../screens/NavigationScreen';
import WithdrawScreen from '../screens/WithdrawScreen';
import { Home, ListOrdered, Wallet } from 'lucide-react-native';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color }) => <Home color={color} /> }}
      />
      <Tab.Screen
        name="ActiveOrders"
        component={ActiveOrdersScreen}
        options={{ tabBarIcon: ({ color }) => <ListOrdered color={color} /> }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ tabBarIcon: ({ color }) => <Wallet color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const navigation = useNavigation<any>();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      socketService.connect();
      socketService.onOrderPing((data) => {
        navigation.navigate('OrderPing', { pingData: data });
      });
    } else {
      socketService.disconnect();
    }
    return () => {
      socketService.offOrderPing();
    };
  }, [token, navigation]);

  if (!token) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <AppStack.Navigator>
      <AppStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <AppStack.Screen name="OrderPing" component={OrderPingScreen} options={{ presentation: 'modal', headerShown: false }} />
      <AppStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
      <AppStack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Route' }} />
      <AppStack.Screen name="Withdraw" component={WithdrawScreen} options={{ title: 'Withdraw Funds' }} />
    </AppStack.Navigator>
  );
}

export default AppNavigator;
