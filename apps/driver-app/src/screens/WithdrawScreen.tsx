import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';
import { useWalletStore } from '../store/walletStore';

export default function WithdrawScreen({ navigation }: any) {
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const { balance } = useWalletStore();

  const handleWithdraw = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is 100 THB');
      return;
    }
    if (amountNum > balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your balance');
      return;
    }
    if (!bankAccount) {
      Alert.alert('Required', 'Bank account details required');
      return;
    }

    try {
      await api.post('/wallet/withdraw', { amount: amountNum, bankAccount });
      Alert.alert('Success', `Withdrawal of ฿${amountNum.toFixed(2)} requested`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to process withdrawal');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={theme.typography.h2}>Withdraw Funds</Text>
      <Text style={theme.typography.caption}>Current Balance: ฿{balance.toFixed(2)}</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (Min. 100 THB)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Bank Account Number"
        value={bankAccount}
        onChangeText={setBankAccount}
      />

      <TouchableOpacity style={styles.button} onPress={handleWithdraw}>
        <Text style={styles.buttonText}>Confirm Withdrawal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  buttonText: {
    ...theme.typography.bodySemibold,
    color: theme.colors.surface,
  },
});
