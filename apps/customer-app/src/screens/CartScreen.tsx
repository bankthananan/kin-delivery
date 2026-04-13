import React, { useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { api } from '../services/api';

export const CartScreen = ({ navigation }: any) => {
  const { items, updateQuantity, tier, setTier, getTotals } = useCartStore();
  const { currentLocation, selectedAddress } = useLocationStore();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { subtotal } = getTotals();

  const handleValidate = async () => {
    if (items.length === 0) return;

    const lat = selectedAddress?.lat || currentLocation?.lat;
    const lng = selectedAddress?.lng || currentLocation?.lng;

    if (!lat || !lng) {
      Alert.alert('No Location', 'Please select a delivery location');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/cart/validate', {
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes })),
        deliveryLat: lat,
        deliveryLng: lng,
        tier,
      });
      setValidationResult(res.data);
    } catch (err: any) {
      Alert.alert('Validation Error', err.message || 'Failed to validate cart');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!validationResult) {
      Alert.alert('Please validate cart first');
      return;
    }
    navigation.navigate('Checkout', { validationResult });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={item => item.menuItemId}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text>฿{item.price.toFixed(2)} x {item.quantity}</Text>
            </View>
            <View style={styles.qtyControls}>
              <Button title="-" onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)} />
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Button title="+" onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)} />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ padding: 20 }}>Cart is empty</Text>}
      />

      <View style={styles.tierSection}>
        <Text style={styles.sectionTitle}>Delivery Tier</Text>
        <View style={styles.tierButtons}>
          {(['FASTEST', 'NORMAL', 'SAVER'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tierBtn, tier === t && styles.tierBtnActive]}
              onPress={() => { setTier(t); setValidationResult(null); }}
            >
              <Text style={tier === t ? { color: 'white' } : {}}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Subtotal: ฿{subtotal.toFixed(2)}</Text>
        <Button title="Calculate Delivery Fee" onPress={handleValidate} disabled={loading || items.length === 0} />
        
        {validationResult && (
          <View style={styles.breakdown}>
            <Text>Delivery Fee: ฿{validationResult.deliveryFee.toFixed(2)}</Text>
            <Text style={styles.totalText}>Total: ฿{validationResult.totalAmount.toFixed(2)}</Text>
            <Button title="Proceed to Checkout" onPress={handleProceed} color="#00cc66" />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  cartItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: 'white', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyText: { marginHorizontal: 10, fontSize: 16 },
  tierSection: { padding: 15, backgroundColor: 'white', marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  tierButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  tierBtn: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  tierBtnActive: { backgroundColor: '#333', borderColor: '#333' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#ccc' },
  breakdown: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: '#eee' },
  totalText: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
});
