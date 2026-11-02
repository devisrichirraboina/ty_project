import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const BarChart = ({ data, height = 150, maxValue = 5, barColor = '#A7F3D0', title }) => {
  // data format: [{ label: 'Mon', value: 3, topLabel: '😐' }, ...]
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={[styles.chartArea, { height }]}>
        {chartData.map((item, index) => {
          const barHeight = Math.max((item.value / maxValue) * height, 10);
          
          return (
            <View key={index} style={styles.barCol}>
              {item.topLabel && <Text style={styles.topLabel}>{item.topLabel}</Text>}
              
              <View style={[styles.barBg, { height }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { height: barHeight, backgroundColor: barColor }
                  ]} 
                />
              </View>
              
              <Text style={styles.xLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    marginVertical: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#26345D',
    marginBottom: 20,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  topLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  barBg: {
    width: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  xLabel: {
    marginTop: 10,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  }
});
