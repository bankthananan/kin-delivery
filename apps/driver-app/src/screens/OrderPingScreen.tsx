import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export default function OrderPingScreen({ navigation, route }: any) {
  const { pingData } = route.params || {};
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!pingData) {
      navigation.goBack();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pingData]);

  const handleAccept = async () => {
    try {
      await api.post(`/driver/orders/${pingData.orderId}/accept`);
      navigation.replace('OrderDetail', { orderId: pingData.orderId });
    } catch (e: any) {
      if (e.response?.status === 409) {
        Alert.alert('Already Taken', 'Another driver accepted this order.');
      } else {
        Alert.alert('Error', 'Failed to accept order');
      }
      navigation.goBack();
    }
  };

  const handleReject = () => {
    navigation.goBack();
  };

  if (!pingData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={theme.typography.h2}>New Order!</Text>
        <Text style={theme.typography.bodySemibold}>{pingData.restaurantName}</Text>
        <Text style={theme.typography.caption}>Distance: {pingData.distance}km</Text>
        <Text style={theme.typography.h1}>฿{pingData.deliveryFee.toFixed(2)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pingData.tier}</Text>
        </View>

        <Text style={styles.timer}>{timeLeft}s remaining</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleReject}>
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginVertical: theme.spacing.md,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
  },
  timer: {
    ...theme.typography.h3,
    color: theme.colors.error,
    marginVertical: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    ...theme.typography.bodySemibold,
    color: theme.colors.surface,
  },
});
