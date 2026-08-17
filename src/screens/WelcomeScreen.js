import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';

export const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.pillBadge}>
          <Text style={styles.pillBadgeText}>💜 Your safe space</Text>
        </View>

        <Text style={styles.mainHeading}>
          Welcome to <Text style={styles.brandAccent}>AlphaCare</Text>
        </Text>
        <Text style={styles.subHeading}>
          A friendly AI companion designed to help children understand their feelings, manage stress, and feel better every day.
        </Text>

        <View style={styles.heroBox}>
          <Text style={styles.heroEmoji}>🧸</Text>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>You're never alone.</Text>
            <Text style={styles.heroSub}>
              Share how you feel, explore your emotions, and discover little ways to take care of yourself.
            </Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧠</Text>
            <Text style={styles.featureLabel}>Understand Feelings</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌱</Text>
            <Text style={styles.featureLabel}>Build Wellness</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureLabel}>AI Support</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('RoleSelection')}
        >
          <Text style={styles.primaryButtonText}>Get Started →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FAF8F5',
    padding: 36,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  pillBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  pillBadgeText: { color: '#6D28D9', fontWeight: '700', fontSize: 13 },
  mainHeading: { fontSize: 32, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  brandAccent: { color: '#4F46E5' },
  subHeading: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  heroBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  heroEmoji: { fontSize: 44, marginRight: 16 },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  heroSub: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  featureGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 28 },
  featureItem: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  featureIcon: { fontSize: 24, marginBottom: 6 },
  featureLabel: { fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'center' },
  primaryButton: { backgroundColor: '#4F46E5', width: '100%', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});