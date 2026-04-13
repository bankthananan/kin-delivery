import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useLocationStore } from '../store/locationStore';
import { api } from '../services/api';

export const LocationSelectScreen = ({ navigation }: any) => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const { setCurrentLocation, setSelectedAddress } = useLocationStore();

  useEffect(() => {
    fetchAddresses();
    getLocation();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/customer/addresses');
      setAddresses(res.data);
    } catch (err) {
      console.log('Failed to fetch addresses');
    }
  };

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    setCurrentLocation({ lat, lng });

    try {
      const res = await api.post('/customer/addresses/nearest', { lat, lng });
      if (res.data) {
        setSelectedAddress(res.data);
        Alert.alert('Address detected', `Using: ${res.data.label}`);
        navigation.navigate('Main');
      }
    } catch (err) {
      // no nearest address
    }
  };

  const selectAddress = (addr: any) => {
    setSelectedAddress(addr);
    navigation.navigate('Main');
  };

  const useCurrentLocation = () => {
    setSelectedAddress(null);
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Delivery Location</Text>
      
      <Button title="Use Current GPS Location" onPress={useCurrentLocation} />

      <Text style={styles.subtitle}>Saved Addresses</Text>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.addressItem} onPress={() => selectAddress(item)}>
            <Text style={styles.addressLabel}>{item.label}</Text>
            <Text>{item.addressStr}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No saved addresses.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  addressItem: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 10 },
  addressLabel: { fontWeight: 'bold', marginBottom: 5 },
});
