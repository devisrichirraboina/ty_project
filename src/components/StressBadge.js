import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

// Displays stress classification: Low, Medium, High, or Critical[cite: 1]
export const StressBadge = ({ level = 'Low Risk' }) => {
  const getBadgeStyle = () => {
    switch (level) {
      case 'Critical Alert':
      case 'High Risk':
        return { bg: '#FFEBEE', text: COLORS.error, border: COLORS.error };
      case 'Moderate Stress':
      case 'Medium Risk':
        return { bg: '#FFF3E0', text: COLORS.warning, border: COLORS.warning };
      default:
        return { bg: '#E8F5E9', text: COLORS.success, border: COLORS.success };
    }
  };

  const styleConfig = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg, borderColor: styleConfig.border }]}>
      <Text style={[styles.badgeText, { color: styleConfig.text }]}>{level}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});