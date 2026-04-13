import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { api } from '../services/api';
import { getSocket, initializeSocket } from '../services/socket';
import MapView, { Marker } from 'react-native-maps';

export const OrderTrackingScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    fetchOrder();

    const socket = getSocket() || initializeSocket();
    if (socket) {
      socket.emit('join_order', orderId);

      socket.on('order_status_update', (data: any) => {
        if (data.orderId === orderId) {
          setOrder((prev: any) => ({ ...prev, status: data.status }));
        }
      });

      socket.on('driver_location_update', (data: any) => {
        if (data.orderId === orderId) {
          setDriverLocation({ lat: data.lat, lng: data.lng });
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_order', orderId);
        socket.off('order_status_update');
        socket.off('driver_location_update');
      }
    };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.log('Failed to fetch order');
    }
  };

  const handleRate = async () => {
    try {
      await api.post(`/orders/${orderId}/rate`, { score: rating, comment: 'Great!' });
      Alert.alert('Success', 'Thank you for your feedback');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  if (!order) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Status: {order.status}</Text>
      <Text style={styles.subtitle}>Restaurant: {order.restaurant?.name}</Text>
      
      <View style={styles.mapContainer}>
        {order.deliveryLat && order.deliveryLng ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: order.deliveryLat,
              longitude: order.deliveryLng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: order.deliveryLat, longitude: order.deliveryLng }} title="Delivery Location" pinColor="blue" />
            {driverLocation && (
              <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Driver" pinColor="green" />
            )}
          </MapView>
        ) : (
          <Text>Map Placeholder (No location provided)</Text>
        )}
      </View>

      {order.status === 'DELIVERED' && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingTitle}>Rate your order</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Button key={s} title={s.toString()} onPress={() => setRating(s)} color={rating === s ? '#f39c12' : '#ccc'} />
            ))}
          </View>
          <Button title="Submit Rating" onPress={handleRate} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  mapContainer: { height: 300, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden', borderRadius: 10 },
  map: { width: '100%', height: '100%' },
  ratingContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10 },
  ratingTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  ratingStars: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
});
