import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TrendLine = ({ trend, valueText, subtitle }) => {
  // trend: 'improving', 'stable', 'declining'
  
  let icon = '➡️';
  let color = '#CA8A04'; // yellow
  let bg = '#FEF9C3';
  
  if (trend === 'improving') {
    icon = '↗️';
    color = '#059669'; // green
    bg = '#D1FAE5';
  } else if (trend === 'declining') {
    icon = '↘️';
    color = '#DC2626'; // red
    bg = '#FEE2E2';
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.valueText, { color }]}>{valueText}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 18,
  },
  textCol: {
    flex: 1,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  }
});
