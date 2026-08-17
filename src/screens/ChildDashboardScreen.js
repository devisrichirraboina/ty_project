import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const MOOD_DATA_MAP = {
  Happy: {
    risk: 'Low Risk',
    label: 'AI Status: Balanced & Healthy',
    color: '#ECFDF5',
    textColor: '#047857',
    border: '#A7F3D0',
    tipIcon: '🌟',
    tipTitle: 'Daily Positivity Boost',
    tipText: '"Keep spreading positivity! Write down 3 things that made you smile today to build your happiness streak."',
  },
  Calm: {
    risk: 'Low Risk',
    label: 'AI Status: Balanced & Relaxed',
    color: '#ECFDF5',
    textColor: '#047857',
    border: '#A7F3D0',
    tipIcon: '🧘',
    tipTitle: 'Daily Mindfulness Practice',
    tipText: '"Enjoy this moment of peace. Take a slow deep breath, stretch your arms out, and feel grounded."',
  },
  Sad: {
    risk: 'Moderate Risk',
    label: 'AI Status: Mild Emotional Stress',
    color: '#FFFBEB',
    textColor: '#B45309',
    border: '#FDE68A',
    tipIcon: '💙',
    tipTitle: 'Gentle Comfort Tip',
    tipText: '"It is okay to feel sad sometimes. Express your feelings by talking to a trusted friend or writing them down in a journal."',
  },
  Anxious: {
    risk: 'Moderate Risk',
    label: 'AI Status: Anxiety Detected',
    color: '#FFFBEB',
    textColor: '#B45309',
    border: '#FDE68A',
    tipIcon: '🌬️',
    tipTitle: 'Anxiety Relief Breathing',
    tipText: '"Try Box Breathing: Inhale slowly for 4 seconds, hold for 4 seconds, and exhale for 4 seconds. Repeat 3 times."',
  },
  Angry: {
    risk: 'High Risk',
    label: 'AI Status: High Stress Detected',
    color: '#FEF2F2',
    textColor: '#B91C1C',
    border: '#FECACA',
    tipIcon: '🧊',
    tipTitle: 'Cool Down Technique',
    tipText: '"Take a step back. Count backward slowly from 10 to 1, unclench your hands, and drink a glass of cool water."',
  },
};

const MOODS = [
  { id: 'Happy', emoji: '😊', label: 'Happy' },
  { id: 'Calm', emoji: '😌', label: 'Calm' },
  { id: 'Sad', emoji: '😢', label: 'Sad' },
  { id: 'Anxious', emoji: '😰', label: 'Anxious' },
  { id: 'Angry', emoji: '😠', label: 'Angry' },
];

export const ChildDashboardScreen = ({ navigation, route }) => {
  const [selectedMood, setSelectedMood] = useState('Happy');
  const childName = route.params?.childName || 'Mansi';

  const currentMoodData = MOOD_DATA_MAP[selectedMood];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.fullWidthLayout}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>💜 AlphaCare Wellness Center</Text>
          </View>
          <Text style={styles.greetingTitle}>Welcome back, {childName}! 👋</Text>
          <Text style={styles.greetingSub}>Here is your daily emotional wellness overview</Text>
        </View>

        {/* Daily Mood Check-in */}
        <Text style={styles.sectionTitle}>How are you feeling right now?</Text>
        <Text style={styles.sectionSub}>Select an emoji to log your mood and update AI stress analytics</Text>

        <View style={styles.moodRow}>
          {MOODS.map((item) => {
            const isSelected = selectedMood === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.moodCard, isSelected && styles.selectedMoodCard]}
                onPress={() => setSelectedMood(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{item.emoji}</Text>
                <Text style={[styles.moodLabel, isSelected && styles.selectedMoodText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status Metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: currentMoodData.color, borderColor: currentMoodData.border }]}>
            <Text style={styles.metricHeader}>PREDICTED STRESS LEVEL</Text>
            <View style={[styles.statusPill, { backgroundColor: currentMoodData.textColor }]}>
              <Text style={styles.statusPillText}>{currentMoodData.risk}</Text>
            </View>
            <Text style={[styles.metricStatus, { color: currentMoodData.textColor }]}>
              {currentMoodData.label}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.streakBox]}>
            <Text style={styles.metricHeader}>WELLNESS STREAK</Text>
            <Text style={styles.streakNumber}>🔥 5 Days</Text>
            <Text style={styles.streakSub}>Consistent daily check-ins!</Text>
          </View>
        </View>

        {/* Relaxation Tip */}
        <View style={styles.relaxationBox}>
          <View style={styles.relaxationHeaderRow}>
            <Text style={styles.relaxationIcon}>{currentMoodData.tipIcon}</Text>
            <Text style={styles.relaxationTitle}>{currentMoodData.tipTitle}</Text>
          </View>
          <Text style={styles.relaxationQuote}>{currentMoodData.tipText}</Text>
        </View>

        {/* Interactive Features */}
        <Text style={styles.sectionTitle}>Interactive AI Tools</Text>

        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => navigation.navigate('Chatbot')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.toolEmoji}>🤖</Text>
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>AI Companion Buddy</Text>
              <Text style={styles.toolDesc}>
                Real-time chat support with cyberbullying & early stress detection
              </Text>
            </View>
            <View style={styles.launchBtn}>
              <Text style={styles.launchBtnText}>Launch Buddy →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolCard, styles.quizToolCard]}
            onPress={() => navigation.navigate('Questionnaire')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.toolEmoji}>📝</Text>
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>KidCare Stress Assessment</Text>
              <Text style={styles.toolDesc}>
                Complete assessment to generate evaluation report & remedies
              </Text>
            </View>
            <View style={[styles.launchBtn, styles.quizBtn]}>
              <Text style={styles.launchBtnText}>Start Quiz →</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, alignItems: 'center' },
  fullWidthLayout: { width: '100%', maxWidth: 1100 },
  headerBar: { marginBottom: 24 },
  badgePill: { backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
  badgePillText: { color: '#6D28D9', fontWeight: '800', fontSize: 12 },
  greetingTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  greetingSub: { fontSize: 15, color: '#64748B', marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 12 },
  sectionSub: { fontSize: 13, color: '#94A3B8', marginTop: 2, marginBottom: 16 },
  moodRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  moodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  selectedMoodCard: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  moodEmoji: { fontSize: 36, marginBottom: 8 },
  moodLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  selectedMoodText: { color: '#4F46E5', fontWeight: '900' },
  metricsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metricCard: { flex: 1, padding: 24, borderRadius: 24, borderWidth: 1.5 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  statusPillText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  streakBox: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  metricHeader: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, marginBottom: 10 },
  metricStatus: { fontSize: 15, fontWeight: '800' },
  streakNumber: { fontSize: 30, fontWeight: '900', color: '#C2410C', marginVertical: 2 },
  streakSub: { fontSize: 13, color: '#9A3412', fontWeight: '700' },
  relaxationBox: { backgroundColor: '#F0F9FF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 28 },
  relaxationHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  relaxationIcon: { fontSize: 24, marginRight: 10 },
  relaxationTitle: { fontSize: 16, fontWeight: '800', color: '#0369A1' },
  relaxationQuote: { fontSize: 14, color: '#0C4A6E', fontStyle: 'italic', lineHeight: 22 },
  toolsRow: { flexDirection: 'column', gap: 14, marginTop: 8 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  quizToolCard: { borderColor: '#DDD6FE' },
  iconWrap: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  toolEmoji: { fontSize: 30 },
  toolContent: { flex: 1 },
  toolTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  toolDesc: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
  launchBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  quizBtn: { backgroundColor: '#7C3AED' },
  launchBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});