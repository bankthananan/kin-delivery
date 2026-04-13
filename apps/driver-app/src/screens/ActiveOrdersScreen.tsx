import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';
import { useDriverStore } from '../store/driverStore';
import { useIsFocused } from '@react-navigation/native';

export default function ActiveOrdersScreen({ navigation }: any) {
  const { activeOrders, setActiveOrders } = useDriverStore();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders');
      const active = data.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
      setActiveOrders(active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchOrders();
    }
  }, [isFocused]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.header}>
        <Text style={theme.typography.h3}>{item.restaurant.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={theme.typography.caption}>Order #{item.id.slice(0, 8)}</Text>
      <Text style={theme.typography.body} numberOfLines={2}>
        {item.customerAddress.addressLine1}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activeOrders}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={fetchOrders}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={theme.typography.body}>No active orders.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    ...theme.typography.small,
    color: theme.colors.surface,
  },
});
