import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, useWindowDimensions, Platform, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { BarChart } from '../components/charts/BarChart';
import { AppIcon } from '../components/icons/AppIcon';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { ProfilePrivacyView } from '../components/ProfilePrivacyView';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole, clearUserAuthSession } from '../services/authGuard';

export const ChildDashboardScreen = ({ navigation, route }) => {
  const { width, height: windowHeight } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  
  const [userName, setUserName] = useState(route?.params?.childName || route?.params?.name || 'Friend');
  
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedMood, setSelectedMood] = useState(null);
  const [userStreak, setUserStreak] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [showMoodSuccess, setShowMoodSuccess] = useState(false);
  const [stressLevel, setStressLevel] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [counselorRecs, setCounselorRecs] = useState([]);

  // M11 — Consent, Privacy & Data Security State
  const [isConsentModalVisible, setIsConsentModalVisible] = useState(false);

  // M10 — Notifications & Alerts State
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // M9 — Smart Recommendation Engine State
  const [smartRecs, setSmartRecs] = useState([]);
  const [recAffirmation, setRecAffirmation] = useState(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [completedRecIds, setCompletedRecIds] = useState({});

  // M8 — Child Wellness Reports & Analytics State
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('weekly'); // 'weekly' | 'monthly'
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Recovery & Intervention Progress Tracking State
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(null);
  const [isProgressLoading, setIsProgressLoading] = useState(false);

  // Child Profile & Avatar Edit Modal State
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
  const [editNameInput, setEditNameInput] = useState(userName);
  const [editAgeInput, setEditAgeInput] = useState('11');
  const [editBioInput, setEditBioInput] = useState('Loving my creative journey on AlphaCare ✨');
  const [editFavoriteActivity, setEditFavoriteActivity] = useState('Color Calm');
  const [selectedAvatar, setSelectedAvatar] = useState('👦');
  const [userPhotoUrl, setUserPhotoUrl] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Search Bar State & Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchableItems = [
    { title: 'AI Face Emotion Scan (Camera)', type: 'AI Vision', iconName: 'camera', route: 'FacialEmotion', keywords: 'face facial emotion camera ai scan recognize stress expression' },
    { title: 'Take a Deep Breath (4-7-8)', type: 'Activity', iconName: 'flower', route: 'BreatheWithMe', keywords: 'breathe breath calm relax stress' },
    { title: 'Bubble Break (Pop Bubbles)', type: 'Game', iconName: 'sparkles', route: 'BubbleBreak', keywords: 'bubble game fun stress pop break' },
    { title: 'Color Calm (Mandala Art)', type: 'Art & Calm', iconName: 'sparkles', route: 'ColorCalm', keywords: 'color art draw painting mandala stress' },
    { title: 'Zen Sand Garden', type: 'Relaxation', iconName: 'leaf', route: 'ZenGarden', keywords: 'zen sand garden rake calm meditate' },
    { title: 'Talk to AlphaBuddy (AI Assistant)', type: 'AI Chat', iconName: 'bot', route: 'Chatbot', keywords: 'ai bot chat feelings talk help buddy' },
    { title: 'Chat with Counselor (Live Support)', type: 'Support', iconName: 'counselor', route: 'CounselorChat', keywords: 'counselor therapist doctor chat help support' },
    { title: 'My Daily Journal', type: 'Journal', iconName: 'journal', route: 'Journal', keywords: 'journal diary write thoughts feelings entry' },
    { title: 'Wellness Check-in (Quiz)', type: 'Assessment', iconName: 'check-in', route: 'Questionnaire', keywords: 'checkin test quiz assessment survey mental health' },
    { title: 'Stress Busters Arcade', type: 'Games', iconName: 'games', route: 'StressBusters', keywords: 'games play arcade distract stress busters' },
    { title: 'Your Wellness Progress', type: 'Analytics', iconName: 'progress', action: 'progress', keywords: 'progress charts history analytics mood trends' },
    { title: 'My Wellness Reports', type: 'Reports', iconName: 'reports', action: 'report', keywords: 'report weekly monthly doctor summary' },
  ];

  const filteredSearchItems = searchQuery.trim()
    ? searchableItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    const initScreen = async () => {
      const isAllowed = await enforceScreenRole(navigation, ['child', 'admin']);
      if (!isAllowed) return;
      fetchCurrentUserInfo();
      fetchRecentMoodAndStress();
      fetchSmartRecommendations();
      fetchUnreadNotifCount();
      fetchRecoveryProgress();
    };
    initScreen();
  }, []);

  const fetchCurrentUserInfo = async () => {
    try {
      const routeEmail = route?.params?.email;
      let activeEmail = routeEmail;
      if (!activeEmail) {
        activeEmail = await AsyncStorage.getItem('@alphacare_active_user_email');
      }
      if (!activeEmail) {
        const lastReg = await AsyncStorage.getItem('@alphacare_last_registered_email');
        if (lastReg && !lastReg.toLowerCase().includes('counselor') && !lastReg.toLowerCase().includes('veda')) {
          activeEmail = lastReg;
        }
      }
      const initialProvidedName = route?.params?.childName || route?.params?.name;

      const { data: { user } } = await supabase.auth.getUser();

      // Check if Supabase user is actually the logged-in child
      // (NOT a counselor or parent from a shared browser tab/session)
      const isCounselorOrParent = user && (
        user.email === 'veda.siddi@alphacare.com' ||
        user.email?.toLowerCase().includes('counselor') ||
        user.user_metadata?.role === 'counselor' ||
        user.user_metadata?.role === 'parent' ||
        (activeEmail && user.email && user.email.toLowerCase() !== activeEmail.toLowerCase())
      );

      if (user && !isCounselorOrParent) {
        const meta = user.user_metadata || {};
        const realName = meta.name || meta.username || user.email?.split('@')[0];
        if (realName) setUserName(realName);
        if (meta.avatar) setSelectedAvatar(meta.avatar);
        if (meta.customPhotoUrl) setUserPhotoUrl(meta.customPhotoUrl);
      } else if (initialProvidedName && initialProvidedName !== 'Friend' && !initialProvidedName.toLowerCase().includes('veda')) {
        setUserName(initialProvidedName);
      } else if (activeEmail) {
        const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');
        if (activeName && activeName !== 'Friend' && !activeName.toLowerCase().includes('veda')) {
          setUserName(activeName);
        } else if (activeEmail.toLowerCase() === 'chirraboinad@gmail.com') {
          setUserName('Devisri chirraboina');
        } else {
          const derivedName = activeEmail.split('@')[0];
          if (derivedName && !derivedName.toLowerCase().includes('veda')) {
            setUserName(derivedName.charAt(0).toUpperCase() + derivedName.slice(1));
          } else {
            setUserName('Devisri chirraboina');
          }
        }
      } else {
        const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');
        if (activeName && activeName !== 'Friend' && !activeName.toLowerCase().includes('veda')) {
          setUserName(activeName);
        } else {
          setUserName('Devisri chirraboina');
        }
      }

      // Check cached profile - verify it belongs to this child!
      const cached = await AsyncStorage.getItem('@alphacare_child_profile_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        const isStaleCounselorCache = (parsed.name && (parsed.name.toLowerCase().includes('veda') || parsed.name.toLowerCase().includes('siddi')));
        const isWrongEmail = parsed.email && activeEmail && parsed.email.toLowerCase() !== activeEmail.toLowerCase();

        if (isStaleCounselorCache || isWrongEmail) {
          await AsyncStorage.removeItem('@alphacare_child_profile_settings');
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('@alphacare_child_profile_settings');
          }
          setUserPhotoUrl(null);
        } else {
          if (parsed.customPhotoUrl) setUserPhotoUrl(parsed.customPhotoUrl);
          if (parsed.avatar) setSelectedAvatar(parsed.avatar);
          if (parsed.name && !isCounselorOrParent) setUserName(parsed.name);
        }
      }
    } catch (e) {
      console.log('Error fetching user info:', e);
    }
  };

  const fetchUnreadNotifCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.log('Unread count note:', e.message);
    }
  };

  const fetchSmartRecommendations = async () => {
    setIsRecLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setSmartRecs(data.recommendations);
          
          // M10: Dispatch single non-intrusive recommendation notification if top recommendation is available
          try {
            const topRec = data.recommendations[0];
            await fetch(`${apiHost}/api/notifications/trigger-alert`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                event_type: 'recommendation_ready',
                details: {
                  recipient_id: session?.user?.id,
                  recommendation_title: topRec?.title || 'Daily Wellness Reset'
                }
              })
            });
          } catch (notifErr) {
            // Non-fatal, handled gracefully
          }
        }
        if (data.ai_affirmation) {
          setRecAffirmation(data.ai_affirmation);
        }
      }
    } catch (e) {
      console.log('Recommendation API notice (graceful fallback):', e.message);
    } finally {
      setIsRecLoading(false);
    }
  };

  const handleCompleteRecommendation = async (rec) => {
    setCompletedRecIds(prev => ({ ...prev, [rec.id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      // 1. Mark recommendation as completed
      await fetch(`${apiHost}/api/recommendations/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recommendation_id: rec.id,
          helpful: true
        })
      });

      // 2. M12: Also record to wellness activity progress logs
      await fetch(`${apiHost}/api/activities/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_id: rec.id,
          activity_title: rec.title,
          category: rec.category || 'Relaxation',
          duration_seconds: 180,
          feedback: 'helpful'
        })
      });
    } catch (err) {
      console.log('Complete recommendation notice:', err.message);
    }
  };

  const fetchReportAnalytics = async (period = reportPeriod) => {
    setIsReportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();
      
      const res = await fetch(`${apiHost}/api/reports/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        // Fallback local query directly from Supabase if backend server is starting
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const daysBack = period === 'monthly' ? 30 : 7;
          const sinceMs = Date.now() - daysBack * 86400000;
          
          let localMoods = [];
          try {
            let str = await AsyncStorage.getItem('@alphacare_child_mood_entries');
            if (!str && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              str = window.localStorage.getItem('@alphacare_child_mood_entries');
            }
            if (str) localMoods = JSON.parse(str);
          } catch (e) {}

          const moods = (Array.isArray(localMoods) ? localMoods : []).filter(
            m => new Date(m.created_at || Date.now()).getTime() >= sinceMs
          );

          let sData = null;
          try {
            const { data } = await supabase
              .from('questionnaire_responses')
              .select('*')
              .eq('child_id', user.id)
              .gte('created_at', new Date(sinceMs).toISOString())
              .order('created_at', { ascending: false });
            sData = data;
          } catch (e) {}

          const avgScore = moods.length > 0 
            ? (moods.reduce((a, b) => a + (b.mood_score || 3), 0) / moods.length).toFixed(1) 
            : 3.5;

          setReportData({
            period,
            child_name: userName,
            analytics: {
              avgMoodScore: Number(avgScore),
              mostFrequentMood: selectedMood || moods[0]?.mood || 'Calm',
              totalMoodCheckins: moods.length,
              currentStressLevel: sData?.[0]?.result_level || 'Low',
              avgStressScore: sData?.[0]?.final_stress_score || 35,
              stressTrendText: 'Manageable & Grounded',
              totalAssessments: (sData || []).length,
              aiInsight: 'Your stress has been balanced this week. Continue practicing calming routines!'
            },
            moodHistory: moods,
            assessmentHistory: sData || []
          });
        }
      }
    } catch (e) {
      console.log('Error fetching child report analytics:', e);
    } finally {
      setIsReportLoading(false);
    }
  };

  const openReportModal = () => {
    setIsReportModalVisible(true);
    fetchReportAnalytics(reportPeriod);
  };

  const fetchRecoveryProgress = async () => {
    setIsProgressLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/progress/recovery`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecoveryProgress(data);
      }
    } catch (e) {
      console.log('Recovery progress notice:', e.message);
    } finally {
      setIsProgressLoading(false);
    }
  };

  const openProgressModal = () => {
    setIsProgressModalVisible(true);
    fetchRecoveryProgress();
  };

  const fetchRecentMoodAndStress = async () => {
    try {
      const routeEmail = route?.params?.email;
      const activeEmail = routeEmail || await AsyncStorage.getItem('@alphacare_active_user_email') || '';
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCounselorOrParent = 
        user.email === 'veda.siddi@alphacare.com' ||
        user.email?.toLowerCase().includes('counselor') ||
        user.user_metadata?.role === 'counselor' ||
        user.user_metadata?.role === 'parent' ||
        (activeEmail && user.email && user.email.toLowerCase() !== activeEmail.toLowerCase());

      if (!isCounselorOrParent) {
        // Fetch actual child name from metadata or child_profiles table
        const metaName = user.user_metadata?.name || user.user_metadata?.username;
        if (metaName) {
          setUserName(metaName);
        } else {
          const { data: profile } = await supabase
            .from('child_profiles')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.name) {
            setUserName(profile.name);
          }
        }
      }

      // 1. Load mood and history from reliable local storage
      let localMoodList = [];
      try {
        let localMoodsStr = await AsyncStorage.getItem('@alphacare_child_mood_entries');
        if (!localMoodsStr && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          localMoodsStr = window.localStorage.getItem('@alphacare_child_mood_entries');
        }
        if (localMoodsStr) {
          const parsed = JSON.parse(localMoodsStr);
          if (Array.isArray(parsed)) localMoodList = parsed;
        }
      } catch (lErr) {}

      if (localMoodList.length > 0 && localMoodList[0].mood) {
        setSelectedMood(localMoodList[0].mood);
      } else {
        setSelectedMood(null);
      }

      // Format 7 days mood history
      const sevenDaysAgoMs = Date.now() - 7 * 86400000;
      const recentMoods = localMoodList.filter(
        m => new Date(m.created_at || Date.now()).getTime() >= sevenDaysAgoMs
      );
      if (recentMoods.length > 0) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const formattedHistory = recentMoods.slice(0, 7).reverse().map(entry => {
          const d = new Date(entry.created_at || Date.now());
          return {
            label: days[d.getDay()],
            value: entry.mood_score || 3,
            topLabel: '•'
          };
        });
        setMoodHistory(formattedHistory);
      } else {
        setMoodHistory([]);
      }

      // Calculate streak
      if (localMoodList.length > 0) {
        const uniqueDates = new Set(
          localMoodList.map(m => new Date(m.created_at || Date.now()).toISOString().split('T')[0])
        );
        setUserStreak(Math.max(uniqueDates.size, 1));
        setTotalSessionsCompleted(localMoodList.length);
      } else {
        setUserStreak(0);
        setTotalSessionsCompleted(0);
      }

      // 2. Load stress level from real Supabase table questionnaire_responses
      let stressLevelFound = 'Low';
      try {
        if (user) {
          const { data: qData } = await supabase
            .from('questionnaire_responses')
            .select('result_level, score')
            .eq('child_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (qData) {
            stressLevelFound = qData.result_level || (qData.score > 35 ? 'Moderate' : 'Low');
          }
        }
      } catch (qErr) {}
      setStressLevel(stressLevelFound);

      const { data: recsData } = await supabase
        .from('recommendations')
        .select('*')
        .eq('child_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      let finalRecs = recsData || [];

      // Check locally stored recommendations targeted to this child
      try {
        const storedRecsStr = await AsyncStorage.getItem('@alphacare_recommendations');
        if (storedRecsStr) {
          const localRecs = JSON.parse(storedRecsStr);
          localRecs.forEach(lr => {
            if ((lr.child_id === user.id || !lr.child_id) && !finalRecs.some(r => r.id === lr.id)) {
              finalRecs.unshift(lr);
            }
          });
        }
      } catch (locRecErr) {
        console.log('Error reading local recommendations on child dashboard:', locRecErr);
      }

      setCounselorRecs(finalRecs.slice(0, 3));
    } catch (err) {
      console.log('Error fetching dashboard data:', err);
    }
  };

  const getMoodScore = (moodLabel) => {
    const scores = { Happy: 5, Calm: 4, Neutral: 3, Anxious: 2, Sad: 2, Angry: 1 };
    return scores[moodLabel] || 3;
  };

  const handleMoodSelect = async (moodLabel) => {
    setSelectedMood(moodLabel); // Update UI immediately for responsiveness
    setIsSavingMood(true);
    setShowMoodSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const childId = user ? user.id : 'demo_child_id';
      const moodScore = getMoodScore(moodLabel);

      // 1. Mood recorded locally with zero 404 network warnings

      // 2. Insert into local storage cache
      try {
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
      } catch (locErr) {}

      // 3. Increment local streak and session count
      setUserStreak(prev => Math.max(prev + 1, 1));
      setTotalSessionsCompleted(prev => prev + 1);

      setShowMoodSuccess(true);
      setTimeout(() => setShowMoodSuccess(false), 3000);
      fetchSmartRecommendations();
    } catch (err) {
      console.error('Exception saving mood:', err);
    } finally {
      setIsSavingMood(false);
    }
  };

  const sidebarItems = [
    { iconName: 'home', label: 'Home', route: 'ChildDashboard' },
    { iconName: 'camera', label: 'Face Emotion Scan', route: 'FacialEmotion' },
    { iconName: 'check-in', label: 'Wellness Check-in', route: 'Questionnaire' },
    { iconName: 'progress', label: 'Wellness Progress', action: 'open_progress' },
    { iconName: 'reports', label: 'Wellness Reports', action: 'open_reports' },
    { iconName: 'chat', label: 'Counselor Chat', route: 'CounselorChat' },
    { iconName: 'journal', label: 'My Journal', route: 'Journal' },
    { iconName: 'games', label: 'Stress Busters', route: 'StressBusters' },
    { iconName: 'bot', label: 'AI Assistant', route: 'Chatbot' },
    { iconName: 'bell', label: 'Notifications', action: 'open_notifications' },
    { iconName: 'user', label: 'Profile & Privacy', action: 'open_privacy' },
    { iconName: 'logout', label: 'Log Out', route: 'Login' },
  ];

  const moodDetails = {
    Happy: {
      title: "Radiating Happiness!",
      desc: "It's wonderful to feel happy! Keep sharing that positive energy, or try a creative activity.",
      actionLabel: "Try Color Calm ➔",
      route: "ColorCalm",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      btnBg: "#059669",
    },
    Calm: {
      title: "Peaceful & Grounded",
      desc: "Your mind is quiet and centered. Immerse yourself in the tranquility of the Zen Garden.",
      actionLabel: "Visit Zen Garden ➔",
      route: "ZenGarden",
      bg: "#F0F9FF",
      border: "#BAE6FD",
      btnBg: "#0284C7",
    },
    Neutral: {
      title: "Balanced & Steady",
      desc: "Taking it easy today? That's completely fine. A short breathing break can refresh your mind.",
      actionLabel: "2-Min Breathing ➔",
      route: "BreatheWithMe",
      bg: "#FEFCE8",
      border: "#FEF08A",
      btnBg: "#CA8A04",
    },
    Sad: {
      title: "Sending Warm Hugs",
      desc: "It's totally okay to feel sad. You don't have to go through it alone — your AI Buddy is always here to chat.",
      actionLabel: "Chat with AI Buddy ➔",
      route: "Chatbot",
      bg: "#FFF7ED",
      border: "#FED7AA",
      btnBg: "#EA580C",
    },
    Angry: {
      title: "Release the Tension",
      desc: "Feeling frustrated or overwhelmed? Let's burst some stress away with the Bubble Break game!",
      actionLabel: "Play Bubble Break ➔",
      route: "BubbleBreak",
      bg: "#FFF1F2",
      border: "#FECDD3",
      btnBg: "#E11D48",
    },
    Anxious: {
      title: "You Are Safe & Loved",
      desc: "Take a slow, deep breath in... and let it out. Let's do a gentle guided breathing rhythm together.",
      actionLabel: "Guided Breathing ➔",
      route: "BreatheWithMe",
      bg: "#FAF5FF",
      border: "#DDD6FE",
      btnBg: "#7C3AED",
    },
  };

  const handleNav = async (targetRoute) => {
    if (targetRoute === 'Login') {
      try {
        await clearUserAuthSession();
        navigation.replace('RoleSelection');
      } catch (error) {
        console.log('Error logging out:', error);
      }
      return;
    }

    if (targetRoute === 'CounselorChat') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let counselorInfo = null;
        const stored = await AsyncStorage.getItem('@alphacare_last_shared_report');
        if (stored) {
          const parsed = JSON.parse(stored);
          // ONLY use if it actually belongs to the logged-in child
          if (user && (parsed?.childId === user.id || parsed?.childName?.toLowerCase() === userName.toLowerCase())) {
            counselorInfo = parsed;
          }
        }

        navigation.navigate('CounselorChat', {
          counselorId: counselorInfo?.counselorId || null,
          counselorName: counselorInfo?.counselorName || null,
          childId: user?.id || null,
          childName: userName,
          currentRole: 'child',
          initialReport: counselorInfo?.reportData || null
        });
      } catch (e) {
        navigation.navigate('CounselorChat', {
          childName: userName,
          currentRole: 'child'
        });
      }
      return;
    }

    if (targetRoute) {
      navigation.navigate(targetRoute, { childName: userName });
    }
  };

  const Sidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.logoSection}>
        <View style={styles.logoIconCircle}>
          <AppIcon name="heart" size={20} color="#7C3AED" fill="#8B5CF6" strokeWidth={1.5} />
        </View>
        <View>
          <Text style={styles.logoText}>AlphaCare</Text>
          <Text style={styles.logoSubtext}>Smaller Worries</Text>
          <Text style={styles.logoSubtext}>Brighter Tomorrows</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.navContainer}>
        {sidebarItems.map((item) => {
          const isActive = activeTab === item.label;
          return (
            <TouchableOpacity 
              key={item.label} 
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                setActiveTab(item.label);
                if (item.action === 'open_reports') {
                  openReportModal();
                } else if (item.action === 'open_progress') {
                  openProgressModal();
                } else if (item.action === 'open_notifications') {
                  setIsNotificationModalVisible(true);
                } else if (item.action === 'open_privacy' || item.label === 'Profile & Privacy') {
                  setActiveTab('Profile & Privacy');
                } else if (item.route && item.route !== 'ChildDashboard') {
                  handleNav(item.route);
                }
              }}
            >
              <View style={styles.navIconBox}>
                <AppIcon
                  name={item.iconName}
                  size={18}
                  color={isActive ? '#7C3AED' : '#64748B'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </View>
              <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sidebarBottom}>
        <LinearGradientBg colors={['#E0F2FE', '#F3E8FF']} style={styles.youAreAmazing}>
          <Text style={styles.youAreAmazingText}>You are amazing!</Text>
          <View style={styles.bottomDecorBox}>
            <AppIcon name="leaf" size={20} color="#059669" strokeWidth={2} />
          </View>
        </LinearGradientBg>
      </View>
    </View>
  );

  const moodOptions = [
    { label: 'Happy', iconName: 'mood-happy', color: '#A7F3D0', iconColor: '#059669' },
    { label: 'Calm', iconName: 'mood-calm', color: '#BAE6FD', iconColor: '#0284C7' },
    { label: 'Neutral', iconName: 'mood-neutral', color: '#FEF08A', iconColor: '#D97706' },
    { label: 'Sad', iconName: 'mood-sad', color: '#FDBA74', iconColor: '#EA580C' },
    { label: 'Angry', iconName: 'mood-angry', color: '#FECDD3', iconColor: '#E11D48' },
    { label: 'Anxious', iconName: 'mood-anxious', color: '#DDD6FE', iconColor: '#7C3AED' }
  ];

  const getGreetingData = () => {
    const hr = new Date().getHours();
    if (hr < 12) return { text: 'Good morning', icon: 'sun', iconColor: '#F59E0B' };
    if (hr < 17) return { text: 'Good afternoon', icon: 'sun', iconColor: '#EA580C' };
    return { text: 'Good evening', icon: 'moon', iconColor: '#7C3AED' };
  };

  return (
    <View style={styles.appContainer}>
      
      {isDesktop && <Sidebar />}

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainArea}>
        
        {/* TOP NAV WITH FUNCTIONAL SEARCH */}
        <View style={styles.header}>
          <View style={{ position: 'relative', zIndex: 9999 }}>
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <AppIcon name="search" size={17} color="#94A3B8" strokeWidth={2} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search activities, feelings, games, or help..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                textContentType="none"
                accessibilityRole="search"
                name="search_query_dashboard_no_autofill"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* LIVE SEARCH RESULTS DROPDOWN */}
            {searchQuery.trim().length > 0 && (
              <View style={styles.searchDropdown}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                    {filteredSearchItems.length} matching results
                  </Text>
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '700' }}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {filteredSearchItems.length > 0 ? (
                  filteredSearchItems.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.searchResultRow}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSearchQuery('');
                        setIsSearchFocused(false);
                        if (item.action === 'progress') {
                          openProgressModal();
                        } else if (item.action === 'report') {
                          openReportModal();
                        } else if (item.route) {
                          handleNav(item.route);
                        }
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
    <AppIcon name={item.iconName || 'sparkles'} size={18} color="#7C3AED" strokeWidth={2} />
  </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{item.title}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{item.type}</Text>
                      </View>
                      <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '800' }}>Open ➔</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <View style={{ marginBottom: 6 }}><AppIcon name="search" size={24} color="#94A3B8" strokeWidth={2} /></View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>No matching activity or tool found</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Try searching "breath", "games", "counselor", or "journal"</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.bellBtn, { marginRight: 8 }]}
              onPress={() => setActiveTab('Profile & Privacy')}
              accessibilityLabel="Profile & Privacy"
            >
              <AppIcon name="shield" size={18} color="#6E56D6" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => {
                setIsNotificationModalVisible(true);
                setUnreadNotifCount(0);
              }}
            >
              <AppIcon name="bell" size={18} color="#6E56D6" strokeWidth={2} />
              {unreadNotifCount > 0 && (
                <View style={styles.notificationDot} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBadge}
              onPress={() => setActiveTab('Profile & Privacy')}
              activeOpacity={0.8}
            >
              {userPhotoUrl ? (
                <Image source={{ uri: userPhotoUrl }} style={styles.headerProfileImg} />
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <AppIcon name="user" size={16} color="#7C3AED" strokeWidth={2} />
                </View>
              )}
              <Text style={styles.profileName}>Hi, {userName}!</Text>
              <AppIcon name="pencil" size={12} color="#94A3B8" strokeWidth={2} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* WORKSPACE VIEW: PROFILE & PRIVACY VS DASHBOARD HOME */}
        {activeTab === 'Profile & Privacy' ? (
          <ProfilePrivacyView
            userName={userName}
            currentAvatar={selectedAvatar}
            currentPhotoUrl={userPhotoUrl}
            onProfileUpdated={({ name: newName, avatar: newAvatar, customPhotoUrl: newPhoto }) => {
              if (newName) setUserName(newName);
              if (newAvatar) setSelectedAvatar(newAvatar);
              setUserPhotoUrl(newPhoto !== undefined ? newPhoto : null);
            }}
            onBackToHome={() => setActiveTab('Home')}
            navigation={navigation}
          />
        ) : (
          <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
          
          {/* 1. ENHANCED WELCOME HERO BANNER */}
          <View style={styles.heroSection}>
            <View style={styles.heroLeft}>
              <View style={styles.heroBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <AppIcon name="sparkles" size={12} color="#7C3AED" strokeWidth={2.2} />
                  <Text style={styles.heroBadgeText}>SAFE & CARING SANCTUARY</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.greeting}>{getGreetingData().text} </Text>
                <View style={{ marginHorizontal: 4 }}>
                  <AppIcon name={getGreetingData().icon} size={24} color={getGreetingData().iconColor} strokeWidth={2} />
                </View>
                <Text style={styles.greeting}>, <Text style={styles.greetingName}>{userName}!</Text></Text>
              </View>
              <Text style={styles.greetingSub}>
                "Every mindful step you take nurtures inner peace and confidence."
              </Text>
              
              <TouchableOpacity 
                style={styles.streakCard} 
                onPress={() => handleNav('Questionnaire')} 
                activeOpacity={0.85}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <AppIcon name="fire" size={22} color="#EA580C" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.streakNum}>{userStreak}</Text>
                    <Text style={styles.streakText}>day wellness streak</Text>
                  </View>
                  <Text style={styles.streakMsgSub}>
                    {userStreak > 0 ? "You're doing fantastic! Keep glowing bright" : "Welcome to AlphaCare! Begin your daily reflection"}
                  </Text>
                </View>
                <View style={styles.streakArrow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.streakArrowTxt}>Check-in</Text>
                    <AppIcon name="arrow-right" size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.heroRight}>
              <Image source={require('../../assets/dashboard_purple_hero.jpg')} style={styles.heroImage} resizeMode="cover" />
            </View>
          </View>

          {/* 2. ELEVATED WELLNESS ACTIVITIES HUB (7 Modules) */}
          <View style={styles.quickActionsSection}>
            <View style={styles.quickActionsHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="sparkles" size={18} color="#7C3AED" strokeWidth={2.2} />
                <Text style={styles.sectionHeaderTitle}>Wellness & Healing Hub</Text>
              </View>
              <Text style={styles.quickActionsHeaderSub}>Choose an activity to relax, reflect, or get support</Text>
            </View>
            
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FDF2F8', borderColor: '#FCE7F3' }]} onPress={() => handleNav('FacialEmotion')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#FCE7F3' }]}>
                  <AppIcon name="camera" size={22} color="#DB2777" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>Face Scan</Text>
                <Text style={styles.actionSub}>AI Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F5F3FF', borderColor: '#EDE9FE' }]} onPress={() => handleNav('Questionnaire')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#EDE9FE' }]}>
                  <AppIcon name="clipboard" size={22} color="#7C3AED" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>Check-in</Text>
                <Text style={styles.actionSub}>2-Stage Quiz</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]} onPress={() => handleNav('Chatbot')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <AppIcon name="bot" size={22} color="#0284C7" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>AI Buddy</Text>
                <Text style={styles.actionSub}>Empathetic Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]} onPress={() => handleNav('BreatheWithMe')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#D1FAE5' }]}>
                  <AppIcon name="flower" size={22} color="#059669" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>Breathe</Text>
                <Text style={styles.actionSub}>4-7-8 Rhythms</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]} onPress={() => handleNav('Journal')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <AppIcon name="book" size={22} color="#D97706" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>My Journal</Text>
                <Text style={styles.actionSub}>Private Diary</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]} onPress={() => handleNav('StressBusters')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#F3E8FF' }]}>
                  <AppIcon name="gamepad" size={22} color="#9333EA" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>Stress Busters</Text>
                <Text style={styles.actionSub}>Relaxing Games</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]} onPress={() => handleNav('CounselorChat')} activeOpacity={0.85}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <AppIcon name="counselor" size={22} color="#2563EB" strokeWidth={2} />
                </View>
                <Text style={styles.actionTitle}>Counselor</Text>
                <Text style={styles.actionSub}>1-on-1 Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. REFINED DAILY MOOD REFLECTION & PULSE */}
          <View style={styles.moodSectionCard}>
            <View style={styles.moodSectionHeader}>
              <View>
                <Text style={styles.moodSectionTitle}>How are you feeling right now?</Text>
                <Text style={styles.moodSectionSub}>Tap any emotion to record your mood pulse & get instant personalized guidance.</Text>
              </View>
              <TouchableOpacity
                style={styles.scanFaceBadgeBtn}
                onPress={() => handleNav('FacialEmotion')}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <AppIcon name="camera" size={14} color="#7C3AED" strokeWidth={2.2} />
    <Text style={styles.scanFaceBadgeTxt}>Scan with Camera</Text>
  </View>
              </TouchableOpacity>
            </View>

            <View style={styles.moodEmojiRow}>
              {moodOptions.map(m => {
                const isSelected = selectedMood === m.label;
                return (
                  <TouchableOpacity
                    key={m.label}
                    style={[styles.moodItemBtn, isSelected && styles.moodItemBtnActive]}
                    onPress={() => handleMoodSelect(m.label)}
                    activeOpacity={0.82}
                    disabled={isSavingMood}
                  >
                    <View style={[styles.moodEmojiCircle, { backgroundColor: m.color }, isSelected && styles.moodEmojiCircleActive]}>
                      <AppIcon name={m.iconName} size={28} color={m.iconColor} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.moodItemLabel, isSelected && styles.moodItemLabelActive]}>{m.label}</Text>
                    {isSelected && <View style={styles.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Mood Guidance Box */}
            {selectedMood && moodDetails[selectedMood] && (
              <View style={[styles.moodResponseBanner, { backgroundColor: moodDetails[selectedMood].bg, borderColor: moodDetails[selectedMood].border }]}>
                <View style={{ marginRight: 14 }}>
                  <AppIcon 
                    name={moodOptions.find(m => m.label === selectedMood)?.iconName || 'mood-happy'} 
                    size={38} 
                    color={moodOptions.find(m => m.label === selectedMood)?.iconColor || '#7C3AED'} 
                    strokeWidth={2.2} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moodResponseTitle}>{moodDetails[selectedMood].title}</Text>
                  <Text style={styles.moodResponseDesc}>{moodDetails[selectedMood].desc}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.moodResponseBtn, { backgroundColor: moodDetails[selectedMood].btnBg }]}
                  onPress={() => handleNav(moodDetails[selectedMood].route)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.moodResponseBtnText}>{moodDetails[selectedMood].actionLabel}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* My 7-Day Mood History Chart (if exists) */}
            {moodHistory.length > 0 && (
              <View style={styles.moodChartContainer}>
                <BarChart
                  title="My Mood History (Last 7 Days)"
                  data={moodHistory}
                  barColor="#C4B5FD"
                  height={110}
                />
              </View>
            )}
          </View>

          {/* 4. CLEAN 2-COLUMN BOTTOM GRID */}
          <View style={styles.bottomTwoColGrid}>
            
            {/* Left Column: Recommended for You */}
            <View style={styles.recommendedSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <AppIcon name="sparkles" size={18} color="#7C3AED" strokeWidth={2.2} />
    <Text style={styles.sectionHeaderTitle}>Recommended for You</Text>
  </View>
                <TouchableOpacity onPress={fetchSmartRecommendations}>
                  <Text style={styles.refreshLink}>{isRecLoading ? 'Refreshing...' : 'Refresh ↻'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recGrid}>
                {smartRecs.length > 0 ? (
                  smartRecs.slice(0, 4).map((rec) => {
                    const isDone = completedRecIds[rec.id];
                    return (
                      <TouchableOpacity
                        key={rec.id}
                        style={[
                          styles.cleanRecCard,
                          { backgroundColor: rec.bg || '#FAF5FF', borderColor: rec.borderColor || '#E9D5FF' }
                        ]}
                        onPress={() => handleNav(rec.route || 'BreatheWithMe')}
                        activeOpacity={0.85}
                      >
                        <View style={styles.recCardHeader}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: rec.btnBg || '#7C3AED', textTransform: 'uppercase' }}>
                            {rec.category || 'Wellness'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>{rec.duration || '3 min'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: rec.btnBg ? rec.btnBg + '18' : '#FAF5FF', alignItems: 'center', justifyContent: 'center' }}>
                            <AppIcon name={rec.route === 'CounselorChat' ? 'counselor' : rec.route === 'BreatheWithMe' ? 'flower' : rec.route === 'Chatbot' ? 'bot' : 'sparkles'} size={20} color={rec.btnBg || '#7C3AED'} strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cleanRecTitle} numberOfLines={1}>{rec.title}</Text>
                            <Text style={styles.cleanRecDesc} numberOfLines={2}>{rec.explanation}</Text>
                          </View>
                        </View>
                        <View style={styles.recFooterRow}>
                          <TouchableOpacity
                            style={[styles.recStartBtn, { backgroundColor: rec.btnBg || '#7C3AED' }]}
                            onPress={() => handleNav(rec.route || 'BreatheWithMe')}
                          >
                            <Text style={styles.recStartBtnText}>Start Activity ➔</Text>
                          </TouchableOpacity>
                          {!isDone && (
                            <TouchableOpacity
                              style={styles.recCheckBtn}
                              onPress={() => handleCompleteRecommendation(rec)}
                            >
                              <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '900' }}>✓</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.cleanRecCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}
                      onPress={() => handleNav('CounselorChat')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.recCardHeader}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase' }}>Support</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Live</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="counselor" size={20} color="#7C3AED" strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cleanRecTitle}>Counselor Chat</Text>
                          <Text style={styles.cleanRecDesc}>Confidential, compassionate guidance from a child counselor.</Text>
                        </View>
                      </View>
                      <View style={styles.recFooterRow}>
                        <View style={[styles.recStartBtn, { backgroundColor: '#7C3AED' }]}>
                          <Text style={styles.recStartBtnText}>Talk to Counselor ➔</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cleanRecCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                      onPress={() => handleNav('BreatheWithMe')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.recCardHeader}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>Mindfulness</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>2 min</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="flower" size={20} color="#059669" strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cleanRecTitle}>Breathe With Me</Text>
                          <Text style={styles.cleanRecDesc}>Guided gentle breathing rhythms to ground your thoughts.</Text>
                        </View>
                      </View>
                      <View style={styles.recFooterRow}>
                        <View style={[styles.recStartBtn, { backgroundColor: '#059669' }]}>
                          <Text style={styles.recStartBtnText}>Start Breathing ➔</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Right Column: Daily Inspiration & Progress */}
            <View style={styles.sideInspirationsCol}>
              {/* Daily Affirmation Card */}
              <View style={styles.affirmationSideCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <AppIcon name="sun" size={20} color="#D97706" strokeWidth={2} />
                  <Text style={styles.cardHeaderTitle}>Today's Affirmation</Text>
                </View>
                <Text style={styles.affirmationQuote}>"I am enough. I am capable. I am proud of myself."</Text>
                <View style={styles.affirmationDivider} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="sparkles" size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.tipTextInline}>
                    "It's okay to feel your feelings. They help you grow every single day."
                  </Text>
                </View>
              </View>

              {/* Progress & Reports Summary Card */}
              <TouchableOpacity
                style={styles.progressSummaryCard}
                onPress={openProgressModal}
                activeOpacity={0.88}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={styles.progressIconWrap}>
                    <AppIcon name="progress" size={22} color="#7C3AED" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressCardTitle}>Wellness Progress & Reports</Text>
                    <Text style={styles.progressCardSub}>View your check-in streak, mood patterns & reports</Text>
                  </View>
                  <AppIcon name="arrow-right" size={18} color="#7C3AED" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>

          </View>

        </ScrollView>
        )}
      </View>

      {/* ================= M8 CHILD WELLNESS REPORT MODAL ================= */}
      <Modal visible={isReportModalVisible} animationType="slide" transparent onRequestClose={() => setIsReportModalVisible(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '90%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8
          }}>
            {/* MODAL HEADER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#26345D' }}>📊 My Wellness Report & Progress</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Personal insights and progress summary for {userName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsReportModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* PERIOD TOGGLE: WEEKLY VS MONTHLY */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginBottom: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: reportPeriod === 'weekly' ? '#FFFFFF' : 'transparent',
                  shadowOpacity: reportPeriod === 'weekly' ? 0.05 : 0
                }}
                onPress={() => {
                  setReportPeriod('weekly');
                  fetchReportAnalytics('weekly');
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: reportPeriod === 'weekly' ? '#7C3AED' : '#64748B' }}>
                  📅 Weekly Report
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: reportPeriod === 'monthly' ? '#FFFFFF' : 'transparent',
                  shadowOpacity: reportPeriod === 'monthly' ? 0.05 : 0
                }}
                onPress={() => {
                  setReportPeriod('monthly');
                  fetchReportAnalytics('monthly');
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: reportPeriod === 'monthly' ? '#7C3AED' : '#64748B' }}>
                  📆 Monthly Report
                </Text>
              </TouchableOpacity>
            </View>

            {isReportLoading ? (
              <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 12 }}>Loading your wellness report...</Text>
              </View>
            ) : (
              <ScrollView style={{ paddingRight: 4 }}>
                {/* SUMMARY CARDS */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: '#FAF5FF', borderColor: '#DDD6FE', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#7C3AED' }}>
                      {reportData?.analytics?.avgMoodScore || 4.2} / 5
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>Avg Mood</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#059669' }}>
                      {reportData?.analytics?.mostFrequentMood || selectedMood || 'Happy'}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>Top Mood</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563EB' }}>
                      {reportData?.analytics?.currentStressLevel || stressLevel || 'Low'}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>Stress Level</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#D97706' }}>
                      {reportData?.analytics?.completedActivitiesCount ?? 0}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>Activities</Text>
                  </View>
                </View>

                {/* AI WELLNESS INSIGHT */}
                <View style={{ backgroundColor: '#F5F3FF', borderColor: '#C4B5FD', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#6D28D9', marginBottom: 4 }}>
                    💡 Friendly Wellness Insight
                  </Text>
                  <Text style={{ fontSize: 13, color: '#4C1D95', lineHeight: 19 }}>
                    {reportData?.analytics?.aiInsight || "Your stress has been lower this week. Try continuing the activities that helped you feel calmer."}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 6, fontStyle: 'italic' }}>
                    Non-medical emotional guidance. Remember your trusted adults and counselors are always here for you.
                  </Text>
                </View>

                {/* 7-DAY MOOD HISTORY CHART */}
                {moodHistory.length > 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <BarChart
                      title={`${reportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Mood Progression`}
                      data={moodHistory}
                      barColor="#A78BFA"
                      height={120}
                    />
                  </View>
                )}

                {/* ASSESSMENT HISTORY SUMMARY */}
                <View style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>
                    🌿 Check-in & Coping Progress
                  </Text>
                  <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                    Total Check-ins Logged: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{reportData?.analytics?.totalMoodCheckins || moodHistory.length}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18, marginTop: 3 }}>
                    Current Trend: <Text style={{ fontWeight: '800', color: '#16A34A' }}>{reportData?.analytics?.stressTrendText || 'Steady & Healthy'}</Text>
                  </Text>
                </View>

                {/* PDF EXPORT BUTTON */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#7C3AED',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onPress={() => {
                      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
                        window.print();
                      } else {
                        Alert.alert('Report Ready', 'You can take a screenshot or print this wellness summary.');
                      }
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>🖨️ Export Report as PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 10,
                      alignItems: 'center'
                    }}
                    onPress={() => setIsReportModalVisible(false)}
                  >
                    <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* ================= RECOVERY & WELLNESS PROGRESS MODAL ================= */}
      <Modal visible={isProgressModalVisible} animationType="slide" transparent onRequestClose={() => setIsProgressModalVisible(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '90%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8
          }}>
            {/* MODAL HEADER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#14532D' }}>📈 Your Wellness Progress</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Real-time check-in milestones and trend summary for {userName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsProgressModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {isProgressLoading ? (
              <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 12 }}>Loading your progress...</Text>
              </View>
            ) : (
              <ScrollView style={{ paddingRight: 4 }}>
                {/* 4 PROGRESS KPI CARDS */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#15803D' }}>
                      {recoveryProgress?.metrics?.wellnessActivitiesCompleted ?? 0}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534', marginTop: 2 }}>Activities Done</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1D4ED8' }}>
                      {recoveryProgress?.metrics?.counselingSessionsCompleted ?? 0}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E40AF', marginTop: 2 }}>Sessions</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FAF5FF', borderColor: '#DDD6FE', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#7E22CE' }}>
                      {recoveryProgress?.metrics?.currentMoodAvg ? `${recoveryProgress.metrics.currentMoodAvg}/5` : '—'}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B21A8', marginTop: 2 }}>Mood Trend</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#B45309', marginTop: 3 }}>
                      {recoveryProgress?.evaluation?.trend || 'Active'}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E', marginTop: 4 }}>Overall State</Text>
                  </View>
                </View>

                {/* PROGRESS EVALUATION CARD */}
                <View style={{
                  backgroundColor: recoveryProgress?.evaluation?.trend === 'Improving' ? '#ECFDF5' : recoveryProgress?.evaluation?.trend === 'Needs Attention' ? '#FFFBEB' : '#F8FAFC',
                  borderColor: recoveryProgress?.evaluation?.trend === 'Improving' ? '#A7F3D0' : recoveryProgress?.evaluation?.trend === 'Needs Attention' ? '#FDE68A' : '#E2E8F0',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 14
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16 }}>{recoveryProgress?.evaluation?.trend === 'Improving' ? '🌿' : '🌱'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                      Recent Progress & Trend
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#334155', lineHeight: 19 }}>
                    {recoveryProgress?.evaluation?.progressSummary || "Continue completing wellness check-ins to build your progress history."}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic' }}>
                    Non-medical wellness progress tracking based on your recent check-ins and activities.
                  </Text>
                </View>

                {/* MOOD TREND CHART */}
                {recoveryProgress?.charts?.mood && recoveryProgress.charts.mood.length > 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <BarChart
                      title="Mood Progression (Recent Days)"
                      data={recoveryProgress.charts.mood}
                      barColor="#86EFAC"
                      height={120}
                    />
                  </View>
                )}

                {/* STRESS TREND CHART */}
                {recoveryProgress?.charts?.stress && recoveryProgress.charts.stress.length > 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <BarChart
                      title="Stress Score Milestones"
                      data={recoveryProgress.charts.stress}
                      barColor="#FCA5A5"
                      height={120}
                    />
                  </View>
                )}

                {/* COUNSELING / INTERVENTION HISTORY (REUSING MEETINGS SYSTEM) */}
                <View style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>
                    🗓️ Counseling & Check-in Sessions
                  </Text>
                  {recoveryProgress?.sessionHistory && recoveryProgress.sessionHistory.length > 0 ? (
                    recoveryProgress.sessionHistory.map((s, idx) => (
                      <View key={s.id || idx} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 8,
                        borderBottomWidth: idx !== recoveryProgress.sessionHistory.length - 1 ? 1 : 0,
                        borderBottomColor: '#F1F5F9'
                      }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{s.title}</Text>
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Date: {s.date}</Text>
                        </View>
                        <View style={{
                          backgroundColor: s.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6
                        }}>
                          <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: s.status === 'completed' ? '#166534' : '#B45309',
                            textTransform: 'capitalize'
                          }}>
                            {s.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                      No counseling sessions scheduled yet. Check-ins booked with your counselor will appear here.
                    </Text>
                  )}
                </View>

                {/* CLOSE BUTTON */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#16A34A',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center'
                    }}
                    onPress={() => setIsProgressModalVisible(false)}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* NOTIFICATION CENTER MODAL (M10) */}
      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
        navigation={navigation}
        userRole="child"
      />
    </View>
  );
};

// Simple helper to avoid expo-linear-gradient requirement for a simple background
const LinearGradientBg = ({ children, style, colors }) => (
  <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>
);

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    flexDirection: 'row',
    backgroundColor: '#FDFBFF',
    overflow: 'hidden',
  },
  
  sidebar: {
    width: 250,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRightWidth: 1,
    borderRightColor: '#F0EEF9',
    display: 'flex',
    flexDirection: 'column',
  },
  logoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bottomDecorBox: {
    marginTop: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  logoIcon: { fontSize: 32, marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#26345D' },
  logoSubtext: { fontSize: 9, color: '#6B7280', fontWeight: '600' },
  navContainer: { paddingHorizontal: 15 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 15, marginBottom: 5 },
  navItemActive: { backgroundColor: '#F3E8FF' },
  navIcon: { fontSize: 18, marginRight: 15, opacity: 0.6 },
  navIconActive: { opacity: 1 },
  navText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  navTextActive: { color: '#7656D6', fontWeight: '800' },
  sidebarBottom: { paddingHorizontal: 15, paddingTop: 10 },
  youAreAmazing: { borderRadius: 15, padding: 15, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  youAreAmazingText: { fontSize: 14, fontWeight: '800', color: '#26345D', textAlign: 'center' },
  bottomDecor: { fontSize: 30, marginTop: 10 },

  mainArea: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FDFBFF',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  mainScrollView: {
    flex: 1,
    width: '100%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingTop: 20, paddingBottom: 15, zIndex: 9999 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, width: 420, borderWidth: 1.5, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  searchBarFocused: { borderColor: '#8B5CF6', backgroundColor: '#FFFFFF', shadowOpacity: 0.08 },
  searchIcon: { marginRight: 10, fontSize: 16, opacity: 0.7 },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '600', padding: 0, outlineStyle: 'none' },
  searchDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    width: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: 380,
    overflow: 'hidden',
    zIndex: 99999
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  bellBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2, position: 'relative' },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  headerProfileImg: { width: 26, height: 26, borderRadius: 13, marginRight: 8, borderWidth: 1.5, borderColor: '#8B5CF6' },
  profileEmoji: { fontSize: 20, marginRight: 8 },
  profileName: { fontWeight: '700', color: '#26345D', marginRight: 5 },
  profileArrow: { fontSize: 10, color: '#64748B' },

  scrollContent: {
    padding: 28,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 22,
  },
  
  // 1. Clean Hero Section
  heroSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1.25,
    paddingRight: 24,
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#7C3AED',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    lineHeight: 34,
  },
  greetingName: {
    color: '#7C3AED',
  },
  greetingSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    marginBottom: 18,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  fireIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  streakNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  streakText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  streakMsgSub: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 1,
  },
  streakArrow: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginLeft: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  streakArrowTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  heroRight: {
    flex: 0.75,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F3E8FF',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  // 2. Streamlined Wellness Activities Grid
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  quickActionsHeaderRow: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
  },
  quickActionsHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: 110,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  // 3. Unified Clean Mood Section
  moodSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  moodSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  moodSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
  },
  moodSectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  scanFaceBadgeBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  scanFaceBadgeTxt: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 12,
  },
  moodEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  moodItemBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },
  moodItemBtnActive: {
    backgroundColor: '#F5F3FF',
  },
  moodEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  moodEmojiCircleActive: {
    transform: [{ scale: 1.08 }],
    borderWidth: 2.5,
    borderColor: '#7C3AED',
  },
  moodEmoji: {
    fontSize: 26,
  },
  moodItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  moodItemLabelActive: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7C3AED',
    marginTop: 4,
  },
  moodResponseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  moodResponseTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 2,
  },
  moodResponseDesc: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },
  moodResponseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginLeft: 12,
  },
  moodResponseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  moodChartContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // 4. 2-Column Bottom Grid
  bottomTwoColGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  recommendedSection: {
    flex: 1.25,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  recGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cleanRecCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  recCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleanRecTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  cleanRecDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  recFooterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  recStartBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recStartBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  recCheckBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sideInspirationsCol: {
    flex: 0.85,
    flexDirection: 'column',
    gap: 16,
  },
  affirmationSideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  affirmationQuote: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#7C3AED',
    lineHeight: 20,
    marginBottom: 10,
  },
  affirmationDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  tipTextInline: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
    fontStyle: 'italic',
  },

  progressSummaryCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  progressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  progressCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});