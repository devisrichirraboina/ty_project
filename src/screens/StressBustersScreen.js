import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  TextInput,
  Platform,
  Animated,
  Easing,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole } from '../services/authGuard';
import { ChildSidebar } from '../components/ChildSidebar';

export const StressBustersScreen = ({ navigation }) => {
  useEffect(() => {
    enforceScreenRole(navigation, ['child', 'admin']);
  }, []);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const isTablet = width >= 600 && width < 900;
  const columnCount = isDesktop ? 3 : isTablet ? 2 : 1;
  const cardWidth = isDesktop ? (width >= 1100 ? '31.5%' : '48%') : isTablet ? '48%' : '100%';

  const [activeMainTab, setActiveMainTab] = useState('arcade'); // 'arcade' | 'meditation'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [streakCount, setStreakCount] = useState(5);
  const [totalMinutes, setTotalMinutes] = useState(42);
  const [activeMiniGame, setActiveMiniGame] = useState(null); // 'wheel' | 'sounds'

  // Mini-Game 1: Affirmation Spinner State
  const [spinning, setSpinning] = useState(false);
  const [currentAffirmation, setCurrentAffirmation] = useState('Tap "Spin the Wheel" to reveal your superpower mantra! 🎯');
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Mini-Game 2: Sound Oasis State & Real Web Audio Player
  const [activeSounds, setActiveSounds] = useState({
    rain: false,
    ocean: false,
    birds: false,
    fire: false,
    alpha: false
  });
  const audioCtxRef = useRef(null);
  const activeOscillators = useRef({});

  const playSynthesizedAmbientSound = async (soundKey, shouldPlay) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Stop existing node for this soundKey
      if (activeOscillators.current[soundKey]) {
        try {
          const item = activeOscillators.current[soundKey];
          if (item.source) item.source.stop();
          if (item.sources) item.sources.forEach(s => { try { s.stop(); } catch(e){} });
          if (item.timer) clearInterval(item.timer);
          if (item.gain) {
            item.gain.gain.setValueAtTime(item.gain.gain.value, ctx.currentTime);
            item.gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          }
        } catch (e) {}
        delete activeOscillators.current[soundKey];
      }

      if (!shouldPlay) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (soundKey === 'rain') {
        // Continuous Pink/White Noise for realistic gentle rainfall
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();

        activeOscillators.current[soundKey] = { source: whiteNoise, gain: masterGain };
      } else if (soundKey === 'ocean') {
        // Ocean Surf with rhythmic wave swell
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.2;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 8-second wave rhythm
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(280, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        lfo.start();

        activeOscillators.current[soundKey] = { sources: [noise, lfo], gain: masterGain };
      } else if (soundKey === 'birds') {
        // Forest birds: gentle warm breeze + cheerful melodic bird chirps
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1200, ctx.currentTime);
        osc2.frequency.setValueAtTime(1800, ctx.currentTime);

        const birdGain = ctx.createGain();
        birdGain.gain.setValueAtTime(0.09, ctx.currentTime);

        osc1.connect(birdGain);
        osc2.connect(birdGain);
        birdGain.connect(masterGain);
        osc1.start();
        osc2.start();

        const chirpTimer = setInterval(() => {
          if (!audioCtxRef.current) return;
          const now = audioCtxRef.current.currentTime;
          const baseFreq = 1400 + Math.random() * 800;
          osc1.frequency.setValueAtTime(baseFreq, now);
          osc1.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.15);
          osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.3);

          osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
          osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.5 + 400, now + 0.15);
        }, 1200);

        activeOscillators.current[soundKey] = { sources: [osc1, osc2], gain: masterGain, timer: chirpTimer };
      } else if (soundKey === 'fire') {
        // Warm crackling campfire
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.15;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        const lowHum = ctx.createOscillator();
        lowHum.type = 'sine';
        lowHum.frequency.setValueAtTime(136.1, ctx.currentTime); // OM pitch
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.12, ctx.currentTime);
        lowHum.connect(humGain);
        humGain.connect(masterGain);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        lowHum.start();

        activeOscillators.current[soundKey] = { sources: [noise, lowHum], gain: masterGain };
      } else if (soundKey === 'alpha') {
        // 432Hz Pure Healing Alpha Chords & Binaural Tone
        const fundamental = 432;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const o3 = ctx.createOscillator();

        o1.type = 'sine';
        o1.frequency.setValueAtTime(fundamental, ctx.currentTime);
        o2.type = 'sine';
        o2.frequency.setValueAtTime(fundamental * 1.5, ctx.currentTime); // 648Hz (perfect fifth)
        o3.type = 'sine';
        o3.frequency.setValueAtTime(fundamental + 8, ctx.currentTime); // 8Hz alpha binaural beat

        const chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0.14, ctx.currentTime);

        o1.connect(chordGain);
        o2.connect(chordGain);
        o3.connect(chordGain);
        chordGain.connect(masterGain);

        o1.start();
        o2.start();
        o3.start();

        activeOscillators.current[soundKey] = { sources: [o1, o2, o3], gain: masterGain };
      }
    } catch (err) {
      console.log('Audio synth error:', err);
    }
  };

  const toggleSound = (soundKey) => {
    setActiveSounds(prev => {
      const nextState = !prev[soundKey];
      playSynthesizedAmbientSound(soundKey, nextState);
      return { ...prev, [soundKey]: nextState };
    });
  };

  useEffect(() => {
    return () => {
      Object.values(activeOscillators.current).forEach(item => {
        try {
          if (item.source) item.source.stop();
          if (item.sources) item.sources.forEach(s => { try { s.stop(); } catch(e){} });
          if (item.timer) clearInterval(item.timer);
        } catch (e) {}
      });
      activeOscillators.current = {};
    };
  }, []);



  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    const mantras = [
      "🌟 I am capable of overcoming any challenge with patience.",
      "💜 My heart is calm, peaceful, and full of strength.",
      "🌱 It's okay to make mistakes; I grow with each step.",
      "☀️ Today is a brand new day full of wonderful opportunities.",
      "🌸 I choose to be kind to myself and breathe deeply.",
      "🛡️ I am strong, brave, and safe in my own skin."
    ];
    Animated.sequence([
      Animated.timing(spinAnim, {
        toValue: 10,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      const picked = mantras[Math.floor(Math.random() * mantras.length)];
      setCurrentAffirmation(picked);
      setSpinning(false);
      spinAnim.setValue(0);
    });
  };

  const ALL_GAMES = [
    {
      id: 1,
      name: 'Breathe With Me',
      category: 'Breath & Body',
      emoji: '🌸',
      tag: 'CALM PACE',
      desc: 'Follow the glowing floral circle for 4-4-4 box breathing relaxation.',
      duration: '2 min',
      screen: 'BreatheWithMe',
      color: ['#EDE9FE', '#DDD6FE']
    },
    {
      id: 2,
      name: 'Bubble Break 3D',
      category: 'Action & Play',
      emoji: '🎈',
      tag: '3D POP & RELAX',
      desc: 'Multi-touch popping sensation with 3D sphere depth. Pop floating bubbles to release tension.',
      duration: '3 min',
      screen: 'BubbleBreak',
      color: ['#E0F2FE', '#BAE6FD']
    },
    {
      id: 6,
      name: 'Color Calm Studio',
      category: 'Creative Calm',
      emoji: '🎨',
      tag: 'CREATIVE SOUL',
      desc: 'Digital soothing coloring pad with calming color palettes & mandalas.',
      duration: '5 min',
      screen: 'ColorCalm',
      color: ['#FCE7F3', '#FBCFE8']
    },
    {
      id: 7,
      name: 'Zen Pebble Garden',
      category: 'Focus & Mind',
      emoji: '🪨',
      tag: 'MINDFUL STILLNESS',
      desc: 'Rake tranquil sand ripples, balance stones, and build your inner sanctuary.',
      duration: '5 min',
      screen: 'ZenGarden',
      color: ['#D1FAE5', '#A7F3D0']
    },
    {
      id: 8,
      name: 'Power Affirmation Wheel',
      category: 'Mindset & Joy',
      emoji: '🎡',
      tag: 'LUCKY SPINNER',
      desc: 'Spin the fortune wellness wheel to receive your custom superpower mantra.',
      duration: '1 min',
      miniGame: 'wheel',
      color: ['#EDE9FE', '#DDD6FE']
    },
    {
      id: 9,
      name: 'Calm Memory Match 3D',
      category: 'Focus & Mind',
      emoji: '🧠',
      tag: 'BRAIN GYM',
      desc: 'Flip 3D cards and pair peaceful wellness symbols to gently reset focus.',
      duration: '3 min',
      screen: 'CalmMemory',
      color: ['#F3E8FF', '#E9D5FF']
    }
  ];

  const CATEGORIES = ['All', 'Action & Play', 'Breath & Body', 'Focus & Mind', 'Mindset & Joy', 'Creative Calm'];

  const filteredGames = selectedCategory === 'All'
    ? ALL_GAMES
    : ALL_GAMES.filter(g => g.category === selectedCategory);

  const handleLaunchGame = (game) => {
    if (game.screen) {
      navigation.navigate(game.screen);
    } else if (game.miniGame) {
      setActiveMiniGame(game.miniGame);
    }
  };

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="Stress Busters"
          navigation={navigation}
        />
      )}

      <View style={styles.mainArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ChildDashboard');
              }
            }}
            style={styles.backBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Stress Busters Arcade 🎮</Text>
            <Text style={styles.headerSub}>12 fun, peaceful games to recharge your energy!</Text>
          </View>
          <View style={{ width: 65 }} />
        </View>

      {/* Top Segmented Mode Selector: 3D Gaming vs Meditation & Videos */}
      <View style={styles.topModeBar}>
        <TouchableOpacity
          style={[styles.modeTabBtn, activeMainTab === 'arcade' && styles.modeTabBtnActive]}
          onPress={() => setActiveMainTab('arcade')}
          activeOpacity={0.85}
        >
          <Text style={[styles.modeTabIcon, activeMainTab === 'arcade' && styles.modeTabIconActive]}>🎮</Text>
          <View>
            <Text style={[styles.modeTabTitle, activeMainTab === 'arcade' && styles.modeTabTitleActive]}>
              3D Gaming Arcade
            </Text>
            <Text style={[styles.modeTabSub, activeMainTab === 'arcade' && styles.modeTabSubActive]}>
              Interactive 3D stress busters & mini-games
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTabBtn, activeMainTab === 'meditation' && styles.modeTabBtnActive]}
          onPress={() => setActiveMainTab('meditation')}
          activeOpacity={0.85}
        >
          <Text style={[styles.modeTabIcon, activeMainTab === 'meditation' && styles.modeTabIconActive]}>🧘</Text>
          <View>
            <Text style={[styles.modeTabTitle, activeMainTab === 'meditation' && styles.modeTabTitleActive]}>
              Soulful Meditation & Videos
            </Text>
            <Text style={[styles.modeTabSub, activeMainTab === 'meditation' && styles.modeTabSubActive]}>
              Guided yoga, 432Hz soulful music & videos
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {activeMainTab === 'arcade' ? (
          <>
            {/* Arcade Stats Level Banner */}
            <View style={styles.arcadeBanner}>
              <View style={styles.arcadeBannerCol}>
                <Text style={styles.arcadeLevelBadge}>⭐ LEVEL 3 ZEN MASTER</Text>
                <Text style={styles.arcadeBannerTitle}>3D Wellness Arcade Zone</Text>
                <Text style={styles.arcadeBannerSub}>Real-time 3D sensory play to discharge tension and reset your brain.</Text>
              </View>

              <View style={styles.arcadeStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>🔥 {streakCount}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>⏱️ {totalMinutes}m</Text>
                  <Text style={styles.statLabel}>Calm Time</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>🏆 8 Ready</Text>
                  <Text style={styles.statLabel}>3D Games</Text>
                </View>
              </View>
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, isSelected && styles.catPillActive]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                      {cat} {cat === 'All' ? `(${ALL_GAMES.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3D Games Grid */}
            <View style={styles.gamesGrid}>
              {filteredGames.map(game => (
                <View key={game.id} style={[styles.cardWrapper, { width: cardWidth }]}>
                  <TouchableOpacity
                    style={styles.gameCard}
                    onPress={() => handleLaunchGame(game)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.gameCardTop}>
                      <View style={styles.gameEmojiBox}>
                        <Text style={styles.gameEmoji}>{game.emoji}</Text>
                      </View>
                      <View style={styles.gameTagBadge}>
                        <Text style={styles.gameTagText}>{game.tag}</Text>
                      </View>
                    </View>

                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDesc}>{game.desc}</Text>

                    <View style={styles.gameCardFooter}>
                      <Text style={styles.gameDurationText}>⏱️ {game.duration}</Text>
                      <TouchableOpacity
                        style={styles.playBtn}
                        onPress={() => handleLaunchGame(game)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.playBtnText}>Play Game ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* ======================================================== */
          /* DEDICATED SOULFUL MEDITATION, YOGA & VIDEO SANCTUARY     */
          /* ======================================================== */
          <View style={styles.meditationSanctuary}>
            <View style={[styles.arcadeBanner, { borderColor: '#DDD6FE', backgroundColor: '#FAF5FF' }]}>
              <View style={styles.arcadeBannerCol}>
                <Text style={[styles.arcadeLevelBadge, { color: '#6D28D9' }]}>🧘 SOULFUL SANCTUARY</Text>
                <Text style={styles.arcadeBannerTitle}>Meditation, Yoga & Soulful Music</Text>
                <Text style={styles.arcadeBannerSub}>
                  Dedicated peaceful space with 432Hz ambient frequencies, guided breathing videos, and kids yoga.
                </Text>
              </View>
              <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 8 }}>
                <Text style={{ color: '#6D28D9', fontWeight: '800', fontSize: 12 }}>🎧 Direct In-Page Player</Text>
              </View>
            </View>

            {/* Quick Interactive Ambient Sound Player Cards */}
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E1B4B', marginVertical: 14 }}>
              🌿 Live Healing Soundscapes (432Hz Synthesizer)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              {[
                { key: 'rain', name: 'Summer Rain 🌧️', desc: '174Hz deep soothing tone', color: '#E0F2FE' },
                { key: 'ocean', name: 'Ocean Tide 🌊', desc: '216Hz rhythmic swell', color: '#E0E7FF' },
                { key: 'birds', name: 'Forest Birds 🌲', desc: '528Hz peaceful vibration', color: '#DCFCE7' },
                { key: 'fire', name: 'Campfire Om 🔥', desc: '136.1Hz grounding wave', color: '#FEF3C7' },
                { key: 'alpha', name: 'Alpha Sleep 🧘', desc: '432Hz deep relaxation', color: '#F3E8FF' },
              ].map(s => {
                const on = activeSounds[s.key];
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={{
                      flex: 1,
                      minWidth: 160,
                      backgroundColor: on ? '#FAF5FF' : '#FFFFFF',
                      borderWidth: 2,
                      borderColor: on ? '#7C3AED' : '#E2E8F0',
                      borderBottomWidth: on ? 5 : 2,
                      borderBottomColor: on ? '#6D28D9' : '#E2E8F0',
                      borderRadius: 18,
                      padding: 14,
                      justifyContent: 'space-between',
                    }}
                    onPress={() => toggleSound(s.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '900', color: on ? '#7C3AED' : '#1E1B4B' }}>{s.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginVertical: 4 }}>{s.desc}</Text>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: on ? '#7C3AED' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: on ? '#FFFFFF' : '#475569' }}>
                        {on ? 'PLAYING ⏸️' : 'TAP TO PLAY ▶'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Curated Soulful YouTube Video Sanctuary */}
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E1B4B', marginBottom: 12 }}>
              📺 Curated Meditation, Yoga & Soulful Video Library
            </Text>
            <View style={{ gap: 12 }}>
              {[
                { title: 'Soulful Krishna Flute Meditation & Deep Peace (432Hz)', icon: '🪈', tag: 'SOULFUL MUSIC', desc: 'Ultra-relaxing divine flute melodies to release anxiety and calm racing thoughts.', url: 'https://www.youtube.com/results?search_query=soulful+krishna+flute+meditation+music+peaceful' },
                { title: 'Swami Ramdev Kids Yoga & Pranayama for Brain Power', icon: '🧘', tag: 'GUIDED YOGA', desc: 'Fun, gentle morning yoga poses and breathing techniques designed for children.', url: 'https://www.youtube.com/results?search_query=swami+ramdev+pranayama+for+children+stress+relief' },
                { title: 'Peaceful Nature & Soft Piano Relaxation for Sleep & Study', icon: '🎹', tag: 'CALM PIANO', desc: 'Gentle classical piano music paired with quiet forest sounds.', url: 'https://www.youtube.com/results?search_query=peaceful+piano+nature+meditation+music+relaxing' },
                { title: 'Anulom Vilom & Bhramari Pranayama Step-by-Step for Kids', icon: '🌸', tag: 'PRANAYAMA', desc: 'Alternate nostril breathing with calming bee hums to soothe frustration.', url: 'https://www.youtube.com/results?search_query=anulom+vilom+bhramari+pranayama+kids' },
                { title: 'Tibetan Singing Bowls & Alpha Brainwave Healing', icon: '🔔', tag: 'ALPHA SOUNDS', desc: 'Acoustic metal bowl resonance scientifically formulated for brain rejuvenation.', url: 'https://www.youtube.com/results?search_query=tibetan+singing+bowls+meditation+stress+relief' },
                { title: 'Guided 5-Minute Box Breathing Adventure for Children', icon: '🫁', tag: 'ANIMATED BREATH', desc: 'Cartoon animations that guide children through steady in-and-out breaths.', url: 'https://www.youtube.com/results?search_query=guided+breathing+exercise+for+children+mindfulness' },
              ].map((yt, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#EDE9FE',
                    borderBottomWidth: 4,
                    borderBottomColor: '#DDD6FE',
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#FAF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Text style={{ fontSize: 24 }}>{yt.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E1B4B' }}>{yt.title}</Text>
                      <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#7C3AED' }}>{yt.tag}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>{yt.desc}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.playBtn, { paddingHorizontal: 14, paddingVertical: 10 }]}
                    onPress={() => {
                      if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        window.open(yt.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.playBtnText}>Watch HD ▶</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      </View>

      {/* ======================================================= */}
      {/* MINI GAME MODAL 1: AFFIRMATION SPINNER WHEEL             */}
      {/* ======================================================= */}
      <Modal visible={activeMiniGame === 'wheel'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎡 Power Affirmation Wheel</Text>
              <TouchableOpacity onPress={() => setActiveMiniGame(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Animated.Text style={{ fontSize: 80, transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '1800deg'] }) }] }}>
                🎡
              </Animated.Text>
            </View>

            <View style={styles.mantraBox}>
              <Text style={styles.mantraText}>{currentAffirmation}</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionModalBtn, spinning && { opacity: 0.6 }]}
              onPress={handleSpinWheel}
              disabled={spinning}
            >
              <Text style={styles.actionModalBtnText}>
                {spinning ? 'SPINNING THE WELLNESS WHEEL... ✨' : '🎯 SPIN THE WHEEL NOW'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FDFBFF',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 16,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
  },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3E8FF', borderRadius: 12 },
  backBtnText: { color: '#7C3AED', fontSize: 14, fontWeight: '800' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '900', color: '#1E1B4B' },
  headerSub: { fontSize: 11, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  topModeBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    gap: 10,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '92%',
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  modeTabBtnActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#8B5CF6',
    borderBottomWidth: 4,
    borderBottomColor: '#6D28D9',
  },
  modeTabIcon: {
    fontSize: 26,
  },
  modeTabIconActive: {
    transform: [{ scale: 1.08 }],
  },
  modeTabTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#334155',
  },
  modeTabTitleActive: {
    color: '#6D28D9',
  },
  modeTabSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  modeTabSubActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  meditationSanctuary: {
    width: '100%',
  },
  scrollContent: { padding: 20, paddingBottom: 60, maxWidth: 1200, alignSelf: 'center', width: '100%' },

  arcadeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  arcadeBannerCol: { maxWidth: 480 },
  arcadeLevelBadge: { fontSize: 11, fontWeight: '900', color: '#7C3AED', letterSpacing: 1.5 },
  arcadeBannerTitle: { fontSize: 24, fontWeight: '900', color: '#1E1B4B', marginVertical: 4 },
  arcadeBannerSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  arcadeStatsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statBox: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '900', color: '#4C1D95' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#6D28D9', marginTop: 2 },

  categoriesBar: { marginBottom: 20 },
  catPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catPillActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  catPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catPillTextActive: { color: '#FFFFFF' },

  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cardWrapper: { marginBottom: 8 },
  gameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderBottomWidth: 6,
    borderBottomColor: '#8B5CF6',
    borderRightWidth: 3,
    borderRightColor: '#C4B5FD',
    minHeight: 230,
    justifyContent: 'space-between',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  gameCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gameEmojiBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#DDD6FE',
    borderBottomWidth: 4,
    borderBottomColor: '#C4B5FD',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  gameEmoji: { fontSize: 30 },
  gameTagBadge: { backgroundColor: '#F3E8FF', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4B5FD' },
  gameTagText: { fontSize: 10.5, fontWeight: '900', color: '#6D28D9', letterSpacing: 0.5 },

  gameName: { fontSize: 17, fontWeight: '900', color: '#1E1B4B', marginBottom: 5 },
  gameDesc: { fontSize: 12.5, color: '#475569', lineHeight: 19, marginBottom: 14, fontWeight: '500' },

  gameCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameDurationText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  playBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  playBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // Modals Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalBox: { width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF', borderRadius: 26, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E1B4B' },
  closeBtnText: { fontSize: 20, color: '#64748B', padding: 4, fontWeight: '700' },
  modalInstruction: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 14 },
  shredInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, minHeight: 110, borderWidth: 1.5, borderColor: '#E2E8F0', fontSize: 14, color: '#1E293B', textAlignVertical: 'top', marginBottom: 16 },
  shredBtn: { backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  shredBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  shredSuccessBox: { alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 18, fontWeight: '900', color: '#059669', marginVertical: 10 },
  successSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  actionModalBtn: { backgroundColor: '#7C3AED', paddingVertical: 13, borderRadius: 16, alignItems: 'center', width: '100%' },
  actionModalBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  starSkyArea: { height: 260, backgroundColor: '#1E293B', borderRadius: 20, position: 'relative', overflow: 'hidden', padding: 14, justifyContent: 'center', alignItems: 'center' },
  starSkyMantra: { position: 'absolute', top: 16, color: '#E2E8F0', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  starItem: { position: 'absolute', padding: 10 },

  jarDisplay: { alignItems: 'center', paddingVertical: 14 },
  coinsBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  jarInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E2E8F0', fontSize: 13 },
  dropCoinBtn: { backgroundColor: '#D97706', paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center' },
  dropCoinBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  gratitudeItem: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#FEF3C7' },

  mantraBox: { backgroundColor: '#FAF5FF', padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#E9D5FF', marginBottom: 18, alignItems: 'center' },
  mantraText: { fontSize: 15, fontWeight: '800', color: '#6D28D9', textAlign: 'center', lineHeight: 22 },

  soundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0' },
  soundRowActive: { borderColor: '#7C3AED', backgroundColor: '#FAF5FF' },
  soundRowTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  soundRowDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  soundToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E2E8F0' },
  soundToggleActive: { backgroundColor: '#7C3AED' }
});
