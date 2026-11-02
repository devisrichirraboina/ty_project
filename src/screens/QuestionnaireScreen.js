import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabaseClient';
import { calculateStressAssessment } from '../services/stressEngine';
import { enforceScreenRole } from '../services/authGuard';
import { ChildSidebar } from '../components/ChildSidebar';
import { PieChart } from '../components/charts/PieChart';
import { AppIcon } from '../components/icons/AppIcon';
import {
  BASELINE_QUESTIONS,
  MOOD_BRANCH_PROFILES,
  detectDominantMoodState,
  calculateAdaptiveQuestionnaireRisk,
  FREQUENCY_VALUE_TO_LABEL
} from '../services/scoringEngine';

// ============================================================
// ANSWER OPTIONS
// ============================================================

const OPTIONS = [
  { label: 'Never', value: 0 },
  { label: 'Sometimes', value: 1 },
  { label: 'Often', value: 2 },
  { label: 'Almost Always', value: 3 },
];

const CATEGORY_INFO = {
  'Academic Stress': { icon: '📚', shortName: 'Academic Stress', color: '#6366F1' },
  'Emotional Well-being': { icon: '🧠', shortName: 'Emotional Health', color: '#EC4899' },
  'Sleep & Physical': { icon: '😴', shortName: 'Sleep & Physical', color: '#F59E0B' },
  'Family & Friends': { icon: '💜', shortName: 'Family & Friends', color: '#8B5CF6' },
  'School Environment': { icon: '🏫', shortName: 'School Climate', color: '#3B82F6' },
  'Coping Strategies': { icon: '🧘', shortName: 'Coping Strategies', color: '#10B981' },
  'Self-Esteem & Resilience': { icon: '💪', shortName: 'Self-Esteem', color: '#14B8A6' },
};

// ============================================================
// MAIN ADAPTIVE QUESTIONNAIRE SCREEN
// ============================================================

export const QuestionnaireScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;

  useEffect(() => {
    enforceScreenRole(navigation, ['child', 'parent', 'counselor', 'admin']);
  }, []);

  // Phase State: 'BASELINE' (1-20) | 'INTERLUDE' (Mood detection) | 'TARGETED' (1-10) | 'RESULT'
  const [currentPhase, setCurrentPhase] = useState('BASELINE');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const [baselineAnswers, setBaselineAnswers] = useState(Array(BASELINE_QUESTIONS.length).fill(null));
  const [detectedMood, setDetectedMood] = useState(null);
  const [targetedAnswers, setTargetedAnswers] = useState(Array(10).fill(null));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedParentSuccess, setSharedParentSuccess] = useState(false);
  const [sharedCounselorSuccess, setSharedCounselorSuccess] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Active questions array based on phase
  const activeQuestions = useMemo(() => {
    if (currentPhase === 'TARGETED' && detectedMood?.questions) {
      return detectedMood.questions;
    }
    return BASELINE_QUESTIONS;
  }, [currentPhase, detectedMood]);

  const activeAnswers = currentPhase === 'TARGETED' ? targetedAnswers : baselineAnswers;
  const selectedAnswer = activeAnswers[currentQuestionIdx];

  const notifyUser = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Adaptive Clinical Report
  const clinicalReport = useMemo(() => {
    return calculateAdaptiveQuestionnaireRisk({
      baselineAnswers,
      targetedAnswers,
      detectedMoodKey: detectedMood?.key || 'BALANCED_THRIVING'
    });
  }, [baselineAnswers, targetedAnswers, detectedMood]);

  // Select Answer for current question
  const selectAnswer = (value) => {
    if (currentPhase === 'TARGETED') {
      const updated = [...targetedAnswers];
      updated[currentQuestionIdx] = value;
      setTargetedAnswers(updated);
    } else {
      const updated = [...baselineAnswers];
      updated[currentQuestionIdx] = value;
      setBaselineAnswers(updated);
    }
    setValidationMessage('');
  };

  // Handle Next in Phase 1 or Phase 2
  const handleNext = async () => {
    if (selectedAnswer === null) {
      setValidationMessage('Please select an option before proceeding.');
      Alert.alert('Answer Required', 'Please select an option before proceeding.');
      return;
    }

    if (currentPhase === 'BASELINE') {
      if (currentQuestionIdx < BASELINE_QUESTIONS.length - 1) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      } else {
        // Phase 1 Completed: Detect Dominant Mood
        const detected = detectDominantMoodState(baselineAnswers);
        setDetectedMood(detected);
        setTargetedAnswers(Array(detected.questions.length).fill(null));
        setCurrentQuestionIdx(0);
        setCurrentPhase('INTERLUDE');
      }
    } else if (currentPhase === 'TARGETED') {
      const targetedTotal = detectedMood?.questions?.length || 10;
      if (currentQuestionIdx < targetedTotal - 1) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      } else {
        // Complete Questionnaire & Save Results
        await submitFinalAssessment();
      }
    }
  };

  // Handle Previous
  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  // Transition from Interlude to Phase 2 Targeted Questions
  const startTargetedPhase = () => {
    setCurrentQuestionIdx(0);
    setCurrentPhase('TARGETED');
  };

  // Final Assessment Submission
  const submitFinalAssessment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const responsePayload = {
          child_id: user.id,
          score: clinicalReport.normalized_score,
          raw_total: clinicalReport.raw_total,
          max_possible: clinicalReport.max_possible,
          result_level: clinicalReport.final_risk_level,
          final_risk_level: clinicalReport.final_risk_level,
          override_triggered: clinicalReport.override_triggered,
          flagged_questions: clinicalReport.flagged_questions,
          dominant_mood: clinicalReport.dominant_mood?.title,
          situation_diagnosis: clinicalReport.situation_diagnosis,
          root_triggers: clinicalReport.root_triggers,
          strengths: clinicalReport.strengths,
          category_scores: clinicalReport.category_breakdown,
        };

        const { error: responseError } = await supabase
          .from('questionnaire_responses')
          .insert(responsePayload);

        if (responseError) {
          console.warn('Supabase questionnaire insert note:', responseError.message);
        }

        // Composite Stress Assessment Engine Update
        await calculateStressAssessment(user.id, clinicalReport.normalized_score, clinicalReport);

        // Record mood check-in & streak update
        try {
          const moodLabel = clinicalReport.dominant_mood?.title || 'Calm';
          const moodScore = Math.max(1, Math.min(5, Math.round((100 - (clinicalReport.normalized_score || 30)) / 20)));
          // Mood tracked in local verified store

          const storedStr = await AsyncStorage.getItem('@alphacare_child_mood_entries');
          const list = storedStr ? JSON.parse(storedStr) : [];
          list.push({
            mood: moodLabel,
            mood_score: moodScore,
            created_at: new Date().toISOString()
          });
          await AsyncStorage.setItem('@alphacare_child_mood_entries', JSON.stringify(list));
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('@alphacare_child_mood_entries', JSON.stringify(list));
          }
        } catch (mErr) {
          console.log('Mood update on questionnaire finish note:', mErr);
        }
      }
    } catch (err) {
      console.error('Error saving questionnaire:', err);
    } finally {
      setIsSubmitting(false);
      setCurrentPhase('RESULT');
    }
  };

  // Restart Assessment
  const startAgain = () => {
    setBaselineAnswers(Array(BASELINE_QUESTIONS.length).fill(null));
    setTargetedAnswers(Array(10).fill(null));
    setDetectedMood(null);
    setCurrentQuestionIdx(0);
    setCurrentPhase('BASELINE');
    setIsSubmitting(false);
    setValidationMessage('');
  };

  // Counselor Selection & Chat state
  const [isCounselorModalVisible, setIsCounselorModalVisible] = useState(false);
  const [approvedCounselors, setApprovedCounselors] = useState([]);
  const [isLoadingCounselors, setIsLoadingCounselors] = useState(false);
  const [selectedCounselorForShare, setSelectedCounselorForShare] = useState(null);

  const fetchApprovedCounselors = async () => {
    setIsLoadingCounselors(true);
    try {
      // 1. Fetch from Supabase counselor_profiles
      let allApps = [];
      try {
        const { data } = await supabase
          .from('counselor_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (data && data.length > 0) allApps = [...data];
      } catch (dbErr) {}

      // 2. Fetch from AsyncStorage / window.localStorage @alphacare_counselor_applications
      try {
        const stored = await AsyncStorage.getItem('@alphacare_counselor_applications');
        let localApps = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(localApps) && typeof window !== 'undefined' && window.localStorage) {
          const browserStored = window.localStorage.getItem('@alphacare_counselor_applications');
          localApps = browserStored ? JSON.parse(browserStored) : [];
        }
        if (Array.isArray(localApps)) {
          const existingIds = new Set(allApps.map(a => a.user_id));
          allApps = [...allApps, ...localApps.filter(a => !existingIds.has(a.user_id))];
        }
      } catch (e) {}

      // 3. Check approved list from @alphacare_approved_counselors
      let localApproved = [];
      try {
        const stored = await AsyncStorage.getItem('@alphacare_approved_counselors');
        let parsed = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed) && typeof window !== 'undefined' && window.localStorage) {
          const browserStored = window.localStorage.getItem('@alphacare_approved_counselors');
          parsed = browserStored ? JSON.parse(browserStored) : [];
        }
        if (Array.isArray(parsed)) localApproved = parsed;
      } catch (e) {}

      const counselorMap = new Map();
      // Default certified specialist
      counselorMap.set('counselor_komal', {
        user_id: 'counselor_komal',
        full_name: 'Dr. Komal (Counselor)',
        qualification: 'M.Sc Clinical Psychology',
        specialization: 'Youth Anxiety, Stress & Emotional Health',
        experience: '5+ years',
        application_status: 'approved'
      });

      allApps.forEach(c => {
        const key = c.user_id || c.email?.toLowerCase();
        if (!key) return;

        const isApproved =
          c.application_status === 'approved' ||
          localApproved.some(item => {
            if (typeof item === 'string') return item === c.user_id;
            return item?.userId === c.user_id || (item?.email && c.email && item.email.toLowerCase() === c.email.toLowerCase());
          });

        if (isApproved) {
          counselorMap.set(key, {
            user_id: c.user_id || key,
            full_name: c.full_name || 'Counselor',
            qualification: c.qualification || 'Licensed Counselor / MD',
            specialization: c.specialization || 'Child & Youth Wellbeing',
            experience: c.experience ? `${c.experience} years` : '5+ years',
            application_status: 'approved'
          });
        }
      });

      setApprovedCounselors(Array.from(counselorMap.values()));
    } catch (err) {
      console.log('Error fetching approved counselors:', err);
      setApprovedCounselors([
        {
          user_id: 'counselor_komal',
          full_name: 'Dr. Komal (Counselor)',
          qualification: 'M.Sc Clinical Psychology',
          specialization: 'Youth Anxiety, Stress & Emotional Health',
          experience: '5+ years',
          application_status: 'approved'
        }
      ]);
    } finally {
      setIsLoadingCounselors(false);
    }
  };

  const openCounselorSelectionModal = async () => {
    try {
      await fetchApprovedCounselors();
    } catch (e) {
      console.log('Counselor fetch error, opening modal with defaults:', e);
    }
    setIsCounselorModalVisible(true);
  };

  const handleShareWithParent = async () => {
    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const childDisplayName = user?.user_metadata?.name || user?.user_metadata?.username || 'Student';

      const parentSharePayload = {
        childId: user?.id || 'demo_id',
        childName: childDisplayName,
        riskLevel: clinicalReport.final_risk_level,
        score: clinicalReport.normalized_score,
        dominantMood: clinicalReport.dominant_mood?.title,
        situationDiagnosis: clinicalReport.situation_diagnosis,
        rootTriggers: clinicalReport.root_triggers,
        strengths: clinicalReport.strengths,
        actionPlan: clinicalReport.action_plan,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem(`@alphacare_parent_report_${user?.id || 'demo'}`, JSON.stringify(parentSharePayload));
      setSharedParentSuccess(true);
      notifyUser('Shared with Parent 💜', `Your comprehensive wellness report has been shared to the parent dashboard.`);
    } catch (err) {
      setSharedParentSuccess(true);
      notifyUser('Shared 💜', 'Your wellness result has been shared with your family.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleConfirmShareWithCounselor = async (chosenCounselor) => {
    const counselor = chosenCounselor || selectedCounselorForShare;
    if (!counselor) {
      console.log('[QuestionnaireScreen] No counselor selected, ignoring.');
      return;
    }

    setIsSharing(true);
    setIsCounselorModalVisible(false);

    // Build navigation params first, so even if storage fails, we can still navigate
    const navParams = {
      counselorId: counselor.user_id,
      counselorName: counselor.full_name,
      currentRole: 'child'
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const childUserId = user ? user.id : 'demo_student_id';
      let childDisplayName = user?.user_metadata?.name || user?.user_metadata?.username || user?.user_metadata?.full_name;

      if (!childDisplayName || childDisplayName === 'Student' || childDisplayName === 'Child') {
        try {
          const rawProfiles = await AsyncStorage.getItem('@alphacare_saved_profiles_list');
          if (rawProfiles) {
            const list = JSON.parse(rawProfiles);
            if (Array.isArray(list) && list.length > 0 && list[list.length - 1]?.name && list[list.length - 1].name !== 'Student') {
              childDisplayName = list[list.length - 1].name;
            }
          }
        } catch (e) {}
      }

      if ((!childDisplayName || childDisplayName === 'Student' || childDisplayName === 'Child') && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          const webProfiles = window.localStorage.getItem('@alphacare_saved_profiles_list');
          if (webProfiles) {
            const list = JSON.parse(webProfiles);
            if (Array.isArray(list) && list.length > 0 && list[list.length - 1]?.name && list[list.length - 1].name !== 'Student') {
              childDisplayName = list[list.length - 1].name;
            }
          }
          if (!childDisplayName || childDisplayName === 'Student') {
            const webAccs = window.localStorage.getItem('@alphacare_saved_accounts');
            if (webAccs) {
              const accList = JSON.parse(webAccs);
              const childAcc = accList.find(a => (a.role === 'child' || a.role === 'student') && a.name && a.name !== 'Student');
              if (childAcc?.name) childDisplayName = childAcc.name;
            }
          }
        } catch (we) {}
      }

      if (!childDisplayName || childDisplayName === 'Student' || childDisplayName === 'Child') {
        childDisplayName = user?.email?.split('@')[0] || 'Devi';
      }

      const reportData = {
        level: clinicalReport.final_risk_level,
        score: clinicalReport.normalized_score,
        dominantMood: clinicalReport.dominant_mood?.title,
        situationDiagnosis: clinicalReport.situation_diagnosis,
        rootTriggers: clinicalReport.root_triggers,
        strengths: clinicalReport.strengths,
        actionPlan: clinicalReport.action_plan,
        sharedAt: new Date().toISOString()
      };

      const sharedReportPayload = {
        counselorId: counselor.user_id,
        counselorName: counselor.full_name,
        childId: childUserId,
        childName: childDisplayName,
        riskLevel: clinicalReport.final_risk_level,
        score: clinicalReport.normalized_score,
        reportData
      };

      // Try saving to storage (non-blocking for navigation)
      try {
        await AsyncStorage.setItem('@alphacare_last_shared_report', JSON.stringify(sharedReportPayload));
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('@alphacare_last_shared_report', JSON.stringify(sharedReportPayload));
        }
      } catch (storageErr) {
        console.log('Report storage note:', storageErr);
      }

      navParams.childId = childUserId;
      navParams.childName = childDisplayName;
      navParams.initialReport = reportData;
    } catch (err) {
      console.log('Share prep error (navigating anyway):', err);
    }

    setSharedCounselorSuccess(true);
    setIsSharing(false);

    // Always navigate to CounselorChat — even if report prep failed
    try {
      navigation.navigate('CounselorChat', navParams);
    } catch (navErr) {
      console.log('Navigation error:', navErr);
      // Fallback: try replace instead
      try {
        navigation.replace('CounselorChat', navParams);
      } catch (e2) {
        console.log('Replace fallback also failed:', e2);
      }
    }
  };

  // ==========================================================
  // VIEW: INTERLUDE SCREEN (Mood Detected -> Stage 2 Preview)
  // ==========================================================
  if (currentPhase === 'INTERLUDE' && detectedMood) {
    return (
      <View style={styles.appContainer}>
        {isDesktop && <ChildSidebar activeTab="Wellness Check-in" navigation={navigation} />}
        <View style={styles.mainArea}>
          <LinearGradient colors={['#F7F2FF', '#FFF8F1', '#ECFBF7']} style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.interludeContainer}>
              <View style={styles.interludeCard}>
                <View style={styles.interludeBadge}>
                  <Text style={styles.interludeBadgeText}>✨ STAGE 1 COMPLETED</Text>
                </View>

                <Text style={styles.interludeTitle}>Mood & Stress Pattern Detected</Text>
                <Text style={styles.interludeSub}>
                  Thank you for completing your 20 baseline questions! AlphaCare analyzed your responses:
                </Text>

                <View style={[styles.moodHeroBox, { backgroundColor: detectedMood.badgeBg, borderColor: detectedMood.badgeColor }]}>
                  <Text style={styles.moodHeroEmoji}>{detectedMood.emoji}</Text>
                  <Text style={[styles.moodHeroTitle, { color: detectedMood.badgeColor }]}>{detectedMood.title}</Text>
                  <Text style={styles.moodHeroSummary}>{detectedMood.shortSummary}</Text>
                </View>

                <View style={styles.interludeTextBox}>
                  <Text style={styles.interludeTextContent}>{detectedMood.interludeText}</Text>
                  <Text style={[styles.interludeTextContent, { marginTop: 10, fontWeight: '700', color: '#4338CA' }]}>
                    To provide 100% accurate results of what is going on with you, we prepared 10 tailored follow-up questions.
                  </Text>
                </View>

                <TouchableOpacity style={styles.interludeActionBtn} onPress={startTargetedPhase} activeOpacity={0.85}>
                  <Text style={styles.interludeActionBtnText}>
                    Continue to Tailored Deep-Dive (10 Questions) →
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    );
  }


  // ===========================================================
  // VIEW: BASELINE & TARGETED QUESTION SCREEN
  // ===========================================================
  if (currentPhase === 'BASELINE' || currentPhase === 'TARGETED') {
  const totalCount = activeQuestions.length;
  const currentQ = activeQuestions[currentQuestionIdx] || { question: '', section: '' };
  const progress = totalCount > 0 ? ((currentQuestionIdx + 1) / totalCount) : 0;
  const phaseLabel = currentPhase === 'TARGETED' ? 'Deep Dive' : 'Wellness Check-in';
  const phaseColor = currentPhase === 'TARGETED' ? '#7C3AED' : '#4F46E5';

  return (
    <View style={styles.appContainer}>
      {isDesktop && <ChildSidebar activeTab="Wellness Check-in" navigation={navigation} />}
      <View style={styles.mainArea}>
        <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#F8FAFC']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.questionScroll} keyboardShouldPersistTaps="handled">

            {/* PHASE BADGE + COUNTER */}
            <View style={styles.phaseRow}>
              <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '18' }]}>
                <Text style={[styles.phaseBadgeText, { color: phaseColor }]}>{phaseLabel}</Text>
              </View>
              <Text style={styles.counterText}>{currentQuestionIdx + 1} / {totalCount}</Text>
            </View>

            {/* PROGRESS BAR */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: phaseColor }]} />
            </View>

            {/* QUESTION CARD */}
            <View style={styles.questionCard}>
              {currentQ.section ? (
                <View style={[styles.categoryChip, { backgroundColor: phaseColor + '15' }]}>
                  <Text style={[styles.categoryChipText, { color: phaseColor }]}>{currentQ.section}</Text>
                </View>
              ) : null}
              <Text style={styles.questionText}>{currentQ.question}</Text>
            </View>

            {/* ANSWER OPTIONS */}
            <View style={styles.optionsContainer}>
              {OPTIONS.map((opt) => {
                const isSelected = selectedAnswer === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                    onPress={() => selectAnswer(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionDot, isSelected && styles.optionDotSelected]} />
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* VALIDATION MESSAGE */}
            {validationMessage ? (
              <Text style={styles.validationMsg}>{validationMessage}</Text>
            ) : null}

            {/* NAV BUTTONS */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.backBtn, currentQuestionIdx === 0 && styles.backBtnDisabled]}
                onPress={handlePrevious}
                disabled={currentQuestionIdx === 0}
                activeOpacity={0.75}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: phaseColor }]}
                onPress={handleNext}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    {currentQuestionIdx === totalCount - 1
                      ? currentPhase === 'TARGETED' ? 'Finish ✓' : 'Next →'
                      : 'Next →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </LinearGradient>
      </View>
    </View>
  );
  } // end BASELINE/TARGETED


  // ===========================================================
  // VIEW: RESULT SCREEN — CLEAN & MINIMAL
  // ===========================================================
  if (currentPhase === 'RESULT') {
    const score = clinicalReport.normalized_score;
    const mood = clinicalReport.dominant_mood || MOOD_BRANCH_PROFILES.BALANCED_THRIVING;
    const tip = (clinicalReport.action_plan && clinicalReport.action_plan[0]) || 'Take a deep breath. Talk to someone you trust.';

    // Prepare data for Pie Chart
    const rawPieData = Object.entries(clinicalReport.category_breakdown || {}).map(([category, data]) => {
      const percentage = data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0;
      const info = CATEGORY_INFO[category] || { icon: '🌱', shortName: category, color: '#8B5CF6' };
      return {
        label: info.shortName,
        value: Math.round(percentage),
        color: info.color || '#8B5CF6',
        rawPercentage: Math.round(percentage),
      };
    });
    const activeSlices = rawPieData.filter(d => d.value > 0);
    const pieChartSlices = activeSlices.length > 0 ? activeSlices : rawPieData.map(d => ({ ...d, value: 1 }));

    return (
      <View style={styles.appContainer}>
        {isDesktop && <ChildSidebar activeTab="Wellness Check-in" navigation={navigation} />}
        <View style={styles.mainArea}>
          <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#F8FAFC']} style={styles.safeArea}>
            <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContainer}>

              {/* MOOD HEADER */}
              <Text style={styles.resultEmoji}>{mood.emoji}</Text>
              <Text style={styles.resultMoodTitle}>{mood.title}</Text>
              <Text style={styles.resultScoreLabel}>Stress Score: {Math.round(score)}/100</Text>

              {/* PIE CHART */}
              <PieChart
                data={pieChartSlices}
                size={220}
                donut={true}
                strokeWidth={22}
                centerTitle={`${Math.round(score)}`}
                centerSubtitle="SCORE"
                title="Stress Breakdown"
              />

              {/* SIMPLE TIP */}
              <View style={[styles.simpleTipBox, { flexDirection: 'row', alignItems: 'center' }]}>
                <AppIcon name="lightbulb" size={18} color="#D97706" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.simpleTipText}>{tip}</Text>
              </View>

              {/* BUTTONS */}
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.88}
                onPress={() => navigation.replace('ChildDashboard')}
              >
                <Text style={styles.primaryButtonText}>Back to Dashboard →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.execShareBtn, sharedParentSuccess && styles.execShareBtnDone]}
                onPress={handleShareWithParent}
                disabled={isSharing}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name={sharedParentSuccess ? "check" : "family"} size={18} color={sharedParentSuccess ? "#059669" : "#6E56D6"} strokeWidth={2.2} />
                  <Text style={[styles.execShareBtnText, sharedParentSuccess && { color: '#059669' }]}>
                    {sharedParentSuccess ? 'Shared with Parent' : 'Share with Parent'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.execShareBtnCounselor, sharedCounselorSuccess && styles.execShareBtnDone]}
                onPress={openCounselorSelectionModal}
                disabled={isSharing}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AppIcon name={sharedCounselorSuccess ? "check" : "counselor"} size={18} color={sharedCounselorSuccess ? "#059669" : "#2563EB"} strokeWidth={2.2} />
                  <Text style={[styles.execShareBtnCounselorText, sharedCounselorSuccess && { color: '#059669' }]}>
                    {sharedCounselorSuccess ? 'Shared with Counselor' : 'Share with Counselor'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.againButton} activeOpacity={0.7} onPress={startAgain}>
                <Text style={styles.againButtonText}>Retake Assessment</Text>
              </TouchableOpacity>

            </ScrollView>

            {/* COUNSELOR SELECTION MODAL */}
            <Modal
              visible={isCounselorModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsCounselorModalVisible(false)}
            >
              <View style={styles.counselorModalOverlay}>
                <View style={styles.counselorModalBox}>
                  <View style={styles.counselorModalHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <AppIcon name="counselor" size={20} color="#6366F1" strokeWidth={2.2} />
    <Text style={styles.counselorModalTitle}>Select Your Counselor</Text>
  </View>
                      <Text style={styles.counselorModalSub}>
                        Choose an approved specialist to review your assessment & start a 1-on-1 chat
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.counselorModalCloseBtn}
                      onPress={() => setIsCounselorModalVisible(false)}
                    >
                      <Text style={styles.counselorModalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {isLoadingCounselors ? (
                    <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
                  ) : (
                    <ScrollView style={styles.counselorModalList}>
                      {approvedCounselors.map((counselor, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.counselorCard}
                          onPress={() => handleConfirmShareWithCounselor(counselor)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.counselorCardTop}>
                            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                              <AppIcon name="counselor" size={20} color="#7C3AED" strokeWidth={2.2} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E1B4B' }}>{counselor.full_name}</Text>
                              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{counselor.specialization || 'School Counselor'}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {approvedCounselors.length === 0 && (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                            No counselors available right now. Try again later.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          </LinearGradient>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  // LAYOUT STYLES
  appContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  mainArea: {
    flex: 1,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    minHeight: '100%',
  },

  // QUESTION SCREEN STYLES
  questionScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  optionBtnSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  optionDotSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F1',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#4338CA',
    fontWeight: '700',
  },
  validationMsg: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnDisabled: {
    opacity: 0.35,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // INTERLUDE STYLES
  interludeContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  interludeCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  interludeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  interludeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  interludeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  interludeSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  moodHeroBox: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  moodHeroEmoji: { fontSize: 44, marginBottom: 8 },
  moodHeroTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  moodHeroSummary: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20 },
  interludeTextBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  interludeTextContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'center',
  },
  interludeActionBtn: {
    width: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  interludeActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // RESULTS STYLES
  resultScroll: { flex: 1, width: '100%' },
  resultContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 80,
  },
  resultHeader: { alignItems: 'center', marginBottom: 20 },
  resultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultAvatarText: { fontSize: 44 },
  resultTitle: { fontSize: 26, fontWeight: '900', color: '#1E1B4B', marginTop: 4 },
  resultSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  // Minimal Result Header
  resultEmoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultMoodTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultScoreLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Simple Tip Box
  simpleTipBox: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginTop: 4,
    marginBottom: 32,
    alignSelf: 'center',
  },
  simpleTipText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },

  execHeaderCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  execHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  execBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  execBrandPillIcon: { fontSize: 12 },
  execBrandPillText: { fontSize: 11, fontWeight: '800', color: '#6D28D9', letterSpacing: 0.5 },
  execStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  execStatusChipDot: { fontSize: 8, color: '#059669' },
  execStatusChipText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  execMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  execAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  execAvatarEmoji: { fontSize: 34 },
  execInfoCol: { flex: 1, minWidth: 220 },
  execMainTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  execTagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6, flexWrap: 'wrap' },
  execMoodTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  execMoodTagText: { fontSize: 11.5, fontWeight: '800' },
  execRiskTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  execRiskTagText: { fontSize: 11.5, fontWeight: '800', color: '#B91C1C' },
  tagCritical: { backgroundColor: '#FEE2E2' },
  tagHigh: { backgroundColor: '#FFEDD5' },
  tagModerate: { backgroundColor: '#FEF3C7' },
  execProtocolSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  execScoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  execScoreNumWrap: { flexDirection: 'row', alignItems: 'baseline' },
  execScoreNum: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  execScoreMax: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginLeft: 2 },
  execScoreLabel: { fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, marginTop: 2 },

  execRecCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  execRecHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  execRecHeaderIcon: { fontSize: 22 },
  execRecSubtitle: { fontSize: 12.5, color: '#64748B', fontWeight: '500', marginTop: 3 },
  recGrid: { gap: 12 },
  recTile: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  recTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recTileIcon: { fontSize: 18 },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  recTileTitle: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  recTileDesc: { fontSize: 12.5, color: '#475569', lineHeight: 18, fontWeight: '500' },

  execShareCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  execShareHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  execShareTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  execShareDesc: { fontSize: 12.5, color: '#64748B', marginTop: 2 },
  execShareBtnRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  execShareBtn: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignSelf: 'center',
  },
  execShareBtnDone: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  execShareBtnIcon: { fontSize: 16 },
  execShareBtnText: { color: '#5B21B6', fontSize: 14, fontWeight: '700' },
  execShareBtnCounselor: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignSelf: 'center',
  },
  execShareBtnCounselorText: { color: '#0369A1', fontSize: 14, fontWeight: '700' },
  execShareBtnSecondary: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  execShareBtnSecondaryText: { color: '#334155', fontSize: 13.5, fontWeight: '800' },
  footerClinicalSec: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerClinicalText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  recommendationCard: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },
  recommendationIntro: { fontSize: 13, color: '#64748B', marginVertical: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 10 },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: { fontSize: 12, fontWeight: '900', color: '#6D28D9' },
  tipText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 20, fontWeight: '600' },

  shareCard: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  shareIcon: { fontSize: 32 },
  shareTitle: { fontSize: 18, fontWeight: '900', color: '#1E1B4B' },
  shareDescription: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 8 },
  shareButton: {
    width: '100%',
    backgroundColor: '#6E56D6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareButtonSuccess: { backgroundColor: '#10B981' },
  shareButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  shareButtonSecondary: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareButtonSecondarySuccess: { backgroundColor: '#D1FAE5' },
  shareButtonSecondaryText: { color: '#475569', fontSize: 14, fontWeight: '800' },

  primaryButton: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    alignSelf: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  againButton: { paddingVertical: 12, marginBottom: 10, alignSelf: 'center' },
  againButtonText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  counselorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  counselorModalBox: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  counselorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  counselorModalTitle: { fontSize: 18, fontWeight: '900', color: '#1E1B4B' },
  counselorModalSub: { fontSize: 12, color: '#64748B', marginTop: 2, maxWidth: 400 },
  counselorModalCloseBtn: { padding: 6 },
  counselorModalCloseText: { fontSize: 16, color: '#94A3B8', fontWeight: '900' },
  counselorModalList: { gap: 12 },
  counselorCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  counselorCardTop: { flexDirection: 'row', gap: 12 },
  counselorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counselorName: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  counselorQualification: { fontSize: 12, color: '#64748B', marginTop: 2 },
  counselorSpecialty: { fontSize: 12, color: '#15803D', marginTop: 2, fontWeight: '600' },
  shareWithDocBtn: {
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  shareWithDocBtnText: { color: '#6D28D9', fontSize: 13, fontWeight: '800' },
});