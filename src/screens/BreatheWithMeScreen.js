import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { ChildSidebar } from '../components/ChildSidebar';

export const BreatheWithMeScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, complete
  const [seconds, setSeconds] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(0.6));
  const [bearAnim] = useState(new Animated.Value(0.9));

  // Ambient Meditation Sound State
  const [selectedMusic, setSelectedMusic] = useState('rain'); // 'rain', 'forest', 'waves', 'chimes', 'off'
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const audioContextRef = React.useRef(null);
  const oscillatorRef = React.useRef(null);

  // Web Audio soothing meditation harmonic tone
  const playMeditationTone = (type) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch (e) {}
      }

      if (type === 'off') {
        setIsPlayingMusic(false);
        return;
      }

      setIsPlayingMusic(true);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Frequencies for soothing ambient tones (432Hz healing scale)
      const freqMap = {
        rain: 174,
        forest: 285,
        waves: 432,
        chimes: 528,
      };

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqMap[type] || 432, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
    } catch (e) {
      console.log('Audio tone error:', e);
    }
  };

  const toggleMusic = (soundType) => {
    if (selectedMusic === soundType && isPlayingMusic) {
      setSelectedMusic('off');
      playMeditationTone('off');
    } else {
      setSelectedMusic(soundType);
      playMeditationTone(soundType);
    }
  };

  React.useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const TOTAL_SESSION = 60; // 60 seconds

  useEffect(() => {
    let interval;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= TOTAL_SESSION - 1) {
            setIsActive(false);
            setPhase('complete');
            logBreathingCompletion();
            return TOTAL_SESSION;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive]);

  const logBreathingCompletion = async () => {
    try {
      const { supabase } = require('../services/supabaseClient');
      const { getApiHost } = require('../services/apiConfig');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      await fetch(`${apiHost}/api/activities/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_id: 'act_breathe',
          activity_title: 'Breathe With Me',
          category: 'Breathing',
          duration_seconds: 60,
          feedback: 'calming'
        })
      });
    } catch (e) {
      console.log('Breathing completion log notice:', e.message);
    }
  };

  useEffect(() => {
    if (!isActive) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(bearAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    const totalCycle = 12; // 4s inhale + 4s hold + 4s exhale = 12s total
    const currentPhaseTime = seconds % totalCycle;

    if (currentPhaseTime < 4) {
      setPhase('inhale');
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(bearAnim, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (currentPhaseTime < 8) {
      setPhase('hold');
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.timing(bearAnim, {
          toValue: 1.1,
          duration: 0,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      setPhase('exhale');
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(bearAnim, {
          toValue: 0.9,
          duration: 4000,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [seconds, isActive, scaleAnim, bearAnim]);

  const getPhaseText = () => {
    if (phase === 'ready') return 'Ready?';
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'hold') return 'Hold';
    if (phase === 'exhale') return 'Exhale';
    if (phase === 'complete') return 'Complete!';
    return '';
  };

  const getPhaseColor = () => {
    if (phase === 'ready') return '#5B50D8';
    if (phase === 'inhale') return '#FF8FB2';
    if (phase === 'hold') return '#FFB74D';
    if (phase === 'exhale') return '#80CBC4';
    if (phase === 'complete') return '#5B50D8';
    return '#5B50D8';
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const animatedCircleStyle = {
    transform: [{ scale: scaleAnim }],
  };

  const animatedBearStyle = {
    transform: [{ scale: bearAnim }],
  };

  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const contentWidth = Math.min(width - 56, 500); // Max 500px, 28px padding each side

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="Breathe With Me"
          navigation={navigation}
        />
      )}

      <View style={styles.mainArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ChildDashboard');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>

        <View>
          <Text style={styles.headerSmall}>BREATHING EXERCISE</Text>
          <Text style={styles.headerTitle}>Breathe With Me 🌸</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Intro Message */}
        {phase === 'ready' && !isActive && (
          <View style={styles.introCard}>
            <Text style={styles.introEmoji}>🌸</Text>
            <Text style={styles.introTitle}>Let's breathe together</Text>
            <Text style={styles.introText}>
              Take a 1-minute guided breathing break. Follow the bear's gentle movements and breathe at your own pace.
            </Text>
          </View>
        )}

        {/* Ambient Meditation Music Selector */}
        <View style={{
          width: contentWidth,
          alignSelf: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1.5,
          borderColor: '#EDE9FE',
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🎵</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#26345D' }}>Meditation Soundscape</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isPlayingMusic ? '#16A34A' : '#64748B' }}>
              {isPlayingMusic ? '● Sound Playing' : '○ Sound Muted'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'rain', label: 'Gentle Rain 🌧️' },
              { key: 'forest', label: 'Forest Birds 🌲' },
              { key: 'waves', label: 'Ocean Waves 🌊' },
              { key: 'chimes', label: 'Zen Chimes 🔔' },
              { key: 'off', label: 'Mute Sound 🔇' },
            ].map((snd) => {
              const active = selectedMusic === snd.key;
              return (
                <TouchableOpacity
                  key={snd.key}
                  onPress={() => toggleMusic(snd.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 12,
                    backgroundColor: active ? '#7C3AED' : '#FAF5FF',
                    borderWidth: 1,
                    borderColor: active ? '#7C3AED' : '#DDD6FE',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: active ? '#FFFFFF' : '#6D28D9',
                  }}>
                    {snd.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Main Breathing Card */}
        <View style={[styles.breathingCard, { width: contentWidth, alignSelf: 'center' }]}>
          {/* Teddy Bear & Breathing Circle */}
          <View style={styles.animationContainer}>
            {/* Breathing Circle Background */}
            <Animated.View
              style={[styles.breathingCircle, animatedCircleStyle]}
            />

            {/* Teddy Bear */}
            <Animated.View
              style={[styles.bearContainer, animatedBearStyle]}
            >
              <Text style={styles.bearEmoji}>🧸</Text>
            </Animated.View>
          </View>

          {/* Breathing Phase Indicator */}
          <Text style={[styles.phaseText, { color: getPhaseColor() }]}>
            {getPhaseText()}
          </Text>

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.elapsedTime}>{formatTime(seconds)}</Text>
            <Text style={styles.totalTime}>/ {formatTime(TOTAL_SESSION)}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(seconds / TOTAL_SESSION) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Session Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Progress</Text>
              <Text style={styles.statValue}>{Math.floor((seconds / TOTAL_SESSION) * 100)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cycles</Text>
              <Text style={styles.statValue}>{Math.floor(seconds / 12)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Breaths</Text>
              <Text style={styles.statValue}>{Math.floor(seconds / 4)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isActive && styles.primaryButtonActive,
              ]}
              onPress={() => {
                if (!isActive && phase !== 'complete') {
                  setIsActive(true);
                  if (phase === 'ready') {
                    setPhase('inhale');
                  }
                } else if (isActive) {
                  setIsActive(false);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {isActive ? '⏸️ Pause' : phase === 'complete' ? '✨ Done' : '▶️ Start'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setIsActive(false);
                setSeconds(0);
                setPhase('ready');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>🔄 Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Completion Message */}
        {phase === 'complete' && (
          <View style={[styles.completionCard, { width: contentWidth, alignSelf: 'center', marginTop: 20 }]}>
            <Text style={styles.completionEmoji}>💜</Text>
            <Text style={styles.completionTitle}>Beautiful breathing!</Text>
            <Text style={styles.completionText}>
              You completed a full minute of mindful breathing. Notice how calm you feel.
            </Text>
            <Text style={styles.completionSubtext}>Take a moment. You did great! ✨</Text>
          </View>
        )}

        {/* Breathing Guide */}
        <View style={[styles.guideCard, { width: contentWidth, alignSelf: 'center', marginTop: 28 }]}>
          <Text style={styles.guideTitle}>How Breathing Works</Text>

          <View style={styles.guideStep}>
            <Text style={styles.stepIcon}>🔵</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Inhale (4 seconds)</Text>
              <Text style={styles.stepText}>Breathe in slowly through your nose. Watch the bear expand.</Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <Text style={styles.stepIcon}>🟡</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Hold (4 seconds)</Text>
              <Text style={styles.stepText}>Pause and hold the breath gently. Stay calm.</Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <Text style={styles.stepIcon}>🟢</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Exhale (4 seconds)</Text>
              <Text style={styles.stepText}>Breathe out slowly. Watch the bear shrink down.</Text>
            </View>
          </View>

          <Text style={styles.guideTip}>💡 Tip: One full cycle takes 12 seconds. Follow your own rhythm!</Text>
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    flexDirection: 'row',
    backgroundColor: '#FDFBFF',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F7F5FF',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#F7F5FF',
  },

  header: {
    height: 78,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E5F4',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    color: '#5B50D8',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 24,
  },

  headerSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9288D5',
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#202038',
  },

  scrollView: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    minHeight: '110%',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 140,
    width: '100%',
    alignItems: 'center',
  },

  /* ================= INTRO CARD ================= */

  introCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#EDE9FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD5FF',
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
  },

  introEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#292545',
    marginBottom: 8,
    textAlign: 'center',
  },

  introText: {
    fontSize: 12,
    color: '#756F96',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ================= BREATHING CARD ================= */

  breathingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    padding: 28,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  animationContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 28,
    position: 'relative',
  },

  breathingCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F0ECFF',
    borderWidth: 2,
    borderColor: '#5B50D8',
    position: 'absolute',
  },

  bearContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  bearEmoji: {
    fontSize: 80,
  },

  phaseText: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  /* ================= TIMER ================= */

  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 18,
  },

  elapsedTime: {
    fontSize: 36,
    fontWeight: '900',
    color: '#5B50D8',
    fontFamily: 'monospace',
  },

  totalTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B91A7',
    marginLeft: 8,
    fontFamily: 'monospace',
  },

  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 18,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#5B50D8',
    borderRadius: 4,
  },

  /* ================= STATS ================= */

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  statItem: {
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B91A7',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29283E',
  },

  /* ================= CONTROLS ================= */

  controls: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  primaryButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    minWidth: 140,
    alignItems: 'center',
  },

  primaryButtonActive: {
    backgroundColor: '#5B50D8',
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    paddingHorizontal: 24,
    paddingVertical: 13,
    minWidth: 110,
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B50D8',
  },

  /* ================= COMPLETION ================= */

  completionCard: {
    backgroundColor: '#FBFAFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    padding: 24,
    alignItems: 'center',
  },

  completionEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },

  completionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5B50D8',
    marginBottom: 8,
    textAlign: 'center',
  },

  completionText: {
    fontSize: 13,
    color: '#756F96',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },

  completionSubtext: {
    fontSize: 12,
    color: '#9288D5',
    textAlign: 'center',
    fontWeight: '600',
  },

  /* ================= GUIDE ================= */

  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    padding: 22,
  },

  guideTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#29283E',
    marginBottom: 18,
  },

  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  stepIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#29283E',
    marginBottom: 3,
  },

  stepText: {
    fontSize: 11,
    color: '#756F96',
    lineHeight: 16,
  },

  guideTip: {
    fontSize: 11,
    color: '#5B50D8',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0ECFF',
  },
});
