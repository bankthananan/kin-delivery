import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useLocationStore } from '../store/locationStore';
import { api } from '../services/api';

export const HomeScreen = ({ navigation }: any) => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { currentLocation, selectedAddress } = useLocationStore();

  const fetchRestaurants = async () => {
    const lat = selectedAddress?.lat || currentLocation?.lat;
    const lng = selectedAddress?.lng || currentLocation?.lng;

    if (!lat || !lng) return;

    try {
      const res = await api.get(`/restaurants?lat=${lat}&lng=${lng}&radius=0.5`);
      setRestaurants(res.data);
    } catch (err) {
      console.log('Failed to fetch restaurants');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRestaurants();
  }, [currentLocation, selectedAddress]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RestaurantDetail', { id: item.id })}
    >
      <Text style={styles.name}>{item.name}</Text>
      <View style={styles.row}>
        <Text style={styles.rating}>⭐ {item.rating?.toFixed(1) || 'New'}</Text>
        <Text style={styles.distance}>{item.distance?.toFixed(2)} km</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nearby Restaurants</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text>No restaurants within 500m</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  card: { padding: 15, backgroundColor: 'white', borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
  name: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  rating: { color: '#f39c12' },
  distance: { color: '#666' },
});
