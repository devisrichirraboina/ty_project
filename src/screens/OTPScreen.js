import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

export const OTPScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const countdown = timer > 0 && setInterval(() => setTimer(timer - 1), 1000);
    return () => clearInterval(countdown);
  }, [timer]);

  const handleVerify = () => {
    if (otp.join('').length < 6) {
      setErrorMsg('Please enter all 6 digits of your OTP.');
      return;
    }
    setErrorMsg('');
    navigation.replace('ChildDashboard', { childName: route.params?.childName || 'Student' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>📩</Text>
        </View>

        <Text style={styles.title}>Verify your mobile</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to {'\n'}
          <Text style={styles.phoneHighlight}>+91 {route.params?.phone || 'XXXXXXXXXX'}</Text>
        </Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              style={styles.otpBox}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(val) => {
                const newOtp = [...otp];
                newOtp[idx] = val;
                setOtp(newOtp);
                if (errorMsg) setErrorMsg('');
              }}
            />
          ))}
        </View>

        <TouchableOpacity disabled={timer > 0} onPress={() => setTimer(30)} style={styles.resendBtn}>
          <Text style={{ color: timer > 0 ? '#9CA3AF' : '#4F46E5', fontSize: 12, fontWeight: '700' }}>
            {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend Verification Code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
          <Text style={styles.primaryButtonText}>Verify & Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 480, backgroundColor: '#FAF8F5', padding: 32, borderRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  iconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconEmoji: { fontSize: 26 },
  title: { fontSize: 24, fontWeight: '800', color: '#1E1B4B' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  phoneHighlight: { color: '#4F46E5', fontWeight: '700' },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  otpBox: { width: 48, height: 52, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', borderRadius: 14, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#1E1B4B' },
  resendBtn: { marginBottom: 20 },
  primaryButton: { backgroundColor: '#6366F1', width: '100%', paddingVertical: 15, borderRadius: 18, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});