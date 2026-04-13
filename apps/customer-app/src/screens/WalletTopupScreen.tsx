import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { api } from '../services/api';

export const WalletTopupScreen = ({ navigation }: any) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'PROMPTPAY' | 'CARD'>('PROMPTPAY');
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  const handleTopup = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Invalid amount', 'Please enter a valid number');
      return;
    }

    try {
      const res = await api.post('/wallet/topup', { amount: Number(amount), paymentMethod: method });
      if (res.data.qrPayload) {
        setQrPayload(res.data.qrPayload);
        Alert.alert('Scan QR', `PromptPay QR payload generated. Please mock payment process.`);
      } else {
        Alert.alert('Success', 'Topup successful');
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Topup failed');
    }
  };

  if (qrPayload) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan to Pay</Text>
        <View style={styles.qrBox}>
          <Text>{qrPayload}</Text>
        </View>
        <Button title="Done (Simulate Paid)" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Topup Wallet</Text>
      
      <Text style={styles.label}>Amount (THB)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.methods}>
        {(['PROMPTPAY', 'CARD'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.methodBtn, method === m && styles.activeMethod]}
            onPress={() => setMethod(m)}
          >
            <Text style={method === m ? { color: 'white' } : {}}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Confirm Topup" onPress={handleTopup} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 15, fontSize: 18 },
  methods: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  methodBtn: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 15, alignItems: 'center', borderRadius: 8, marginHorizontal: 5 },
  activeMethod: { backgroundColor: '#3498db', borderColor: '#3498db' },
  qrBox: { width: 250, height: 250, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 30 },
});
