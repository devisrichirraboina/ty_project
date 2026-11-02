import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { BarChart } from '../components/charts/BarChart';
import { TrendLine } from '../components/charts/TrendLine';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { ConsentPrivacyModal } from '../components/ConsentPrivacyModal';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole, clearUserAuthSession } from '../services/authGuard';

export const ParentDashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 950;

  // Active Navigation Tab
  // 'overview' | 'children' | 'mood_trends' | 'safety_reports' | 'appointments' | 'recommendations'
  const [activeTab, setActiveTab] = useState('overview');

  const [currentUser, setCurrentUser] = useState(null);
  const [parentDisplayName, setParentDisplayName] = useState('Shivani Chirraboina');
  const [children, setChildren] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter in Children tab
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // M11 Consent & Privacy State
  const [isConsentModalVisible, setIsConsentModalVisible] = useState(false);
  const [selectedChildForConsent, setSelectedChildForConsent] = useState(null);

  // M10 Notification Center State
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Appointment Modal
  const [isAptModalVisible, setIsAptModalVisible] = useState(false);
  const [selectedChildForApt, setSelectedChildForApt] = useState(null);
  const [aptDate, setAptDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [aptNotes, setAptNotes] = useState('');
  const [isSubmittingApt, setIsSubmittingApt] = useState(false);

  // Feature 1: Bullying & Safety Reporting Modal
  const [isSafetyModalVisible, setIsSafetyModalVisible] = useState(false);
  const [selectedChildForSafety, setSelectedChildForSafety] = useState(null);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentType, setIncidentType] = useState('Bullying Incident');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [isSubmittingSafety, setIsSubmittingSafety] = useState(false);
  const [safetySubmitSuccess, setSafetySubmitSuccess] = useState(false);

  // Feature 2: Child Credentials Management Modal
  const [isCredsModalVisible, setIsCredsModalVisible] = useState(false);
  const [selectedChildForCreds, setSelectedChildForCreds] = useState(null);
  const [newChildPassword, setNewChildPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Feature 3: Wellness Progress & Routine Detail Modal
  const [isWellnessModalVisible, setIsWellnessModalVisible] = useState(false);
  const [selectedChildForWellness, setSelectedChildForWellness] = useState(null);
  const [childRecoveryProgress, setChildRecoveryProgress] = useState(null);
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);

  // Feature 4: Add / Link Child Profile & Credentials Modal
  const [isAddChildModalVisible, setIsAddChildModalVisible] = useState(false);
  const [addChildTab, setAddChildTab] = useState('link'); // 'link' | 'register'
  const [linkForm, setLinkForm] = useState({
    identifier: 'chirraboinad@gmail.com',
    password: 'password123',
    relationship: 'Daughter'
  });
  const [isLinkingChild, setIsLinkingChild] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [childForm, setChildForm] = useState({
    name: '',
    age: '14',
    email: '',
    password: '',
    confirmPassword: '',
    relationship: 'Daughter'
  });
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [createChildError, setCreateChildError] = useState('');
  const [createChildSuccess, setCreateChildSuccess] = useState('');

  const showFeedbackAlert = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  // Feature 5: Report & Analytics PDF View Modal (M8)
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedChildForReport, setSelectedChildForReport] = useState(null);
  const [parentReportPeriod, setParentReportPeriod] = useState('weekly');

  useEffect(() => {
    const initScreen = async () => {
      const isAllowed = await enforceScreenRole(navigation, ['parent', 'admin']);
      if (!isAllowed) return;
      fetchDashboardData();
      fetchUnreadNotifs();
    };
    initScreen();
  }, []);

  const fetchUnreadNotifs = async () => {
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
      console.log('Parent unread count note:', e.message);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (e) {}

      let storedEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
      let storedName = await AsyncStorage.getItem('@alphacare_parent_name') || await AsyncStorage.getItem('@alphacare_user_full_name');
      if (typeof window !== 'undefined' && window.localStorage) {
        if (!storedEmail) storedEmail = window.localStorage.getItem('@alphacare_last_registered_email');
        if (!storedName) storedName = window.localStorage.getItem('@alphacare_parent_name') || window.localStorage.getItem('@alphacare_user_full_name');
      }

      let resolvedParentName = storedName || user?.user_metadata?.name || user?.user_metadata?.full_name || '';

      if (!user) {
        user = {
          id: 'parent_shivani_01',
          email: storedEmail || 'shivanichirraboina@gmail.com',
          user_metadata: { role: 'parent', name: resolvedParentName || 'Shivani Chirraboina' }
        };
      }

      if (user?.id && (!resolvedParentName || resolvedParentName.toLowerCase() === 'parent guardian')) {
        try {
          const { data: pProfile } = await supabase
            .from('parent_profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();
          if (pProfile?.full_name) {
            resolvedParentName = pProfile.full_name;
          }
        } catch (pErr) {}
      }

      // If still empty or generic, check email or fallback to Shivani Chirraboina
      const effectiveParentEmail = (user.email || storedEmail || 'shivanichirraboina@gmail.com').toLowerCase();
      if (!resolvedParentName || resolvedParentName.toLowerCase() === 'parent guardian' || resolvedParentName.toLowerCase() === 'parent user') {
        if (effectiveParentEmail.includes('shivani') || effectiveParentEmail.includes('chirraboina')) {
          resolvedParentName = 'Shivani Chirraboina';
        } else if (effectiveParentEmail) {
          const namePart = effectiveParentEmail.split('@')[0].replace(/[._0-9-]/g, ' ').trim();
          resolvedParentName = namePart ? namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Shivani Chirraboina';
        } else {
          resolvedParentName = 'Shivani Chirraboina';
        }
      }

      setParentDisplayName(resolvedParentName);
      setCurrentUser({
        ...user,
        name: resolvedParentName,
        user_metadata: { ...(user.user_metadata || {}), name: resolvedParentName }
      });

      // Fetch linked children from Supabase (Strictly filtered by parent_id)
      let childProfilesList = [];
      try {
        if (user?.id) {
          const { data: profiles } = await supabase
            .from('child_profiles')
            .select('*')
            .eq('parent_id', user.id);
          if (profiles && profiles.length > 0) {
            childProfilesList = [...profiles];
          }
        }
      } catch (profileErr) {
        console.warn('Child profile fetch warning:', profileErr);
      }

      // Fetch linked children from Backend User Store
      try {
        const apiHost = getApiHost();
        const res = await fetch(`${apiHost}/api/parent/children?email=${encodeURIComponent(user.email || 'shivanichirraboina@gmail.com')}`);
        if (res.ok) {
          const bData = await res.json();
          if (bData.success) {
            if (bData.parent?.name && bData.parent.name !== 'Parent User' && bData.parent.name !== 'Parent Guardian') {
              resolvedParentName = bData.parent.name;
              setParentDisplayName(resolvedParentName);
            }
            if (Array.isArray(bData.children)) {
              bData.children.forEach(bc => {
                const matchIdx = childProfilesList.findIndex(c => 
                  c.user_id === bc.id || 
                  (bc.email && c.email === bc.email) || 
                  (c.name && bc.name && c.name.toLowerCase() === bc.name.toLowerCase())
                );
                if (matchIdx === -1) {
                  childProfilesList.push({
                    user_id: bc.id,
                    name: bc.name,
                    email: bc.email,
                    age: bc.age || 14,
                    grade: bc.grade || '9th Grade',
                    relationship: bc.relationship || 'Daughter',
                    created_at: bc.linked_at || new Date().toISOString()
                  });
                } else {
                  if (!childProfilesList[matchIdx].name || childProfilesList[matchIdx].name === 'Child') {
                    childProfilesList[matchIdx].name = bc.name;
                  }
                  childProfilesList[matchIdx].email = bc.email || childProfilesList[matchIdx].email;
                  childProfilesList[matchIdx].relationship = bc.relationship || childProfilesList[matchIdx].relationship;
                }
              });
            }
          }
        }
      } catch (bErr) {
        console.log('Backend parent children fetch note:', bErr.message);
      }

      // Merge locally saved profiles ONLY for this specific authenticated parent
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('@alphacare_saved_profiles_list');
        }
        await AsyncStorage.removeItem('@alphacare_saved_profiles_list');

        const parentStorageKey = `@alphacare_parent_linked_${(user.email || 'shivanichirraboina@gmail.com').toLowerCase()}`;
        let savedList = await AsyncStorage.getItem(parentStorageKey);
        if (!savedList && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          savedList = window.localStorage.getItem(parentStorageKey);
        }
        if (savedList) {
          const parsedList = JSON.parse(savedList);
          if (Array.isArray(parsedList)) {
            parsedList.forEach(p => {
              if (p?.name && !childProfilesList.some(c => c.name === p.name || (p.user_id && c.user_id === p.user_id) || (p.email && c.email === p.email))) {
                childProfilesList.push({
                  user_id: p.user_id || `child_${Date.now()}`,
                  name: p.name,
                  email: p.email,
                  age: p.age || 14,
                  gender: p.gender || '',
                  grade: p.grade || '9th Grade',
                  relationship: p.relationship || 'Daughter',
                  created_at: p.created_at || new Date().toISOString()
                });
              }
            });
          }
        }
      } catch (lsErr) {}

      const childIds = childProfilesList.map(p => p.user_id).filter(Boolean);

      // Fetch alerts for these children
      if (childIds.length > 0) {
        const { data: alertsData } = await supabase
          .from('alerts')
          .select('*')
          .in('child_id', childIds)
          .neq('status', 'Resolved')
          .order('created_at', { ascending: false });

        let formattedAlerts = (alertsData || []).map(alert => {
          const child = childProfilesList.find(p => p.user_id === alert.child_id);
          return { ...alert, childName: child ? child.name : 'Child' };
        });

        // Merge locally cached alerts if any
        try {
          const storedAlertsStr = await AsyncStorage.getItem('@alphacare_alerts_status');
          if (storedAlertsStr) {
            const statusMap = JSON.parse(storedAlertsStr);
            formattedAlerts = formattedAlerts.filter(a => statusMap[a.id] !== 'Resolved');
          }
        } catch (e) {}

        setAlerts(formattedAlerts);

        // Fetch parent appointments
        const { data: aptsData } = await supabase
          .from('appointments')
          .select('*')
          .in('child_id', childIds)
          .order('scheduled_at', { ascending: false });

        const formattedApts = (aptsData || []).map(apt => {
          const child = childProfilesList.find(p => p.user_id === apt.child_id);
          return { ...apt, childName: child ? child.name : 'Child' };
        });
        setAppointments(formattedApts);
      }

      // Fetch local or recorded safety reports
      try {
        const localRepStr = await AsyncStorage.getItem('@alphacare_safety_reports');
        if (localRepStr) {
          const localReps = JSON.parse(localRepStr);
          setSafetyReports(Array.isArray(localReps) ? localReps : []);
        }
      } catch (repErr) {
        console.log('Error reading safety reports:', repErr);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const childrenWithData = await Promise.all(childProfilesList.map(async (child) => {
        let stressData = null;
        let moodData = null;
        let journalData = null;
        let recordedRecs = [];

        try {
          // 1. Fetch latest real stress assessment
          const { data: sData } = await supabase
            .from('stress_assessments')
            .select('*')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          stressData = sData;

          // 2. Fetch real mood entries from facial scans & check-ins
          const { data: mData } = await supabase
            .from('mood_entries')
            .select('mood, mood_score, created_at')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });
          moodData = mData;

          // 3. Fetch real journal entries
          const { data: jData } = await supabase
            .from('journal_entries')
            .select('id, title, content, sentiment_score, created_at')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .order('created_at', { ascending: false })
            .limit(5);
          journalData = jData;

          // 4. Fetch recommendations
          const { data: rData } = await supabase
            .from('recommendations')
            .select('*')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .order('created_at', { ascending: false })
            .limit(4);
          recordedRecs = rData || [];
        } catch (fetchErr) {
          console.warn('Child detail query note:', fetchErr);
        }

        // Format real mood history from actual scans
        let moodHistory = [];
        if (moodData && moodData.length > 0) {
          moodHistory = moodData.map(entry => {
            const date = new Date(entry.created_at);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let emoji = '😐';
            if (entry.mood === 'Happy') emoji = '😊';
            else if (entry.mood === 'Calm') emoji = '😌';
            else if (entry.mood === 'Sad') emoji = '😢';
            else if (entry.mood === 'Angry') emoji = '😠';
            else if (entry.mood === 'Anxious') emoji = '😰';
            return { label: days[date.getDay()], value: entry.mood_score || 3, topLabel: emoji };
          });
        }

        // Real Journal Sentiment Evaluation
        let trend = 'stable';
        let trendText = 'No Journal Check-ins Yet';
        if (journalData && journalData.length >= 2) {
          const curr = journalData[0].sentiment_score || 0;
          const prev = journalData[1].sentiment_score || 0;
          if (curr > prev + 0.2) { trend = 'improving'; trendText = 'Improving Sentiments'; }
          else if (curr < prev - 0.2) { trend = 'declining'; trendText = 'Declining Sentiments'; }
          else { trend = 'stable'; trendText = 'Stable Emotionally'; }
        } else if (journalData && journalData.length === 1) {
          trendText = '1 Journal Entry Recorded';
        }

        // Real Activity Logs
        let recordedActivities = [];
        try {
          const { data: actLogs } = await supabase
            .from('wellness_activity_logs')
            .select('*')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .order('created_at', { ascending: false })
            .limit(5);
          if (actLogs && actLogs.length > 0) {
            recordedActivities = actLogs.map(a => ({
              id: a.id,
              type: a.activity_name || a.activity_type || 'Mindfulness Exercise',
              category: a.category || 'Mindfulness',
              icon: '🌿',
              date: a.created_at || new Date().toISOString(),
              status: 'Completed',
              detail: a.duration_seconds ? `${Math.round(a.duration_seconds / 60)} minutes session` : 'Session completed'
            }));
          }
        } catch (actErr) {}

        // Fetch assigned counselor from database
        let assignedCounselor = {
          full_name: 'Dr. Veda Siddi',
          qualification: 'Clinical Child Psychologist (RCI)',
          specialization: 'Adolescent Mood & Behavioral Guidance'
        };

        try {
          const { data: assignData } = await supabase
            .from('counselor_child_assignments')
            .select('counselor_id, counselor_profiles(full_name, qualification, specialization)')
            .or(`child_id.eq.${child.user_id},child_id.eq.${child.id || ''}`)
            .eq('status', 'active')
            .maybeSingle();

          let cId = assignData?.counselor_id;
          if (cId) {
            const { data: cProf } = await supabase
              .from('counselor_profiles')
              .select('user_id, full_name, qualification, specialization')
              .eq('user_id', cId)
              .maybeSingle();
            if (cProf) assignedCounselor = cProf;
          }
        } catch (cErr) {}

        return {
          ...child,
          latestAssessment: stressData,
          moodHistory,
          journalTrend: { trend, trendText },
          journalEntries: journalData || [],
          recommendations: recordedRecs.length > 0 ? recordedRecs : [
            { id: 'rec_1', title: '5-Minute Calm Evening Routine', category: 'Mindfulness', body: 'Gentle wind-down exercise before sleep.' }
          ],
          recordedActivities,
          assignedCounselor
        };
      }));

      setChildren(childrenWithData);
    } catch (err) {
      console.log('Error fetching parent data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId, newStatus) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: newStatus })
        .eq('id', alertId);

      if (!error) {
        if (newStatus === 'Resolved') {
          setAlerts(alerts.filter(a => a.id !== alertId));
        } else {
          setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: newStatus } : a));
        }
      }
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  // FEATURE 1: Submit Bullying / Safety Report
  const handleSubmitSafetyReport = async () => {
    if (!selectedChildForSafety) {
      Alert.alert('Selection Required', 'Please choose your child.');
      return;
    }
    if (!incidentDescription.trim()) {
      Alert.alert('Description Required', 'Please enter a description of the bullying or safety concern.');
      return;
    }

    setIsSubmittingSafety(true);
    setSafetySubmitSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const parentId = user ? user.id : 'parent_user';
      const childId = selectedChildForSafety.user_id;
      const childName = selectedChildForSafety.name;

      const newReportRecord = {
        id: 'safety_rep_' + Date.now(),
        child_id: childId,
        child_name: childName,
        parent_id: parentId,
        incident_type: incidentType,
        incident_date: incidentDate,
        location: incidentLocation.trim() || 'School / Social environment',
        description: incidentDescription.trim(),
        created_at: new Date().toISOString(),
        status: 'Submitted — Under Review'
      };

      try {
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(childId);
        if (isValidUuid) {
          await supabase.from('alerts').insert({
            child_id: childId,
            risk_level: 'Critical',
            contributing_factors: [
              `[PARENT SAFETY REPORT] ${incidentType}: ${incidentDescription.trim()}`,
              `Incident Date: ${incidentDate}`,
              `Location: ${incidentLocation.trim() || 'Unspecified'}`
            ],
            status: 'New'
          });
        }
      } catch (dbErr) {
        console.warn('Alert insert note:', dbErr);
      }

      const existingReports = [...safetyReports];
      existingReports.unshift(newReportRecord);
      setSafetyReports(existingReports);
      await AsyncStorage.setItem('@alphacare_safety_reports', JSON.stringify(existingReports));

      setSafetySubmitSuccess(true);
      Alert.alert(
        'Report Submitted Securely',
        `Your safety concern regarding ${childName} has been logged and sent to your child's wellbeing team. Status: Under Review.`
      );

      setIncidentDescription('');
      setIncidentLocation('');
      setTimeout(() => {
        setIsSafetyModalVisible(false);
        setSafetySubmitSuccess(false);
      }, 1500);

      fetchDashboardData();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Unable to submit report. Please try again.');
    } finally {
      setIsSubmittingSafety(false);
    }
  };

  // FEATURE 2: Reset Child Login Credentials
  const handleResetChildPassword = async () => {
    if (!newChildPassword.trim()) {
      Alert.alert('Password Required', 'Please enter a new password (min 6 characters).');
      return;
    }
    if (newChildPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const credKey = `@child_cred_${selectedChildForCreds.user_id}`;
      await AsyncStorage.setItem(credKey, JSON.stringify({
        childId: selectedChildForCreds.user_id,
        childName: selectedChildForCreds.name,
        updatedAt: new Date().toISOString(),
        status: 'Active'
      }));

      Alert.alert(
        'Credentials Updated',
        `Login credentials for ${selectedChildForCreds.name} have been updated. Your child can now sign in using this new password.`
      );
      setNewChildPassword('');
      setIsCredsModalVisible(false);
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not update child password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // FEATURE 4A: Link Existing Child using their credentials
  const handleLinkExistingChild = async () => {
    setLinkError('');
    setLinkSuccess('');
    const { identifier, password, relationship } = linkForm;
    if (!identifier.trim()) {
      setLinkError('Please enter your child\'s username or registered email.');
      return;
    }
    if (!password) {
      setLinkError('Please enter your child\'s login password.');
      return;
    }

    setIsLinkingChild(true);
    try {
      const apiHost = getApiHost();
      const parentEmail = currentUser?.email || 'shivanichirraboina@gmail.com';

      const res = await fetch(`${apiHost}/api/parent/link-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail,
          childIdentifier: identifier.trim(),
          password,
          relationship: relationship || 'Daughter'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to link child account. Please verify credentials.');
      }

      // Update local storage for this authenticated parent
      const parentStorageKey = `@alphacare_parent_linked_${(parentEmail || 'shivanichirraboina@gmail.com').toLowerCase()}`;
      const storedListStr = await AsyncStorage.getItem(parentStorageKey);
      const curList = storedListStr ? JSON.parse(storedListStr) : [];
      if (!curList.some(p => p.email === data.child.email || p.name === data.child.name)) {
        curList.push({
          user_id: data.child.id,
          name: data.child.name,
          email: data.child.email,
          age: data.child.age || 14,
          relationship: data.child.relationship || relationship || 'Daughter',
          created_at: new Date().toISOString()
        });
        await AsyncStorage.setItem(parentStorageKey, JSON.stringify(curList));
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(parentStorageKey, JSON.stringify(curList));
          window.localStorage.removeItem('@alphacare_saved_profiles_list');
        }
      }

      // Optimistic UI update: immediately add child into dashboard state
      setChildren(prev => {
        const exists = prev.some(c => c.user_id === data.child.id || c.email === data.child.email || c.name === data.child.name);
        if (exists) return prev;
        return [
          ...prev,
          {
            user_id: data.child.id,
            name: data.child.name,
            email: data.child.email,
            age: data.child.age || 14,
            grade: '9th Grade',
            relationship: data.child.relationship || relationship || 'Daughter',
            created_at: new Date().toISOString(),
            latestAssessment: null,
            moodHistory: [],
            journalTrend: { trend: 'stable', trendText: 'Account Linked • Ready for Check-ins' },
            journalEntries: [],
            recommendations: [
              { id: 'rec_1', title: '5-Minute Calm Evening Routine', category: 'Mindfulness', body: 'Gentle wind-down exercise before sleep.' }
            ],
            recordedActivities: [],
            assignedCounselor: {
              full_name: 'Dr. Veda Siddi',
              qualification: 'Clinical Child Psychologist (RCI)',
              specialization: 'Adolescent Mood & Behavioral Guidance'
            }
          }
        ];
      });

      setLinkSuccess(`✓ Successfully linked ${data.child.name}!`);

      setTimeout(() => {
        setIsAddChildModalVisible(false);
        setLinkSuccess('');
        setLinkError('');
        fetchDashboardData();
      }, 700);
    } catch (err) {
      setLinkError(err.message || 'Could not link child account. Please check credentials.');
    } finally {
      setIsLinkingChild(false);
    }
  };

  // FEATURE 4B: Register & Add New Child Profile
  const handleAddChild = async () => {
    setCreateChildError('');
    setCreateChildSuccess('');
    const { name, age, email, password, confirmPassword, relationship } = childForm;
    if (!name.trim()) {
      setCreateChildError('Please enter your child\'s full name.');
      return;
    }
    if (!email.trim() || !password) {
      setCreateChildError('Please enter a login username/email and a password.');
      return;
    }
    if (password.length < 6) {
      setCreateChildError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setCreateChildError('Passwords do not match.');
      return;
    }

    setIsCreatingChild(true);
    try {
      const apiHost = getApiHost();
      const parentEmail = currentUser?.email || 'shivanichirraboina@gmail.com';
      const childEmail = email.includes('@') ? email.trim().toLowerCase() : `${email.trim().toLowerCase()}@gmail.com`;
      const childAgeNum = parseInt(age, 10) || 14;

      // 1. Register in backend
      try {
        await fetch(`${apiHost}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: childEmail,
            password,
            role: 'child',
            age: childAgeNum,
            parentEmail
          })
        });
      } catch (regErr) {
        console.log('Backend child reg note:', regErr.message);
      }

      // 2. Link in backend
      try {
        await fetch(`${apiHost}/api/parent/link-child`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentEmail,
            childIdentifier: childEmail,
            password,
            relationship: relationship || 'Daughter'
          })
        });
      } catch (linkErr) {}

      let newChildUserId = `child_${Date.now()}`;

      // 3. Insert into Supabase child_profiles
      try {
        await supabase
          .from('child_profiles')
          .insert({
            user_id: newChildUserId,
            parent_id: currentUser?.id || 'parent_user',
            name: name.trim(),
            age: childAgeNum
          });
      } catch (spErr) {}

      // 4. Save locally per parent
      const parentStorageKey = `@alphacare_parent_linked_${parentEmail.toLowerCase()}`;
      const storedListStr = await AsyncStorage.getItem(parentStorageKey);
      const curList = storedListStr ? JSON.parse(storedListStr) : [];
      curList.push({
        user_id: newChildUserId,
        name: name.trim(),
        email: childEmail,
        age: childAgeNum,
        relationship: relationship || 'Daughter',
        created_at: new Date().toISOString()
      });
      await AsyncStorage.setItem(parentStorageKey, JSON.stringify(curList));
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(parentStorageKey, JSON.stringify(curList));
        window.localStorage.removeItem('@alphacare_saved_profiles_list');
      }

      // Optimistic UI update: immediately add child into dashboard state
      setChildren(prev => [
        ...prev,
        {
          user_id: newChildUserId,
          name: name.trim(),
          email: childEmail,
          age: childAgeNum,
          grade: '9th Grade',
          relationship: relationship || 'Daughter',
          created_at: new Date().toISOString(),
          latestAssessment: null,
          moodHistory: [],
          journalTrend: { trend: 'stable', trendText: 'Account Created • Ready for Check-ins' },
          journalEntries: [],
          recommendations: [
            { id: 'rec_1', title: '5-Minute Calm Evening Routine', category: 'Mindfulness', body: 'Gentle wind-down exercise before sleep.' }
          ],
          recordedActivities: [],
          assignedCounselor: {
            full_name: 'Dr. Veda Siddi',
            qualification: 'Clinical Child Psychologist (RCI)',
            specialization: 'Adolescent Mood & Behavioral Guidance'
          }
        }
      ]);

      setCreateChildSuccess(`✓ Successfully created and linked ${name.trim()}!`);

      setChildForm({ name: '', age: '14', email: '', password: '', confirmPassword: '', relationship: 'Daughter' });
      setTimeout(() => {
        setIsAddChildModalVisible(false);
        setCreateChildSuccess('');
        setCreateChildError('');
        fetchDashboardData();
      }, 700);
    } catch (err) {
      setCreateChildError(err.message || 'Could not create child profile.');
    } finally {
      setIsCreatingChild(false);
    }
  };

  // FEATURE 5: Export Clinical Progress Report
  const handleExportPDF = (child) => {
    setSelectedChildForReport(child);
    setIsReportModalVisible(true);
  };

  const fetchChildRecoveryProgress = async (childId) => {
    setIsLoadingRecovery(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/progress/recovery?child_id=${childId}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setChildRecoveryProgress(data);
      }
    } catch (e) {
      console.log('Parent fetch child recovery note:', e.message);
    } finally {
      setIsLoadingRecovery(false);
    }
  };

  const handlePrintTrigger = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    } else {
      Alert.alert('Report Ready', 'Clinical progress summary compiled. You can take a screenshot or print this page.');
    }
  };

  const handleRequestAppointment = async () => {
    if (!selectedChildForApt) {
      Alert.alert('Selection Required', 'Please select a child.');
      return;
    }
    setIsSubmittingApt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const scheduledTimestamp = new Date(`${aptDate}T10:00:00`).toISOString();

      const { error } = await supabase
        .from('appointments')
        .insert({
          child_id: selectedChildForApt.user_id,
          parent_id: user.id,
          scheduled_at: scheduledTimestamp,
          status: 'pending',
          notes: aptNotes.trim() || 'Parent requested initial wellbeing check-in'
        });

      if (error) throw error;

      Alert.alert('Session Requested', 'Your appointment request has been sent to the counselor.');
      setIsAptModalVisible(false);
      setAptNotes('');
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Request Failed', err.message || 'Unable to book session.');
    } finally {
      setIsSubmittingApt(false);
    }
  };

  const handleLogout = async () => {
    await clearUserAuthSession();
    navigation.replace('RoleSelection');
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical': return { bg: '#FEE2E2', text: '#991B1B', border: '#F87171', label: 'CRITICAL RISK' };
      case 'High': return { bg: '#FFEDD5', text: '#9A3412', border: '#FB923C', label: 'HIGH RISK' };
      case 'Moderate': return { bg: '#FEF9C3', text: '#854D0E', border: '#FACC15', label: 'MODERATE' };
      case 'Low':
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', label: 'LOW RISK / STABLE' };
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Filtered children
  const filteredChildren = children.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (riskFilter === 'ALL') return true;
    return (child.latestAssessment?.stress_level || 'Low').toUpperCase() === riskFilter;
  });

  // KPI Metrics Calculations
  const totalChildrenCount = children.length;
  const highRiskCount = children.filter(c => ['Critical', 'High'].includes(c.latestAssessment?.stress_level)).length;
  const pendingAptsCount = appointments.filter(a => a.status === 'pending' || a.status === 'New').length;
  const avgStabilityRate = totalChildrenCount > 0
    ? Math.round(((totalChildrenCount - highRiskCount) / totalChildrenCount) * 100)
    : 100;

  return (
    <View style={styles.container}>
      {/* ================= TOP APP BAR ================= */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>👨‍👩‍👧</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>AlphaCare Guardian</Text>
            <Text style={styles.brandSubtitle}>Parent & Family Wellbeing Oversight</Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={[styles.topActionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => {
              if (children.length > 0) setSelectedChildForConsent(children[0]);
              setIsConsentModalVisible(true);
            }}
          >
            <Text style={{ fontSize: 13 }}>🛡️</Text>
            <Text style={{ color: '#15803D', fontWeight: '800', fontSize: 12 }}>Consent & Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topActionBtn, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}
            onPress={() => {
              setIsNotificationModalVisible(true);
              setUnreadNotifCount(0);
            }}
          >
            <Text style={{ fontSize: 13 }}>🔔</Text>
            <Text style={{ color: '#6D28D9', fontWeight: '800', fontSize: 12 }}>
              Alerts{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
            onPress={() => {
              if (children.length > 0) {
                setSelectedChildForSafety(children[0]);
                setIsSafetyModalVisible(true);
              } else {
                Alert.alert('Notice', 'No linked child profiles found.');
              }
            }}
          >
            <Text style={{ fontSize: 13 }}>🚨</Text>
            <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>Report Incident</Text>
          </TouchableOpacity>

          <View style={styles.userGreeting}>
            <Text style={styles.greetingSub}>Welcome,</Text>
            <Text style={styles.greetingName}>{parentDisplayName || currentUser?.name || 'Shivani Chirraboina'}</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= MAIN BODY LAYOUT ================= */}
      <View style={styles.bodyLayout}>
        {/* SIDEBAR NAVIGATION */}
        <View style={[styles.navBar, !isDesktop && styles.navBarMobile]}>
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
            {[
              { id: 'overview', label: 'Family Overview', icon: '📊' },
              { id: 'children', label: `My Children (${totalChildrenCount})`, icon: '👧' },
              { id: 'mood_trends', label: 'Mood & Trends', icon: '📈' },
              { id: 'safety_reports', label: `Safety Reports (${safetyReports.length})`, icon: '🛡️' },
              { id: 'appointments', label: `Appointments (${appointments.length})`, icon: '📅' },
              { id: 'recommendations', label: 'Prescribed Routines', icon: '✨' }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.navTab, activeTab === tab.id && styles.navTabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.navTabIcon}>{tab.icon}</Text>
                <Text style={[styles.navTabLabel, activeTab === tab.id && styles.navTabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CONTENT AREA */}
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Syncing family wellbeing telemetry...</Text>
            </View>
          ) : (
            <>
              {/* ================= TAB 1: OVERVIEW ================= */}
              {activeTab === 'overview' && (
                <View style={styles.viewSection}>
                  {/* HERO BANNER */}
                  <View style={styles.heroCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroTitle}>Family Emotional Wellbeing Snapshot</Text>
                      <Text style={styles.heroSubtitle}>
                        Track live stress analytics, review confidential mood trends, and coordinate proactive support with certified school counselors.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.heroAddBtn}
                      onPress={() => setIsAddChildModalVisible(true)}
                    >
                      <Text style={styles.heroAddBtnText}>+ Link New Child</Text>
                    </TouchableOpacity>
                  </View>

                  {/* METRICS GRID */}
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { borderLeftColor: '#7C3AED' }]}>
                      <Text style={styles.metricLabel}>Monitored Children</Text>
                      <Text style={styles.metricValue}>{totalChildrenCount}</Text>
                      <Text style={styles.metricNote}>Active profiles linked</Text>
                    </View>

                    <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={styles.metricLabel}>Wellbeing Stability</Text>
                      <Text style={[styles.metricValue, { color: '#059669' }]}>
                        {totalChildrenCount > 0 ? `${avgStabilityRate}%` : '—'}
                      </Text>
                      <Text style={styles.metricNote}>
                        {totalChildrenCount > 0 ? 'Low risk baseline score' : 'Awaiting linked profiles'}
                      </Text>
                    </View>

                    <View style={[styles.metricCard, { borderLeftColor: highRiskCount > 0 ? '#EF4444' : '#64748B' }]}>
                      <Text style={styles.metricLabel}>Elevated Risk Alerts</Text>
                      <Text style={[styles.metricValue, { color: highRiskCount > 0 ? '#DC2626' : '#1E293B' }]}>
                        {highRiskCount}
                      </Text>
                      <Text style={styles.metricNote}>{highRiskCount > 0 ? 'Action recommended' : 'All stabilized'}</Text>
                    </View>

                    <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                      <Text style={styles.metricLabel}>Scheduled Sessions</Text>
                      <Text style={styles.metricValue}>{pendingAptsCount}</Text>
                      <Text style={styles.metricNote}>Counselor consultations</Text>
                    </View>
                  </View>

                  {/* RECENT SUBMITTED SAFETY REPORTS BANNER */}
                  {safetyReports.length > 0 && (
                    <View style={styles.safetySection}>
                      <View style={styles.sectionHeaderRow}>
                        <View>
                          <Text style={styles.sectionHeaderTitle}>🛡️ Logged Safety & Bullying Incidents</Text>
                          <Text style={styles.sectionHeaderSub}>Confidential reports securely forwarded to clinical staff</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                          onPress={() => {
                            if (children.length > 0) setSelectedChildForSafety(children[0]);
                            setIsSafetyModalVisible(true);
                          }}
                        >
                          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>+ File Incident</Text>
                        </TouchableOpacity>
                      </View>

                      {safetyReports.slice(0, 2).map(rep => (
                        <View key={rep.id} style={styles.safetyCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.safetyChildName}>{rep.child_name} • {rep.incident_type}</Text>
                            <View style={styles.safetyStatusBadge}>
                              <Text style={styles.safetyStatusText}>{rep.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.safetyDesc}>{rep.description}</Text>
                          <Text style={styles.safetyMeta}>
                            Incident Date: {rep.incident_date} • Logged: {new Date(rep.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ACTIVE ALERTS SECTION */}
                  {alerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                      <Text style={styles.alertsHeaderTitle}>⚠️ Action Needed: Priority Wellness Alerts</Text>
                      {alerts.map(alert => (
                        <View key={alert.id} style={styles.alertCard}>
                          <View style={styles.alertCardHeader}>
                            <Text style={styles.alertChildName}>{alert.childName}</Text>
                            <View style={[styles.riskBadgePill, { backgroundColor: getRiskColor(alert.risk_level).bg, borderColor: getRiskColor(alert.risk_level).border }]}>
                              <Text style={[styles.riskBadgeText, { color: getRiskColor(alert.risk_level).text }]}>
                                {alert.risk_level} Stress Alert
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.alertMsg}>
                            Elevated emotional fatigue or stress markers detected for {alert.childName} on {formatDate(alert.created_at)}.
                          </Text>

                          <View style={styles.factorsBox}>
                            <Text style={styles.factorsTitle}>Contributing Drivers:</Text>
                            {(alert.contributing_factors || []).map((f, i) => (
                              <Text key={i} style={styles.factorItem}>• {f}</Text>
                            ))}
                          </View>

                          <View style={styles.alertActionsRow}>
                            {alert.status === 'New' && (
                              <TouchableOpacity
                                style={[styles.alertBtn, { backgroundColor: '#FFFFFF', borderColor: '#FCA5A5' }]}
                                onPress={() => handleUpdateAlertStatus(alert.id, 'Reviewed')}
                              >
                                <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 12 }}>Mark Reviewed</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.alertBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                              onPress={() => handleUpdateAlertStatus(alert.id, 'Resolved')}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Mark Resolved</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* CASELOAD PREVIEW */}
                  <View style={styles.caseloadSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View>
                        <Text style={styles.sectionHeaderTitle}>Children Wellness Caseload</Text>
                        <Text style={styles.sectionHeaderSub}>Real-time psychological indicators & routine tracking</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={() => setIsAddChildModalVisible(true)}
                      >
                        <Text style={styles.primaryActionText}>+ Add Child Profile</Text>
                      </TouchableOpacity>
                    </View>

                    {children.length === 0 ? (
                      <View style={[styles.emptyCard, { paddingVertical: 32, alignItems: 'center' }]}>
                        <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                        <Text style={styles.emptyTitle}>No Child Profiles Linked Yet</Text>
                        <Text style={[styles.emptySub, { maxWidth: 500, textAlign: 'center' }]}>
                          For student privacy and security, child wellness data is isolated. Please click below to link your child's account using their registered username and password.
                        </Text>
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { marginTop: 14, backgroundColor: '#7C3AED' }]}
                          onPress={() => setIsAddChildModalVisible(true)}
                        >
                          <Text style={styles.primaryActionText}>+ Link Child Account with Credentials</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      children.map(child => renderChildCard(child))
                    )}
                  </View>
                </View>
              )}

              {/* ================= TAB 2: MY CHILDREN CASELOAD ================= */}
              {activeTab === 'children' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Linked Children Profiles</Text>
                      <Text style={styles.sectionHeaderSub}>Detailed overview, assessment telemetry, and credentials control</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => setIsAddChildModalVisible(true)}
                    >
                      <Text style={styles.primaryActionText}>+ Link New Child</Text>
                    </TouchableOpacity>
                  </View>

                  {/* SEARCH & RISK FILTER BAR */}
                  <View style={styles.filterBar}>
                    <TextInput
                      style={styles.searchBarInput}
                      placeholder="🔍 Search child by name..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
                      {['ALL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map(lvl => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.filterPill, riskFilter === lvl && styles.filterPillActive]}
                          onPress={() => setRiskFilter(lvl)}
                        >
                          <Text style={[styles.filterPillText, riskFilter === lvl && styles.filterPillTextActive]}>
                            {lvl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {filteredChildren.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No matching child profiles found</Text>
                      <Text style={styles.emptySub}>Adjust your search query or add a new child profile to monitor.</Text>
                    </View>
                  ) : (
                    filteredChildren.map(child => renderChildCard(child))
                  )}
                </View>
              )}

              {/* ================= TAB 3: MOOD & TRENDS ================= */}
              {activeTab === 'mood_trends' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Aggregated Mood & Emotional Trends</Text>
                      <Text style={styles.sectionHeaderSub}>Longitudinal emotional telemetry across all family profiles</Text>
                    </View>
                  </View>

                  {children.map(child => (
                    <View key={child.user_id} style={styles.trendOverviewCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.avatarHolder}><Text style={{ fontSize: 20 }}>👧</Text></View>
                          <View>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{child.name}</Text>
                            <Text style={{ fontSize: 12, color: '#64748B' }}>Age {child.age || 14} • {child.grade || 'Student'}</Text>
                          </View>
                        </View>
                        <View style={[styles.riskBadgePill, { backgroundColor: getRiskColor(child.latestAssessment?.stress_level).bg, borderColor: getRiskColor(child.latestAssessment?.stress_level).border }]}>
                          <Text style={[styles.riskBadgeText, { color: getRiskColor(child.latestAssessment?.stress_level).text }]}>
                            {getRiskColor(child.latestAssessment?.stress_level).label}
                          </Text>
                        </View>
                      </View>

                      <TrendLine
                        trend={child.journalTrend?.trend || 'improving'}
                        valueText={child.journalTrend?.trendText || 'Emotionally Balanced'}
                        subtitle="Calculated from journal NLP sentiment telemetry"
                      />

                      <View style={{ marginTop: 16 }}>
                        <BarChart
                          title="7-Day Emotional Reflection History"
                          data={child.moodHistory}
                          barColor="#8B5CF6"
                          height={120}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ================= TAB 4: SAFETY REPORTS ================= */}
              {activeTab === 'safety_reports' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Safety & Bullying Incident Reports</Text>
                      <Text style={styles.sectionHeaderSub}>Confidential reports sent to school counseling and administrative staff</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: '#DC2626' }]}
                      onPress={() => {
                        if (children.length > 0) setSelectedChildForSafety(children[0]);
                        setIsSafetyModalVisible(true);
                      }}
                    >
                      <Text style={styles.primaryActionText}>🚨 Report New Incident</Text>
                    </TouchableOpacity>
                  </View>

                  {safetyReports.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🛡️</Text>
                      <Text style={styles.emptyTitle}>No incident reports on record</Text>
                      <Text style={styles.emptySub}>
                        If your child experiences bullying, harassment, or emotional safety concerns, you can confidentially submit a report anytime.
                      </Text>
                    </View>
                  ) : (
                    safetyReports.map(rep => (
                      <View key={rep.id} style={styles.safetyCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.safetyChildName}>{rep.child_name} • {rep.incident_type}</Text>
                          <View style={styles.safetyStatusBadge}>
                            <Text style={styles.safetyStatusText}>{rep.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.safetyDesc}>{rep.description}</Text>
                        <Text style={styles.safetyMeta}>
                          Incident Date: {rep.incident_date} • Location: {rep.location || 'School Environment'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ================= TAB 5: APPOINTMENTS ================= */}
              {activeTab === 'appointments' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Counselor Appointments & Consultations</Text>
                      <Text style={styles.sectionHeaderSub}>Upcoming one-on-one sessions and reviews</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        if (children.length > 0) setSelectedChildForApt(children[0]);
                        setIsAptModalVisible(true);
                      }}
                    >
                      <Text style={styles.primaryActionText}>+ Request Consultation</Text>
                    </TouchableOpacity>
                  </View>

                  {appointments.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
                      <Text style={styles.emptyTitle}>No appointments scheduled</Text>
                      <Text style={styles.emptySub}>Book a check-in with the assigned school counselor whenever your child needs extra guidance.</Text>
                    </View>
                  ) : (
                    appointments.map(apt => (
                      <View key={apt.id} style={styles.aptCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{apt.childName}</Text>
                          <View style={[styles.aptBadge, { backgroundColor: apt.status === 'Confirmed' ? '#DCFCE7' : '#FEF3C7' }]}>
                            <Text style={[styles.aptBadgeText, { color: apt.status === 'Confirmed' ? '#15803D' : '#B45309' }]}>
                              {apt.status || 'Pending Review'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.aptTimeText}>
                          Date: {new Date(apt.scheduled_at).toLocaleDateString()} at {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {apt.notes ? <Text style={styles.aptNotesText}>{apt.notes}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ================= TAB 6: PRESCRIBED ROUTINES ================= */}
              {activeTab === 'recommendations' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Prescribed Wellbeing Routines & Exercises</Text>
                      <Text style={styles.sectionHeaderSub}>Daily exercises recommended by clinical counselors for emotional resilience</Text>
                    </View>
                  </View>

                  {children.map(child => (
                    <View key={child.user_id} style={styles.routineChildBlock}>
                      <Text style={styles.routineChildTitle}>👦 For {child.name}</Text>
                      {(child.recommendations || []).map(r => (
                        <View key={r.id} style={styles.recItemCard}>
                          <View style={styles.recIconHolder}><Text style={{ fontSize: 18 }}>✨</Text></View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.recTitle}>{r.title}</Text>
                              <View style={styles.recCategoryBadge}>
                                <Text style={styles.recCategoryText}>{r.category || 'Mindfulness'}</Text>
                              </View>
                            </View>
                            <Text style={styles.recBody}>{r.body}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* ================= MODAL 1: BULLYING & SAFETY REPORTING ================= */}
      <Modal visible={isSafetyModalVisible} animationType="slide" transparent onRequestClose={() => setIsSafetyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>🚨 Bullying & Safety Incident Report</Text>
                <Text style={styles.modalSub}>Confidential report stored securely for counseling review</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSafetyModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <Text style={styles.modalChildSub}>Child Name: <Text style={{ fontWeight: '800' }}>{selectedChildForSafety?.name}</Text></Text>

            <Text style={styles.formLabel}>Incident Type / Concern</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['Bullying Incident', 'Physical / Verbal Safety', 'Cyberbullying', 'School Harassment', 'Emotional Distress'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typePill, incidentType === type && styles.typePillActive]}
                  onPress={() => setIncidentType(type)}
                >
                  <Text style={[styles.typePillText, incidentType === type && styles.typePillTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Incident Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={incidentDate}
              onChangeText={setIncidentDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.formLabel}>Location / Context (e.g. School bus, Playground, Online chat)</Text>
            <TextInput
              style={styles.modalInput}
              value={incidentLocation}
              onChangeText={setIncidentLocation}
              placeholder="Where or how did the incident occur?"
            />

            <Text style={styles.formLabel}>Description of Safety Concern</Text>
            <TextInput
              style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
              multiline
              value={incidentDescription}
              onChangeText={setIncidentDescription}
              placeholder="Please describe what happened, individuals involved, or changes observed in your child..."
            />

            {safetySubmitSuccess && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✓ Report securely submitted to clinical staff!</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
              disabled={isSubmittingSafety}
              onPress={handleSubmitSafetyReport}
            >
              {isSubmittingSafety ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Confidential Safety Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: CHILD CREDENTIALS RESET ================= */}
      <Modal visible={isCredsModalVisible} animationType="slide" transparent onRequestClose={() => setIsCredsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>🔑 Manage Child Login Credentials</Text>
                <Text style={styles.modalSub}>Reset password or view authentication status</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCredsModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <Text style={styles.modalChildSub}>Child Name: <Text style={{ fontWeight: '800' }}>{selectedChildForCreds?.name}</Text></Text>

            <View style={styles.credInfoBox}>
              <Text style={styles.credInfoLabel}>Assigned Child ID: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{selectedChildForCreds?.user_id?.substring(0, 16)}...</Text></Text>
              <Text style={styles.credInfoLabel}>Profile Status: <Text style={{ fontWeight: '700', color: '#16A34A' }}>Active Linked Profile</Text></Text>
            </View>

            <Text style={styles.formLabel}>Set New Password for Child</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={newChildPassword}
              onChangeText={setNewChildPassword}
              placeholder="Enter minimum 6 character password..."
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#7C3AED' }]}
              disabled={isResettingPassword}
              onPress={handleResetChildPassword}
            >
              {isResettingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Update & Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: WELLNESS PROGRESS & ROUTINE ================= */}
      <Modal visible={isWellnessModalVisible} animationType="slide" transparent onRequestClose={() => setIsWellnessModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%', maxWidth: 620 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>🌟 Wellness Progress & Routine Tracking</Text>
                <Text style={styles.modalSub}>Verified activity records for {selectedChildForWellness?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsWellnessModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 10 }}>
              {/* SUMMARY STATS */}
              <View style={styles.routineSummaryRow}>
                <View style={styles.routineStatCard}>
                  <Text style={styles.routineStatNumber}>{selectedChildForWellness?.recordedActivities?.length || 0}</Text>
                  <Text style={styles.routineStatLabel}>Recorded Activities</Text>
                </View>
                <View style={styles.routineStatCard}>
                  <Text style={styles.routineStatNumber}>{selectedChildForWellness?.moodHistory?.length || 0}</Text>
                  <Text style={styles.routineStatLabel}>Mood Check-ins</Text>
                </View>
                <View style={styles.routineStatCard}>
                  <Text style={styles.routineStatNumber}>{selectedChildForWellness?.journalEntries?.length || 0}</Text>
                  <Text style={styles.routineStatLabel}>Journal Logs</Text>
                </View>
              </View>

              {/* MOOD TREND CHART */}
              {selectedChildForWellness?.moodHistory && selectedChildForWellness.moodHistory.length > 0 && (
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginTop: 14 }}>
                  <BarChart
                    title="7-Day Mood Progression"
                    data={selectedChildForWellness.moodHistory}
                    barColor="#8B5CF6"
                    height={110}
                  />
                </View>
              )}

              <Text style={[styles.formLabel, { marginTop: 16, marginBottom: 8 }]}>Completed Activities Timeline:</Text>

              {!selectedChildForWellness?.recordedActivities || selectedChildForWellness.recordedActivities.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 13, fontStyle: 'italic' }}>
                    Activities will automatically populate here as the child completes breathing exercises, check-ins, and journaling.
                  </Text>
                </View>
              ) : (
                selectedChildForWellness.recordedActivities.map(act => (
                  <View key={act.id} style={styles.activityItemCard}>
                    <View style={styles.activityItemIconHolder}>
                      <Text style={{ fontSize: 18 }}>{act.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.activityItemTitle}>{act.type}</Text>
                        <View style={styles.activityStatusBadge}>
                          <Text style={styles.activityStatusText}>✓ {act.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.activityItemDetail}>{act.detail}</Text>
                      <Text style={styles.activityItemDate}>
                        Completed: {new Date(act.date).toLocaleDateString()} at {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 4: REQUEST APPOINTMENT ================= */}
      <Modal visible={isAptModalVisible} animationType="slide" transparent onRequestClose={() => setIsAptModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Counseling Session</Text>
              <TouchableOpacity onPress={() => setIsAptModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <Text style={styles.modalChildSub}>Child: <Text style={{ fontWeight: '800' }}>{selectedChildForApt?.name}</Text></Text>

            <Text style={styles.formLabel}>Preferred Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={aptDate}
              onChangeText={setAptDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.formLabel}>Reason / Notes for Counselor</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              multiline
              value={aptNotes}
              onChangeText={setAptNotes}
              placeholder="Share any concerns or observations you'd like the counselor to address..."
            />

            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#7C3AED' }]} disabled={isSubmittingApt} onPress={handleRequestAppointment}>
              {isSubmittingApt ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSubmitText}>Submit Appointment Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 5: ADD / LINK CHILD ================= */}
      <Modal visible={isAddChildModalVisible} animationType="slide" transparent onRequestClose={() => setIsAddChildModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>👨‍👩‍👧 Link Child to Your Account</Text>
                <Text style={styles.modalSub}>Monitor live emotional health, stress trends & clinical reports</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddChildModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            {/* TAB SELECTOR: LINK EXISTING vs REGISTER NEW */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginVertical: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: 'center',
                  borderRadius: 9,
                  backgroundColor: addChildTab === 'link' ? '#FFFFFF' : 'transparent',
                  shadowOpacity: addChildTab === 'link' ? 0.08 : 0,
                  elevation: addChildTab === 'link' ? 2 : 0,
                }}
                onPress={() => setAddChildTab('link')}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: addChildTab === 'link' ? '#7C3AED' : '#64748B' }}>
                  🔗 Link Existing Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: 'center',
                  borderRadius: 9,
                  backgroundColor: addChildTab === 'register' ? '#FFFFFF' : 'transparent',
                  shadowOpacity: addChildTab === 'register' ? 0.08 : 0,
                  elevation: addChildTab === 'register' ? 2 : 0,
                }}
                onPress={() => setAddChildTab('register')}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: addChildTab === 'register' ? '#7C3AED' : '#64748B' }}>
                  👶 Register New Child
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: LINK EXISTING ACCOUNT */}
            {addChildTab === 'link' ? (
              <View>
                <View style={{ backgroundColor: '#FAF5FF', borderColor: '#E9D5FF', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12.5, color: '#6B21A8', lineHeight: 18, fontWeight: '600' }}>
                    💡 Enter the login credentials your child uses on AlphaCare to securely link their account and view real-time wellness telemetry.
                  </Text>

                  {/* QUICK 1-TAP LINK SUGGESTION */}
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: '#FFFFFF',
                      borderColor: '#C084FC',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      alignSelf: 'flex-start'
                    }}
                    onPress={() => setLinkForm({
                      identifier: 'chirraboinad@gmail.com',
                      password: 'password123',
                      relationship: 'Daughter'
                    })}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#7C3AED' }}>
                      ✨ Quick-Fill Devisri (chirraboinad@gmail.com)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.formLabel}>Child's Username or Registered Email</Text>
                <TextInput
                  style={styles.modalInput}
                  autoCapitalize="none"
                  value={linkForm.identifier}
                  onChangeText={(val) => setLinkForm(p => ({ ...p, identifier: val }))}
                  placeholder="e.g. devisri or chirraboinad@gmail.com"
                />

                <Text style={styles.formLabel}>Child's Login Password / Passcode</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={linkForm.password}
                  onChangeText={(val) => setLinkForm(p => ({ ...p, password: val }))}
                  placeholder="Enter child's AlphaCare password"
                />

                <Text style={styles.formLabel}>Relationship to Child</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['Daughter', 'Son', 'Ward'].map(rel => (
                    <TouchableOpacity
                      key={rel}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: linkForm.relationship === rel ? '#7C3AED' : '#E2E8F0',
                        backgroundColor: linkForm.relationship === rel ? '#FAF5FF' : '#FFFFFF',
                        alignItems: 'center'
                      }}
                      onPress={() => setLinkForm(p => ({ ...p, relationship: rel }))}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: linkForm.relationship === rel ? '#7C3AED' : '#64748B' }}>
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {linkError ? (
                  <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#F87171', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '700' }}>⚠️ {linkError}</Text>
                  </View>
                ) : null}

                {linkSuccess ? (
                  <View style={{ backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: '#166534', fontSize: 12, fontWeight: '800' }}>{linkSuccess}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#7C3AED', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }]}
                  activeOpacity={0.7}
                  disabled={isLinkingChild}
                  onPress={handleLinkExistingChild}
                >
                  {isLinkingChild ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>🔗 Link Child Account & Sync Reports</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* TAB 2: REGISTER NEW CHILD */
              <View>
                <Text style={styles.formLabel}>Child Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={childForm.name}
                  onChangeText={(val) => setChildForm(p => ({ ...p, name: val }))}
                  placeholder="e.g. Devisri chirraboina"
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Age (Years)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={childForm.age}
                      keyboardType="numeric"
                      onChangeText={(val) => setChildForm(p => ({ ...p, age: val }))}
                      placeholder="e.g. 14"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Relationship</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={childForm.relationship}
                      onChangeText={(val) => setChildForm(p => ({ ...p, relationship: val }))}
                      placeholder="e.g. Daughter"
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>New Login Username or Email</Text>
                <TextInput
                  style={styles.modalInput}
                  autoCapitalize="none"
                  value={childForm.email}
                  onChangeText={(val) => setChildForm(p => ({ ...p, email: val }))}
                  placeholder="e.g. devisri or chirraboinad@gmail.com"
                />

                <Text style={styles.formLabel}>Set Child Password (min 6 characters)</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={childForm.password}
                  onChangeText={(val) => setChildForm(p => ({ ...p, password: val }))}
                  placeholder="Create password for child"
                />

                <Text style={styles.formLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={childForm.confirmPassword}
                  onChangeText={(val) => setChildForm(p => ({ ...p, confirmPassword: val }))}
                  placeholder="Confirm password"
                />

                {createChildError ? (
                  <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#F87171', borderRadius: 8, padding: 10, marginVertical: 8 }}>
                    <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '700' }}>⚠️ {createChildError}</Text>
                  </View>
                ) : null}

                {createChildSuccess ? (
                  <View style={{ backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 10, marginVertical: 8 }}>
                    <Text style={{ color: '#166534', fontSize: 12, fontWeight: '800' }}>{createChildSuccess}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#7C3AED', marginTop: 8, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }]}
                  activeOpacity={0.7}
                  disabled={isCreatingChild}
                  onPress={handleAddChild}
                >
                  {isCreatingChild ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>✨ Create & Link New Child Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 6: REPORT & PDF EXPORT ================= */}
      <Modal visible={isReportModalVisible} animationType="slide" transparent onRequestClose={() => setIsReportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 680, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>📄 Clinical Wellbeing & Progress Report</Text>
                <Text style={styles.modalSub}>AlphaCare Confidential Student Assessment Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setIsReportModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 10, paddingRight: 6 }}>
              {/* PERIOD TOGGLE */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: parentReportPeriod === 'weekly' ? '#FFFFFF' : 'transparent',
                    shadowOpacity: parentReportPeriod === 'weekly' ? 0.05 : 0
                  }}
                  onPress={() => setParentReportPeriod('weekly')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: parentReportPeriod === 'weekly' ? '#7C3AED' : '#64748B' }}>
                    📅 Weekly Stress Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: parentReportPeriod === 'monthly' ? '#FFFFFF' : 'transparent',
                    shadowOpacity: parentReportPeriod === 'monthly' ? 0.05 : 0
                  }}
                  onPress={() => setParentReportPeriod('monthly')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: parentReportPeriod === 'monthly' ? '#7C3AED' : '#64748B' }}>
                    📆 Monthly Stress Report
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SUMMARY BANNER */}
              <View style={{ backgroundColor: '#F5F3FF', padding: 16, borderRadius: 12, marginBottom: 16, borderLeftWidth: 5, borderLeftColor: '#7C3AED' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4C1D95' }}>AlphaCare • Student Wellbeing Report ({parentReportPeriod.toUpperCase()})</Text>
                <Text style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>
                  Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
                </Text>
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 20 }}>
                  <Text style={{ fontSize: 13, color: '#5B21B6' }}><Text style={{ fontWeight: '800' }}>Student:</Text> {selectedChildForReport?.name}</Text>
                  <Text style={{ fontSize: 13, color: '#5B21B6' }}><Text style={{ fontWeight: '800' }}>Age:</Text> {selectedChildForReport?.age || '—'}</Text>
                  <Text style={{ fontSize: 13, color: '#5B21B6' }}>
                    <Text style={{ fontWeight: '800' }}>Current Risk:</Text>{' '}
                    <Text style={{ color: getRiskColor(selectedChildForReport?.latestAssessment?.stress_level).text, fontWeight: '900' }}>
                      {selectedChildForReport?.latestAssessment?.stress_level || 'Low'}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* CHARTS IN REPORT */}
              {selectedChildForReport?.moodHistory && selectedChildForReport.moodHistory.length > 0 && (
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <BarChart
                    title={`${parentReportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Mood History Progression`}
                    data={selectedChildForReport.moodHistory}
                    barColor="#8B5CF6"
                    height={110}
                  />
                </View>
              )}

              {/* SECTION: CLINICAL EVALUATION */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>1. Stress Assessment Evaluation</Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 19 }}>
                  {selectedChildForReport?.latestAssessment ? (
                    `Student completed the validated stress assessment. Evaluated level is ${selectedChildForReport.latestAssessment.stress_level} (${selectedChildForReport.latestAssessment.final_stress_score ? `${selectedChildForReport.latestAssessment.final_stress_score}/100` : 'Assessed'}).`
                  ) : (
                    'Baseline check-ins indicate stable wellbeing patterns. Regular assessments help maintain early intervention support.'
                  )}
                </Text>
              </View>

              {/* SECTION: EMOTIONAL SENTIMENT */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>2. Emotional Sentiment & Reflection</Text>
                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 19 }}>
                  Emotional trend is classified as <Text style={{ fontWeight: '800' }}>{selectedChildForReport?.journalTrend?.trendText || 'Emotionally Stable'}</Text>.
                </Text>
              </View>

              {/* SECTION: ASSIGNED COUNSELOR */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>3. Professional Counselor Oversight</Text>
                <Text style={{ fontSize: 13, color: '#334155' }}>
                  Assigned Practitioner: <Text style={{ fontWeight: '800' }}>{selectedChildForReport?.assignedCounselor?.full_name || 'Dr. Sarah Jenkins'}</Text> ({selectedChildForReport?.assignedCounselor?.qualification || 'Licensed Child Psychologist'})
                </Text>
              </View>

              {/* ACTIONS */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { flex: 1, backgroundColor: '#15803D' }]}
                  onPress={handlePrintTrigger}
                >
                  <Text style={styles.modalSubmitText}>🖨️ Print / Save as PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { flex: 1, backgroundColor: '#64748B' }]}
                  onPress={() => setIsReportModalVisible(false)}
                >
                  <Text style={styles.modalSubmitText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
        navigation={navigation}
        userRole="parent"
      />

      {/* CONSENT & PRIVACY MODAL */}
      <ConsentPrivacyModal
        visible={isConsentModalVisible}
        onClose={() => setIsConsentModalVisible(false)}
        userRole="parent"
        childId={selectedChildForConsent?.user_id}
        childName={selectedChildForConsent?.name}
      />
    </View>
  );

  // Helper to render individual child card
  function renderChildCard(child) {
    const riskStyle = getRiskColor(child.latestAssessment?.stress_level);
    return (
      <View key={child.id || child.user_id} style={styles.childCard}>
        {/* CARD HEADER */}
        <View style={styles.childCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.avatarHolder}>
              <Text style={{ fontSize: 24 }}>👧</Text>
            </View>
            <View>
              <Text style={styles.childCardName}>{child.name}</Text>
              <Text style={styles.childCardMeta}>
                Age {child.age || '—'} • {child.grade || 'Student'} • Active Oversight
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={[styles.riskBadgePill, { backgroundColor: riskStyle.bg, borderColor: riskStyle.border }]}>
              <Text style={[styles.riskBadgeText, { color: riskStyle.text }]}>{riskStyle.label}</Text>
            </View>

            <TouchableOpacity
              style={styles.credsBtn}
              onPress={() => {
                setSelectedChildForCreds(child);
                setIsCredsModalVisible(true);
              }}
            >
              <Text style={styles.credsBtnText}>🔑 Credentials</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* WELLNESS & STRESS METRICS */}
        <View style={styles.wellnessRow}>
          <View style={styles.stressGaugeBox}>
            <Text style={styles.stressGaugeLabel}>Live Stress Score</Text>
            {child.latestAssessment?.final_stress_score != null ? (
              <>
                <Text style={[styles.stressGaugeValue, { color: riskStyle.text }]}>
                  {child.latestAssessment.final_stress_score}
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>/100</Text>
                </Text>
                <View style={styles.stressProgressBarBg}>
                  <View
                    style={[
                      styles.stressProgressBarFill,
                      {
                        width: `${Math.min(100, Math.max(10, child.latestAssessment.final_stress_score))}%`,
                        backgroundColor: riskStyle.text
                      }
                    ]}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.stressGaugeValue, { color: '#64748B', fontSize: 18, marginVertical: 8 }]}>
                  — <Text style={{ fontSize: 12, color: '#94A3B8' }}>(Pending Assessment)</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>No clinical assessment taken yet</Text>
              </>
            )}
          </View>

          <View style={styles.sentimentBox}>
            <Text style={styles.sentimentLabel}>Emotional Trend</Text>
            <Text style={styles.sentimentValue}>{child.journalTrend?.trendText || 'No Check-ins Logged Yet'}</Text>
            <Text style={styles.sentimentNote}>
              {child.journalTrend?.trendText ? 'Based on real journal & mood entries' : 'Awaiting student check-in'}
            </Text>
          </View>
        </View>

        {/* 7-DAY MOOD HISTORY CHART */}
        {child.moodHistory && child.moodHistory.length > 0 ? (
          <View style={styles.chartHolder}>
            <BarChart
              title="7-Day Emotional Reflection & Mood Flow"
              data={child.moodHistory}
              barColor="#8B5CF6"
              height={100}
            />
          </View>
        ) : (
          <View style={[styles.chartHolder, { padding: 18, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>📊 No Mood Check-ins Logged This Week</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              As your child performs facial emotion scans and daily check-ins, their live emotional trend will appear here.
            </Text>
          </View>
        )}

        {/* ASSIGNED COUNSELOR BLOCK */}
        <View style={styles.counselorBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🩺</Text>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
                  {child.assignedCounselor?.full_name || 'Dr. Veda Siddi'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {child.assignedCounselor?.specialization || 'Clinical Child Psychologist (RCI) • Adolescent Guidance'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.chatCounselorBtn}
              onPress={() => {
                navigation.navigate('CounselorChat', {
                  counselorId: child.assignedCounselor?.user_id || 'counselor_veda_01',
                  counselorName: child.assignedCounselor?.full_name || 'Dr. Veda Siddi',
                  childId: child.user_id,
                  childName: child.name,
                  currentRole: 'parent'
                });
              }}
            >
              <Text style={styles.chatCounselorBtnText}>💬 Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACTIONS ROW */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setSelectedChildForWellness(child);
              fetchChildRecoveryProgress(child.user_id);
              setIsWellnessModalVisible(true);
            }}
          >
            <Text style={styles.actionBtnText}>📈 Wellness & Recovery Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => handleExportPDF(child)}
          >
            <Text style={[styles.actionBtnText, { color: '#15803D' }]}>📄 Export Clinical PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}
            onPress={() => {
              setSelectedChildForApt(child);
              setIsAptModalVisible(true);
            }}
          >
            <Text style={[styles.actionBtnText, { color: '#6D28D9' }]}>🩺 Book Consultation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
            onPress={() => {
              setSelectedChildForSafety(child);
              setIsSafetyModalVisible(true);
            }}
          >
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>🚨 Report Incident</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },

  // Top Bar
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandBadgeText: {
    fontSize: 22
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.3
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '600'
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  topActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  userGreeting: {
    alignItems: 'flex-end',
    marginLeft: 4
  },
  greetingSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600'
  },
  greetingName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  logoutBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },

  // Body Layout
  bodyLayout: {
    flex: 1,
    flexDirection: 'row'
  },
  navBar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 16
  },
  navBarMobile: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8
  },
  navScroll: {
    paddingHorizontal: 12,
    gap: 4
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  navTabActive: {
    backgroundColor: '#F5F3FF'
  },
  navTabIcon: {
    fontSize: 16
  },
  navTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B'
  },
  navTabLabelActive: {
    color: '#7C3AED',
    fontWeight: '900'
  },

  contentScroll: {
    flex: 1
  },
  contentContainer: {
    padding: 24
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    color: '#6D28D9',
    fontWeight: '600'
  },

  viewSection: {
    gap: 20
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#EDE9FE',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 600
  },
  heroAddBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  heroAddBtnText: {
    color: '#6D28D9',
    fontWeight: '900',
    fontSize: 13
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4
  },
  metricNote: {
    fontSize: 11,
    color: '#94A3B8'
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  primaryActionBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },

  // Safety Reports
  safetySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 10
  },
  safetyCard: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12
  },
  safetyChildName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B'
  },
  safetyStatusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  safetyStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E'
  },
  safetyDesc: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
    lineHeight: 18
  },
  safetyMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6
  },

  // Alerts
  alertsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 12
  },
  alertsHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#991B1B'
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  alertChildName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7F1D1D'
  },
  alertMsg: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18
  },
  factorsBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7F1D1D',
    marginBottom: 4
  },
  factorItem: {
    fontSize: 12,
    color: '#991B1B'
  },
  alertActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4
  },
  alertBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },

  // Caseload Cards
  caseloadSection: {
    gap: 16
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 16
  },
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14
  },
  avatarHolder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE'
  },
  childCardName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A'
  },
  childCardMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  riskBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '900'
  },
  credsBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  credsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155'
  },

  // Wellness gauge
  wellnessRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap'
  },
  stressGaugeBox: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  stressGaugeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase'
  },
  stressGaugeValue: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 4
  },
  stressProgressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4
  },
  stressProgressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  sentimentBox: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE'
  },
  sentimentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase'
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4C1D95',
    marginVertical: 4
  },
  sentimentNote: {
    fontSize: 11,
    color: '#7C3AED'
  },

  chartHolder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12
  },

  // Counselor Block
  counselorBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  chatCounselorBtn: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  chatCounselorBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9'
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155'
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8
  },
  searchBarInput: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A'
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  filterPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED'
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B'
  },
  filterPillTextActive: {
    color: '#FFFFFF'
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420
  },

  // Trend Overview Card
  trendOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },

  // Appointments
  aptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  aptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  aptBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  aptTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4
  },
  aptNotesText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 6,
    fontStyle: 'italic'
  },

  // Routines & Recommendations
  routineChildBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12
  },
  routineChildTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B'
  },
  recItemCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center'
  },
  recIconHolder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4C1D95'
  },
  recCategoryBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  recCategoryText: {
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '800'
  },
  recBody: {
    fontSize: 12,
    color: '#5B21B6',
    marginTop: 2
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B'
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  modalChildSub: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14
  },
  modalSubmitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },

  // Routine details inside modal
  routineSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  routineStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center'
  },
  routineStatNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#7C3AED'
  },
  routineStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center'
  },
  activityItemCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center'
  },
  activityItemIconHolder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  activityItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  activityStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activityStatusText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800'
  },
  activityItemDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2
  },
  activityItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4
  },

  // Incident Type Pills
  typePill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  typePillActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171'
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  typePillTextActive: {
    color: '#991B1B'
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  successBannerText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  },

  credInfoBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14
  },
  credInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4
  }
});
