import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';

export default function OrderDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load order');
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchOrder();
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  if (!order) return <View style={styles.container}><Text>Loading...</Text></View>;

  const getActionButton = () => {
    switch (order.status) {
      case 'READY':
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus('PICKED_UP')}>
            <Text style={styles.btnText}>Pick Up</Text>
          </TouchableOpacity>
        );
      case 'PICKED_UP':
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus('IN_TRANSIT')}>
            <Text style={styles.btnText}>Start Delivery</Text>
          </TouchableOpacity>
        );
      case 'IN_TRANSIT':
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus('DELIVERED')}>
            <Text style={styles.btnText}>Mark Delivered</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={theme.typography.h2}>Restaurant</Text>
        <Text style={theme.typography.bodySemibold}>{order.restaurant.name}</Text>
        <Text style={theme.typography.body}>{order.restaurant.address}</Text>
      </View>

      <View style={styles.card}>
        <Text style={theme.typography.h3}>Customer</Text>
        <Text style={theme.typography.bodySemibold}>{order.customerAddress.addressLine1}</Text>
        {order.deliveryNote && <Text style={theme.typography.caption}>Note: {order.deliveryNote}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={theme.typography.h3}>Items</Text>
        {order.items.map((item: any, i: number) => (
          <Text key={i} style={theme.typography.body}>
            {item.quantity}x {item.menuItem.name}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => navigation.navigate('Navigation', { order })}
      >
        <Text style={styles.btnText}>View on Map</Text>
      </TouchableOpacity>

      <View style={styles.footer}>{getActionButton()}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  footer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  navBtn: {
    backgroundColor: theme.colors.info,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  btnText: {
    ...theme.typography.h3,
    color: theme.colors.surface,
  },
});
