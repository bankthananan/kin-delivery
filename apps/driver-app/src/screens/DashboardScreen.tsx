import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';
import { useDriverStore } from '../store/driverStore';
import { locationTracker } from '../services/locationTracker';
import { socketService } from '../services/socket';

export default function DashboardScreen({ navigation }: any) {
  const { isOnline, setOnline, todayEarnings, totalCompletedToday, activeOrders } = useDriverStore();

  const toggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await api.put('/driver/status', { isOnline: newStatus });
      setOnline(newStatus);

      if (newStatus) {
        socketService.connect();
        await locationTracker.startTracking();
      } else {
        socketService.disconnect();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/orders');
        const active = data.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
        const completed = data.filter((o: any) => o.status === 'DELIVERED');
        useDriverStore.getState().setActiveOrders(active);
        useDriverStore.getState().setStats(
          completed.reduce((acc: number, cur: any) => acc + (cur.deliveryFee || 0), 0),
          completed.length
        );
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [isOnline]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleButton, isOnline ? styles.onlineButton : styles.offlineButton]}
        onPress={toggleOnline}
      >
        <Text style={styles.toggleText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={theme.typography.caption}>Today's Earnings</Text>
          <Text style={theme.typography.h2}>฿{todayEarnings.toFixed(2)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={theme.typography.caption}>Completed Orders</Text>
          <Text style={theme.typography.h2}>{totalCompletedToday}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={theme.typography.caption}>Active Orders</Text>
          <Text style={theme.typography.h2}>{activeOrders.length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  toggleButton: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  onlineButton: {
    backgroundColor: theme.colors.success,
  },
  offlineButton: {
    backgroundColor: theme.colors.error,
  },
  toggleText: {
    ...theme.typography.h1,
    color: theme.colors.surface,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
});
