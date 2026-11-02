import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const PieChart = ({
  data = [],
  size = 200,
  donut = true,
  strokeWidth = 20,
  centerTitle = '',
  centerSubtitle = '',
  title = '',
  subtitle = '',
}) => {
  const validData = Array.isArray(data) ? data.filter(d => (Number(d.value) || 0) >= 0) : [];
  const totalValue = validData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeValue = 0;
  const segments = validData.map(item => {
    const val = Number(item.value) || 0;
    const ratio = totalValue > 0 ? val / totalValue : (1 / Math.max(validData.length, 1));
    const strokeDash = ratio * circumference;
    const strokeOffset = (cumulativeValue / (totalValue || 1)) * circumference;
    cumulativeValue += val;

    return {
      ...item,
      val,
      rawPercentage: Math.round(val),
      strokeDash,
      strokeOffset,
    };
  });

  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.titleWrap}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>
      ) : null}

      <View style={styles.chartAndLegendRow}>
        {/* SIMPLE DONUT CHART */}
        <View style={[styles.chartWrapper, { width: size, height: size }]}>
          {Platform.OS === 'web' ? (
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
            >
              {/* Clean Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {/* Colored Segments */}
              {segments.map((seg, idx) => {
                if (seg.strokeDash <= 0) return null;
                return (
                  <circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color || '#6366F1'}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${seg.strokeDash} ${circumference - seg.strokeDash}`}
                    strokeDashoffset={-seg.strokeOffset}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          ) : (
            <View
              style={[
                styles.nativeFallback,
                { width: size, height: size, borderRadius: size / 2, borderColor: '#6366F1' },
              ]}
            />
          )}

          {/* Simple Center Score */}
          {donut && (
            <View style={styles.centerContainer} pointerEvents="none">
              {centerTitle ? <Text style={styles.centerTitle}>{centerTitle}</Text> : null}
              {centerSubtitle ? <Text style={styles.centerSubtitle}>{centerSubtitle}</Text> : null}
            </View>
          )}
        </View>

        {/* CLEAN, MINIMAL, AIRY LEGEND */}
        <View style={styles.legendContainer}>
          {segments.map((item, index) => (
            <View key={index} style={styles.legendRow}>
              <View style={[styles.colorDot, { backgroundColor: item.color || '#6366F1' }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendValue}>
                {item.rawPercentage}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 36,
    marginVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  titleWrap: {
    marginBottom: 24,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  chartAndLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 36,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  centerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    minWidth: 220,
    maxWidth: 320,
    gap: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 12,
  },
  nativeFallback: {
    borderWidth: 20,
    backgroundColor: 'transparent',
  },
});
