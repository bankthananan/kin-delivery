import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../design/theme';

export default function NavigationScreen({ route }: any) {
  const { order } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={theme.typography.h3}>Navigation</Text>
      </View>
      <View style={styles.mapPlaceholder}>
        <Text style={theme.typography.caption}>(Map SDK Placeholder)</Text>
        <Text style={theme.typography.body}>Restaurant Coordinates:</Text>
        <Text style={theme.typography.small}>
          Lat: {order.restaurant.lat}, Lng: {order.restaurant.lng}
        </Text>
        <View style={{ height: theme.spacing.xl }} />
        <Text style={theme.typography.body}>Customer Coordinates:</Text>
        <Text style={theme.typography.small}>
          Lat: {order.customerAddress.lat}, Lng: {order.customerAddress.lng}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={theme.typography.h2}>Route Estimate</Text>
        <Text style={theme.typography.body}>Distance: ~{order.distance}km</Text>
        <Text style={theme.typography.body}>Time: ~{(order.distance * 3).toFixed(0)} mins</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  info: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
});
