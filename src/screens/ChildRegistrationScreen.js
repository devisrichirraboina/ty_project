import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

export const ChildRegistrationScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = () => {
    const parsedAge = parseInt(age, 10);
    if (!name.trim()) {
      setErrorMsg("Please enter the child's full name.");
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 3 || parsedAge >= 18) {
      setErrorMsg('Age must be under 18 years for a child account.');
      return;
    }
    if (phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMsg('');
    navigation.navigate('OTP', { phone: phone.trim(), childName: name.trim() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topIconWrap}>
          <Text style={styles.topEmoji}>👧</Text>
        </View>

        <View style={styles.pillBadge}>
          <Text style={styles.pillText}>💜 Welcome to AlphaCare</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Let's create your safe space 🌱</Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Child's Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mansi Patel"
            value={name}
            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
          />

          <Text style={styles.label}>Age (Must be under 18)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 13"
            keyboardType="numeric"
            value={age}
            onChangeText={(t) => { setAge(t); setErrorMsg(''); }}
          />

          <Text style={styles.label}>Parent/Guardian Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrorMsg(''); }}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.primaryButtonText}>Send Verification Code →</Text>
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
    maxWidth: 480,
    backgroundColor: '#FAF8F5',
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  topEmoji: { fontSize: 28 },
  pillBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  pillText: { color: '#6D28D9', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#1E1B4B' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  form: { width: '100%', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 14, fontSize: 14, marginBottom: 14 },
  primaryButton: { backgroundColor: '#6366F1', width: '100%', paddingVertical: 15, borderRadius: 18, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});