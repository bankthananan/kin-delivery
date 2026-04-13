import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../design/theme';
import { api } from '../services/api';
import { useWalletStore } from '../store/walletStore';
import { useIsFocused } from '@react-navigation/native';

export default function WalletScreen({ navigation }: any) {
  const { balance, transactions, setWallet } = useWalletStore();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions'),
      ]);
      setWallet(balRes.data.balance, txRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchWallet();
    }
  }, [isFocused]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.type}</Text>
        </View>
        <Text style={theme.typography.h3}>
          {item.type === 'WITHDRAWAL' ? '-' : '+'}฿{item.amount.toFixed(2)}
        </Text>
      </View>
      <Text style={theme.typography.caption}>{new Date(item.date).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={theme.typography.h3}>Available Balance</Text>
        <Text style={styles.balanceText}>฿{balance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => navigation.navigate('Withdraw')}
        >
          <Text style={styles.btnText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <Text style={[theme.typography.h2, { padding: theme.spacing.md }]}>Transactions</Text>

      <FlatList
        data={transactions}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={fetchWallet}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={theme.typography.body}>No transactions yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  balanceText: {
    color: theme.colors.surface,
    fontSize: 48,
    fontWeight: '800',
    marginVertical: theme.spacing.md,
  },
  withdrawBtn: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
  btnText: {
    ...theme.typography.bodySemibold,
    color: theme.colors.surface,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    ...theme.typography.small,
    color: theme.colors.surface,
  },
});
