import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const QUIZ_DATA = [
  {
    id: 1,
    category: 'Academic Stress',
    text: 'How often do you feel overwhelmed or stressed by your schoolwork and exams?',
    options: [
      { label: 'Never - I feel completely relaxed', score: 0 },
      { label: 'Sometimes - Only during exam weeks', score: 1 },
      { label: 'Often - I struggle to keep up', score: 2 },
      { label: 'Always - I constantly feel pressure', score: 3 },
    ],
  },
  {
    id: 2,
    category: 'Emotional Well-Being',
    text: 'How frequently do you experience sudden mood changes or unexplainable sadness?',
    options: [
      { label: 'Rarely or Never', score: 0 },
      { label: 'A few times a month', score: 1 },
      { label: 'A few times a week', score: 2 },
      { label: 'Almost every single day', score: 3 },
    ],
  },
  {
    id: 3,
    category: 'Social Environment & Safety',
    text: 'Have you experienced any negative, mean, or bullying behavior online or at school?',
    options: [
      { label: 'No, everyone is supportive', score: 0 },
      { label: 'Minor disagreements occasionally', score: 1 },
      { label: 'Yes, someone was mean online', score: 2 },
      { label: 'Yes, persistent bullying', score: 3 },
    ],
  },
];

export const QuestionnaireScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sentStatus, setSentStatus] = useState('');

  const currentQ = QUIZ_DATA[currentIndex];
  const isLastQuestion = currentIndex === QUIZ_DATA.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / QUIZ_DATA.length) * 100);

  const handleSelectOption = (score) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: score }));
  };

  const handleNext = () => {
    if (answers[currentQ.id] === undefined) return;
    if (isLastQuestion) {
      setIsSubmitted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const getReportData = () => {
    const scores = Object.values(answers);
    const totalScore = scores.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
    const maxScore = QUIZ_DATA.length * 3;
    const percentage = Math.round((totalScore / maxScore) * 100);

    if (percentage > 60) {
      return {
        totalScore,
        maxScore,
        percentage,
        level: 'High Risk',
        color: '#B91C1C',
        bgColor: '#FEF2F2',
        border: '#FECACA',
        symptoms: [
          '• High academic anxiety and burnout.',
          '• Frequent mood swings and emotional fatigue.',
          '• Peer conflict or feeling unsafe online.',
        ],
        remedies: [
          '• Schedule a 1-on-1 counseling session.',
          '• Practice 10-minute deep breathing daily via Buddy AI.',
          '• Establish structured study hours with regular breaks.',
        ],
      };
    }

    if (percentage > 30) {
      return {
        totalScore,
        maxScore,
        percentage,
        level: 'Moderate Risk',
        color: '#B45309',
        bgColor: '#FFFBEB',
        border: '#FDE68A',
        symptoms: [
          '• Occasional exam pressure and sleep disruption.',
          '• Mild emotional strain during busy weeks.',
          '• Slight social hesitation or frustration.',
        ],
        remedies: [
          '• Talk through feelings daily with Buddy AI Companion.',
          '• Limit screen time 1 hour before bedtime.',
          '• Engage in sports or physical activities 3x weekly.',
        ],
      };
    }

    return {
      totalScore,
      maxScore,
      percentage,
      level: 'Low Risk',
      color: '#047857',
      bgColor: '#ECFDF5',
      border: '#A7F3D0',
      symptoms: [
        '• Balanced emotional health and good focus.',
        '• Minimal academic pressure.',
        '• Positive social interactions at school.',
      ],
      remedies: [
        '• Maintain daily mood logging on AlphaCare.',
        '• Continue healthy sleep and exercise routines.',
        '• Keep up open communication with family.',
      ],
    };
  };

  if (isSubmitted) {
    const report = getReportData();

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
          <View style={styles.reportCard}>
            <View style={styles.reportBadge}>
              <Text style={styles.reportBadgeText}>📋 EVALUATION REPORT</Text>
            </View>
            <Text style={styles.reportHeader}>KidCare Stress Assessment Report</Text>
            <Text style={styles.reportSub}>Summary generated based on completed response metrics</Text>

            <View style={[styles.scoreBox, { backgroundColor: report.bgColor, borderColor: report.border }]}>
              <Text style={[styles.riskTitle, { color: report.color }]}>{report.level}</Text>
              <Text style={styles.scoreText}>
                Stress Index: {report.totalScore} / {report.maxScore} ({report.percentage}%)
              </Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxHeader}>🩺 Identified Symptoms & Risk Factors</Text>
              {report.symptoms.map((symptom, idx) => (
                <Text key={idx} style={styles.symptomText}>{symptom}</Text>
              ))}
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxHeader}>💡 Tailored Remedies & Action Plan</Text>
              {report.remedies.map((remedy, idx) => (
                <Text key={idx} style={styles.remedyText}>{remedy}</Text>
              ))}
            </View>

            {sentStatus ? (
              <View style={styles.statusBanner}>
                <Text style={styles.statusBannerText}>✅ {sentStatus}</Text>
              </View>
            ) : null}

            <Text style={styles.shareTitle}>Dispatch Report To:</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => setSentStatus('Evaluation report and remedies sent to Parent 👨‍👩‍👧')}
              >
                <Text style={styles.shareBtnText}>👨‍👩‍👧 Send to Parent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareBtn, styles.counselorBtn]}
                onPress={() => setSentStatus('Evaluation report and remedies sent to Counselor 🧑‍⚕️')}
              >
                <Text style={styles.shareBtnText}>🧑‍⚕️ Send to Counselor</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.navigate('ChildDashboard')}
            >
              <Text style={styles.returnBtnText}>Return to Dashboard →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.quizCard}>
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Text style={styles.qCounter}>Question {currentIndex + 1} of {QUIZ_DATA.length}</Text>
            <Text style={styles.progressLabel}>{progressPercent}% Completed</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <Text style={styles.categoryBadge}>{currentQ.category}</Text>
        <Text style={styles.questionText}>{currentQ.text}</Text>

        <View style={styles.optionsList}>
          {currentQ.options.map((opt, idx) => {
            const isSelected = answers[currentQ.id] === opt.score;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optBtn, isSelected && styles.optBtnSelected]}
                onPress={() => handleSelectOption(opt.score)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optText, isSelected && styles.optTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentIndex((prev) => prev - 1)}>
              <Text style={styles.prevText}>← Back</Text>
            </TouchableOpacity>
          ) : <View />}

          <TouchableOpacity
            style={[styles.nextBtn, answers[currentQ.id] === undefined && styles.disabledBtn]}
            disabled={answers[currentQ.id] === undefined}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {isLastQuestion ? 'Submit Assessment 🚀' : 'Next Question →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', width: '100%' },
  centerContent: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' },
  quizCard: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
    marginVertical: 'auto',
  },
  reportCard: {
    width: '100%',
    maxWidth: 850,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressWrap: { marginBottom: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  qCounter: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  progressLabel: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
  progressBarTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6366F1' },
  categoryBadge: { fontSize: 12, fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', marginBottom: 6 },
  questionText: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 24, lineHeight: 28 },
  optionsList: { marginBottom: 24 },
  optBtn: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', padding: 16, borderRadius: 16, marginBottom: 10 },
  optBtnSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  optText: { fontSize: 15, fontWeight: '600', color: '#334155', textAlign: 'center' },
  optTextSelected: { color: '#4F46E5', fontWeight: '800' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prevBtn: { padding: 10 },
  prevText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  nextBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16 },
  disabledBtn: { opacity: 0.4 },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  reportBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  reportBadgeText: { color: '#6D28D9', fontWeight: '800', fontSize: 11 },
  reportHeader: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  reportSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  scoreBox: { padding: 20, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', marginBottom: 20 },
  riskTitle: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  scoreText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  sectionBox: { backgroundColor: '#F8FAFC', padding: 18, borderRadius: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionBoxHeader: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  symptomText: { fontSize: 13, color: '#334155', lineHeight: 20, marginBottom: 4, fontWeight: '600' },
  remedyText: { fontSize: 13, color: '#047857', lineHeight: 20, marginBottom: 4, fontWeight: '700' },
  statusBanner: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 14, marginBottom: 16, alignItems: 'center' },
  statusBannerText: { color: '#047857', fontWeight: '800', fontSize: 13 },
  shareTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  shareRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  shareBtn: { flex: 1, backgroundColor: '#6366F1', padding: 14, borderRadius: 16, alignItems: 'center' },
  counselorBtn: { backgroundColor: '#0284C7' },
  shareBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  returnBtn: { backgroundColor: '#0F172A', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  returnBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});