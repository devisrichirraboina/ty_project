import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ROLES = [
  { id: 'child', emoji: '👦', title: 'Child', desc: 'Explore your feelings and wellness', active: true },
  { id: 'parent', emoji: '👨‍👩‍👧', title: 'Parent', desc: 'Support and understand your child', active: false },
  { id: 'counselor', emoji: '🧑‍⚕️', title: 'Counselor', desc: 'Help children with professional support', active: false },
];

export const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState('child');

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.headerBox}>
          <Text style={styles.headerEmoji}>👋</Text>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>💜 Welcome to AlphaCare</Text>
          </View>
          <Text style={styles.title}>Who are you?</Text>
          <Text style={styles.subtitle}>Choose your role to continue</Text>
        </View>

        <View style={styles.gridRow}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <View key={role.id} style={[styles.roleCard, isSelected && styles.selectedRoleCard]}>
                <View style={styles.roleIconWrap}>
                  <Text style={styles.roleEmoji}>{role.emoji}</Text>
                </View>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>

                <TouchableOpacity
                  style={[styles.roleButton, !role.active && styles.disabledButton]}
                  onPress={() => role.active && navigation.navigate('ChildRegistration')}
                >
                  <Text style={styles.roleButtonText}>Continue as {role.title} →</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <Text style={styles.footerNote}>🔒 Your information is safe and private</Text>
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
  wrapper: { width: '100%', maxWidth: 850, alignItems: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 28 },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
  pillBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  pillText: { color: '#6D28D9', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 32, fontWeight: '800', color: '#1E1B4B' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  gridRow: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 20 },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedRoleCard: { borderColor: '#818CF8', backgroundColor: '#FAF8F5' },
  roleIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  roleEmoji: { fontSize: 32 },
  roleTitle: { fontSize: 18, fontWeight: '800', color: '#1E1B4B' },
  roleDesc: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 18 },
  roleButton: { backgroundColor: '#6366F1', width: '100%', paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9CA3AF' },
  roleButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  footerNote: { fontSize: 12, color: '#9CA3AF' },
});