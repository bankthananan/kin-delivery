import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../design/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge = ({ label, variant = 'default', size = 'sm' }: BadgeProps) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#D1FAE5', text: theme.colors.success };
      case 'warning':
        return { bg: '#FEF3C7', text: theme.colors.warning };
      case 'error':
        return { bg: '#FEE2E2', text: theme.colors.error };
      case 'info':
        return { bg: '#DBEAFE', text: theme.colors.info };
      default:
        return { bg: theme.colors.border, text: theme.colors.textMuted };
    }
  };

  const colors = getColors();
  const px = size === 'sm' ? theme.spacing.sm : theme.spacing.md;
  const py = size === 'sm' ? 2 : 4;
  const textStyle = size === 'sm' ? theme.typography.small : theme.typography.caption;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, paddingHorizontal: px, paddingVertical: py }]}>
      <Text style={[textStyle, { color: colors.text, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
