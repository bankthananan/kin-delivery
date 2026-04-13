import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { api } from '../services/api';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const { selectedAddress, setSelectedAddress } = useLocationStore();
  const [walletBalance, setWalletBalance] = useState(0);
  const [addresses, setAddresses] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [walletRes, addrRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/customer/addresses')
      ]);
      setWalletBalance(walletRes.data.balance);
      setAddresses(addrRes.data);
    } catch (err) {
      console.log('Failed to fetch profile data');
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.delete(`/customer/addresses/${id}`);
      if (selectedAddress?.id === id) {
        setSelectedAddress(null);
      }
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete address');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text>{user?.email}</Text>
        <Text style={styles.label}>Phone</Text>
        <Text>{user?.phone}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Wallet Balance</Text>
            <Text style={styles.balance}>฿{walletBalance.toFixed(2)}</Text>
          </View>
          <Button title="Top Up" onPress={() => navigation.navigate('WalletTopup')} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Saved Addresses</Text>
      <FlatList
        data={addresses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.addressItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{item.label}</Text>
              <Text>{item.addressStr}</Text>
            </View>
            <Button title="Delete" color="red" onPress={() => handleDeleteAddress(item.id)} />
          </View>
        )}
        ListEmptyComponent={<Text>No saved addresses</Text>}
      />

      <Button title="Logout" color="#e74c3c" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  label: { fontSize: 14, color: '#666', marginTop: 10, marginBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balance: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  addressItem: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  addressLabel: { fontWeight: 'bold', marginBottom: 5 },
});
