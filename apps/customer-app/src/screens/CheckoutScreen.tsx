import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { api } from '../services/api';

export const CheckoutScreen = ({ route, navigation }: any) => {
  const { validationResult } = route.params;
  const { items, restaurantId, tier, clearCart } = useCartStore();
  const { currentLocation, selectedAddress } = useLocationStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'PROMPTPAY' | 'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get('/wallet/balance');
      setWalletBalance(res.data.balance);
    } catch (err) {
      console.log('Failed to fetch wallet balance');
    }
  };

  const handlePlaceOrder = async () => {
    const lat = selectedAddress?.lat || currentLocation?.lat;
    const lng = selectedAddress?.lng || currentLocation?.lng;

    if (!lat || !lng || !restaurantId) return;

    if (paymentMethod === 'WALLET' && walletBalance < validationResult.totalAmount) {
      Alert.alert('Insufficient Balance', 'Please top up your wallet or choose another payment method');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurantId,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes || '' })),
        tier,
        paymentMethod,
        deliveryLat: lat,
        deliveryLng: lng,
        deliveryAddress: selectedAddress?.addressStr || 'Current Location',
        deliveryNote: '',
      };

      const res = await api.post('/orders', payload);
      clearCart();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }, { name: 'OrderTracking', params: { orderId: res.data.id } }],
      });
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Delivery Address</Text>
        <Text>{selectedAddress?.label || 'Current GPS Location'}</Text>
        <Text>{selectedAddress?.addressStr || `${currentLocation?.lat}, ${currentLocation?.lng}`}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Payment Method</Text>
        {(['PROMPTPAY', 'CASH', 'CARD', 'WALLET'] as const).map(pm => (
          <TouchableOpacity
            key={pm}
            style={[styles.pmBtn, paymentMethod === pm && styles.pmBtnActive]}
            onPress={() => setPaymentMethod(pm)}
          >
            <Text style={paymentMethod === pm ? { color: 'white' } : {}}>{pm}</Text>
            {pm === 'WALLET' && <Text style={paymentMethod === pm ? { color: 'white' } : {}}>(฿{walletBalance.toFixed(2)})</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Total Amount: ฿{validationResult.totalAmount.toFixed(2)}</Text>
      </View>

      <Button title="Place Order" onPress={handlePlaceOrder} disabled={loading} color="#e74c3c" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  pmBtn: { padding: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  pmBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
});
