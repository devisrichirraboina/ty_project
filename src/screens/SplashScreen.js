import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Auto-navigate after 2.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('RoleSelection');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>✦ AlphaCare</Text>
        </View>

        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>🧸</Text>
        </View>

        <Text style={styles.title}>A little space{'\n'}to feel better.</Text>
        <Text style={styles.subtitleBold}>Your feelings matter.</Text>
        <Text style={styles.subtitle}>We're here to understand, support, and grow with you.</Text>

        <View style={styles.tagRow}>
          <View style={styles.tag}><Text style={styles.tagText}>⭐ AI Support</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>💚 Safe Space</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>🌱 Wellness</Text></View>
        </View>

        <TouchableOpacity 
          style={styles.continueBtn}
          onPress={() => navigation.replace('RoleSelection')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Get Started →</Text>
        </TouchableOpacity>

        <Text style={styles.loadingText}>Creating your safe space...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFBFA',
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  badgePill: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E1B4B',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitleBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4338CA',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  continueBtn: {
    backgroundColor: '#4F46E5',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});