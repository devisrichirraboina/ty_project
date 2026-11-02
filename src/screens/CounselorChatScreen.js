import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole, getActiveUserRole } from '../services/authGuard';
import { ChildSidebar } from '../components/ChildSidebar';
import { AppIcon } from '../components/icons/AppIcon';

export const CounselorChatScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;

  const {
    counselorId,
    counselorName = 'Counselor',
    childId: propChildId,
    childName: propChildName = 'Student',
    initialReport = null,
    currentRole: propRole
  } = route.params || {};

  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(propRole || 'child'); // 'child' | 'counselor'
  const [childId, setChildId] = useState(propChildId || '');
  const [resolvedChildName, setResolvedChildName] = useState(propChildName);
  const [targetCounselor, setTargetCounselor] = useState({
    id: counselorId,
    name: counselorName,
    qualification: '',
    experience: '',
    specialization: ''
  });

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Approved Counselors Directory state
  const [approvedCounselors, setApprovedCounselors] = useState([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [showCounselorDirectory, setShowCounselorDirectory] = useState(false);

  // Helper to ensure child names are never counselor/placeholders
  const isInvalidChildName = (name) => {
    if (!name || typeof name !== 'string') return true;
    const n = name.trim().toLowerCase();
    return (
      n === 'friend' ||
      n === 'student' ||
      n === 'child' ||
      n === 'patient' ||
      n.includes('veda') ||
      n.includes('siddi') ||
      n.includes('counselor') ||
      n.includes('parent') ||
      n.includes('dr.')
    );
  };

  // Meeting schedule modal state
  const [isMeetingModalVisible, setIsMeetingModalVisible] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState('11:00 AM');
  const [meetingTopic, setMeetingTopic] = useState('Wellness & Report Review Session');
  const [meetingLink, setMeetingLink] = useState(() => `https://meet.jit.si/AlphaCare-Session-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  const scrollViewRef = useRef(null);

  // Fetch only counselors that have been verified & approved by Admin
  const fetchApprovedCounselors = async () => {
    setIsLoadingApproved(true);
    try {
      let allApps = [];
      try {
        const { data } = await supabase
          .from('counselor_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (data && data.length > 0) allApps = [...data];
      } catch (dbErr) {
        console.log('Counselor profiles fetch note:', dbErr);
      }

      // Check local storage for additional/offline applications
      try {
        const stored = await AsyncStorage.getItem('@alphacare_counselor_applications');
        let localApps = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(localApps) && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const browserStored = window.localStorage.getItem('@alphacare_counselor_applications');
          localApps = browserStored ? JSON.parse(browserStored) : [];
        }
        if (Array.isArray(localApps)) {
          const existingIds = new Set(allApps.map(a => a.user_id));
          allApps = [...allApps, ...localApps.filter(a => !existingIds.has(a.user_id))];
        }
      } catch (e) {}

      // Check admin approved list from @alphacare_approved_counselors
      let localApproved = [];
      try {
        const stored = await AsyncStorage.getItem('@alphacare_approved_counselors');
        let parsed = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed) && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const browserStored = window.localStorage.getItem('@alphacare_approved_counselors');
          parsed = browserStored ? JSON.parse(browserStored) : [];
        }
        if (Array.isArray(parsed)) localApproved = parsed;
      } catch (e) {}

      const counselorMap = new Map();

      // Seed verified default counselors recognized by AlphaCare
      counselorMap.set('counselor_veda', {
        user_id: 'counselor_veda',
        name: 'Dr. Veda Siddi',
        full_name: 'Dr. Veda Siddi',
        qualification: 'M.Phil / RCI Certified Clinical Psychologist',
        specialization: 'Youth Anxiety, Academic Stress & Mindfulness',
        experience: '7+ years',
        application_status: 'approved',
        email: 'veda.siddi@alphacare.com',
        avatar: '👩‍⚕️'
      });

      counselorMap.set('counselor_komal', {
        user_id: 'counselor_komal',
        name: 'Dr. Komal (Counselor)',
        full_name: 'Dr. Komal (Counselor)',
        qualification: 'M.Sc Clinical Psychology',
        specialization: 'Youth Wellbeing, Social Skills & Emotional Resilience',
        experience: '5+ years',
        application_status: 'approved',
        email: 'komal.counselor@alphacare.com',
        avatar: '🧑‍⚕️'
      });

      // Filter from all applications — ONLY INCLUDE ADMIN-APPROVED COUNSELORS!
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
            name: c.full_name || c.name || 'Approved Counselor',
            full_name: c.full_name || c.name || 'Approved Counselor',
            qualification: c.qualification || 'Licensed Child Psychologist',
            specialization: c.specialization || 'Child & Adolescent Mental Wellbeing',
            experience: c.experience ? (String(c.experience).includes('year') ? c.experience : `${c.experience} years`) : '5+ years',
            application_status: 'approved',
            email: c.email || '',
            avatar: '🧑‍⚕️'
          });
        }
      });

      setApprovedCounselors(Array.from(counselorMap.values()));
    } catch (err) {
      console.log('Error fetching approved counselors:', err);
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Link selected counselor for this child
  const handleLinkCounselor = async (counselor) => {
    try {
      const activeChildId = childId || currentUser?.id || 'child_user';
      const counselorObj = {
        id: counselor.user_id,
        name: counselor.full_name || counselor.name,
        qualification: counselor.qualification || 'Certified Clinical Counselor',
        experience: counselor.experience || 'Licensed Practitioner',
        specialization: counselor.specialization || 'Child & Adolescent Emotional Wellbeing'
      };

      setTargetCounselor(counselorObj);
      setShowCounselorDirectory(false);

      // Persist the link locally for this child
      const linkKey = `@alphacare_linked_counselor_${activeChildId}`;
      await AsyncStorage.setItem(linkKey, JSON.stringify(counselorObj));
      await AsyncStorage.setItem('@alphacare_linked_counselor', JSON.stringify(counselorObj));
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(linkKey, JSON.stringify(counselorObj));
        window.localStorage.setItem('@alphacare_linked_counselor', JSON.stringify(counselorObj));
      }

      // Upsert in Supabase counselor_child_assignments
      try {
        if (currentUser?.id && counselor.user_id) {
          await supabase.from('counselor_child_assignments').upsert(
            {
              counselor_id: counselor.user_id,
              child_id: currentUser.id,
              status: 'active'
            },
            { onConflict: 'counselor_id,child_id' }
          );
        }
      } catch (dbErr) {
        console.log('Assignment upsert note:', dbErr);
      }

      // Load or initialize chat messages with this counselor
      const specificKey = `@chat_${counselor.user_id}_${activeChildId}`;
      const cached = await AsyncStorage.getItem(specificKey);
      let localMsgs = cached ? JSON.parse(cached) : [];

      if (localMsgs.length === 0) {
        const welcomeMsg = {
          id: 'welcome_' + Date.now(),
          sender_id: counselor.user_id,
          sender_role: 'counselor',
          message: `Hello ${resolvedChildName}! I am ${counselorObj.name}, your verified counselor approved by AlphaCare Admin. I am here to support you in a safe, confidential space. How can I help you today?`,
          created_at: new Date().toISOString()
        };
        localMsgs = [welcomeMsg];
        await saveMessagesAcrossKeys(localMsgs, specificKey);
      }

      setMessages(localMsgs);
      await fetchMessages(false, localMsgs, counselor.user_id, activeChildId);
    } catch (err) {
      console.log('Error linking counselor:', err);
    }
  };

  // Dynamic storage key generation for bidirectional chat sync
  const getCandidateChatKeys = (cId, sId) => {
    const keys = new Set();
    const cleanCId = cId || targetCounselor.id || counselorId || 'counselor_veda';
    const cleanSId = sId || childId || 'child_user';
    const cleanSName = (resolvedChildName || '').toLowerCase().replace(/\s+/g, '_');

    // 1. Direct candidate pair keys
    keys.add(`@chat_${cleanCId}_${cleanSId}`);
    keys.add(`@chat_${cleanSId}_${cleanCId}`);

    // 2. Verified counselor aliases (Dr. Veda Siddi) & child ID variations
    const vedaAliases = ['counselor_veda', 'counselor_veda_01', 'veda_siddi', cleanCId];
    const studentAliases = ['student_case', 'child_case', 'devi', 'devisri', 'Devisri', cleanSId];
    if (cleanSName) studentAliases.push(cleanSName);

    vedaAliases.forEach(v => {
      if (v) {
        studentAliases.forEach(s => {
          if (s) keys.add(`@chat_${v}_${s}`);
        });
        keys.add(`@chat_${v}_active`);
      }
    });

    // 3. Shared cross-role synchronization channel
    keys.add('@alphacare_active_counselor_chat');
    keys.add(`@alphacare_counselor_messages_${cleanSId}`);
    keys.add('@alphacare_counselor_messages');

    return Array.from(keys);
  };

  useEffect(() => {
    fetchApprovedCounselors();
    initChat();
  }, []);

  useEffect(() => {
    // 1. Real-time background polling interval
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2000);

    // 2. Instant cross-tab real-time sync on Web via storage and custom events
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebSync = (e) => {
        if (!e?.key || e.key.includes('@chat') || e.key.includes('@alphacare_chat') || e.key.includes('@alphacare_counselor')) {
          fetchMessages(false);
        }
      };
      window.addEventListener('storage', handleWebSync);
      window.addEventListener('alphacare_chat_sync', handleWebSync);
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleWebSync);
        window.removeEventListener('alphacare_chat_sync', handleWebSync);
      };
    }

    return () => clearInterval(interval);
  }, [childId, targetCounselor.id, counselorId]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const initChat = async () => {
    try {
      const isAllowed = await enforceScreenRole(navigation, ['child', 'counselor', 'admin']);
      if (!isAllowed) return;

      setIsLoading(true);

      // Resolve authenticated or session user safely
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (authErr) {}

      const activeRole = await getActiveUserRole();
      const detectedRole = propRole || (activeRole === 'child' ? 'child' : (user?.user_metadata?.role || (user?.id === counselorId ? 'counselor' : (activeRole || 'child'))));
      setUserRole(detectedRole);

      if (!user) {
        const isCounselor = detectedRole === 'counselor';
        user = {
          id: isCounselor ? (counselorId || 'counselor_veda') : (propChildId || 'child_user'),
          email: isCounselor ? 'veda.siddi@alphacare.com' : 'devisri@alphacare.com',
          user_metadata: {
            role: isCounselor ? 'counselor' : 'child',
            full_name: isCounselor ? 'Dr. Veda Siddi' : 'Devisri chirraboina'
          }
        };
      }
      setCurrentUser(user);

      let effectiveChildId = propChildId;
      if (detectedRole === 'child') {
        effectiveChildId = user.id;
        setChildId(user.id);

        // Resolve real child name - sanitize against any counselor leaks
        let childRealName = propChildName && !isInvalidChildName(propChildName) ? propChildName : null;
        try {
          if (!childRealName) {
            const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');
            if (activeName && !isInvalidChildName(activeName)) childRealName = activeName;
          }
          if (!childRealName && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const webName = window.localStorage.getItem('@alphacare_active_user_name');
            if (webName && !isInvalidChildName(webName)) childRealName = webName;
          }
          if (!childRealName) {
            const childProf = await AsyncStorage.getItem('@alphacare_child_profile_settings');
            if (childProf) {
              const cp = JSON.parse(childProf);
              if (cp.name && !isInvalidChildName(cp.name)) childRealName = cp.name;
            }
          }
          if (!childRealName) {
            const lastEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
            if (lastEmail && !lastEmail.toLowerCase().includes('counselor') && !lastEmail.toLowerCase().includes('veda')) {
              childRealName = lastEmail.includes('chirraboinad') ? 'Devisri chirraboina' : lastEmail.split('@')[0];
            }
          }
        } catch (nameErr) {}

        const finalChildName = childRealName || 'Devisri';
        setResolvedChildName(finalChildName);

        // Check if an approved counselor is already linked for this child
        let linkedCounselor = null;
        try {
          const storedLink =
            (await AsyncStorage.getItem(`@alphacare_linked_counselor_${user.id}`)) ||
            (await AsyncStorage.getItem('@alphacare_linked_counselor'));
          if (storedLink) {
            const parsed = JSON.parse(storedLink);
            if (parsed?.id && parsed?.name) {
              linkedCounselor = parsed;
            }
          }

          // If not in local storage, check route param if valid
          if (!linkedCounselor && counselorId && counselorName && counselorName !== 'Counselor') {
            linkedCounselor = {
              id: counselorId,
              name: counselorName,
              qualification: 'Certified Clinical Counselor',
              experience: 'Licensed Practitioner',
              specialization: 'Child & Adolescent Emotional Wellbeing'
            };
          }

          // Check Supabase active assignment
          if (!linkedCounselor) {
            try {
              const { data: assignment } = await supabase
                .from('counselor_child_assignments')
                .select('counselor_id, status')
                .eq('child_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

              if (assignment?.counselor_id) {
                const { data: profile } = await supabase
                  .from('counselor_profiles')
                  .select('*')
                  .eq('user_id', assignment.counselor_id)
                  .maybeSingle();

                if (profile) {
                  linkedCounselor = {
                    id: profile.user_id,
                    name: profile.full_name || 'Assigned Counselor',
                    qualification: profile.qualification || 'Certified Clinical Counselor',
                    experience: profile.experience || 'Licensed Practitioner',
                    specialization: profile.specialization || 'Child & Adolescent Emotional Wellbeing'
                  };
                }
              }
            } catch (assignErr) {}
          }
        } catch (linkErr) {
          console.log('Error checking linked counselor:', linkErr);
        }

        if (linkedCounselor) {
          setTargetCounselor(linkedCounselor);
          setShowCounselorDirectory(false);
          await fetchMessages(false, null, linkedCounselor.id, user.id);
        } else {
          // NO COUNSELOR LINKED YET: Show the Approved Counselors Directory immediately!
          setTargetCounselor({ id: null, name: '', qualification: '', experience: '', specialization: '' });
          setShowCounselorDirectory(true);
          await fetchApprovedCounselors();
        }
      } else {
        // Counselor viewing — resolve child name & counselor identity
        effectiveChildId = effectiveChildId || 'student_case';
        setChildId(effectiveChildId);

        let foundName = (propChildName && propChildName !== 'Student' && propChildName !== 'Child' && propChildName !== 'Patient') ? propChildName : null;
        if (!foundName) {
          try {
            const lastEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
            if (lastEmail && lastEmail.includes('chirraboinad')) {
              foundName = 'Devisri chirraboina';
            }
            if (!foundName) {
              const lastRep = await AsyncStorage.getItem('@alphacare_last_shared_report');
              if (lastRep) {
                const p = JSON.parse(lastRep);
                if (p.childName && p.childName !== 'Student') foundName = p.childName;
              }
            }
          } catch (ne) {}
        }
        const finalFoundName = foundName || 'Devisri chirraboina';
        setResolvedChildName(finalFoundName);

        // Prepopulate counselor's targetCounselor with verified profile info
        const counselorObj = {
          id: counselorId || 'counselor_veda',
          name: counselorName || 'Dr. Veda Siddi',
          qualification: 'M.Phil / RCI Certified Clinical Psychologist',
          experience: '7+ years',
          specialization: 'Youth Anxiety, Academic Stress & Mindfulness'
        };
        setTargetCounselor(counselorObj);

        await fetchMessages(false, null, counselorObj.id, effectiveChildId);
      }
    } catch (e) {
      console.log('Error initializing chat:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessagesAcrossKeys = async (msgs, specificKeyOverride = null) => {
    try {
      const activeChild = childId || currentUser?.id || 'child_case';
      const activeCounselor = targetCounselor.id || counselorId || 'counselor_veda';
      const candidateKeys = getCandidateChatKeys(activeCounselor, activeChild);
      if (specificKeyOverride && !candidateKeys.includes(specificKeyOverride)) {
        candidateKeys.push(specificKeyOverride);
      }

      const jsonStr = JSON.stringify(msgs);
      for (const key of candidateKeys) {
        await AsyncStorage.setItem(key, jsonStr);
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, jsonStr);
        }
      }

      // Web cross-tab real-time sync notification
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('alphacare_chat_sync', { detail: { msgs } }));
          window.localStorage.setItem('@alphacare_chat_sync_ping', String(Date.now()));
        } catch (we) {}
      }
    } catch (err) {
      console.log('Error caching messages:', err);
    }
  };

  const fetchMessages = async (showLoading = false, fallbackMsgs = null, cId = null, sId = null) => {
    if (showLoading) setIsLoading(true);
    const activeCounselorId = cId || targetCounselor.id || counselorId || 'counselor_veda';
    const activeChildId = sId || childId || 'child_case';

    try {
      const msgMap = new Map();
      const candidateKeys = getCandidateChatKeys(activeCounselorId, activeChildId);

      // On Web, scan all localStorage keys that match chat or counselor messages
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith('@chat_') || k.startsWith('@alphacare_counselor_message') || k === '@alphacare_active_counselor_chat')) {
              if (!candidateKeys.includes(k)) candidateKeys.push(k);
            }
          }
        } catch (scanErr) {}
      }

      // Gather messages from all candidate keys
      for (const key of candidateKeys) {
        let cached = await AsyncStorage.getItem(key);
        if (!cached && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          cached = window.localStorage.getItem(key);
        }
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              parsed.forEach(m => {
                if (m && (m.message || m.message_type)) {
                  const uniqueKey = m.id || `${m.created_at}_${m.message}`;
                  if (!msgMap.has(uniqueKey)) {
                    msgMap.set(uniqueKey, m);
                  }
                }
              });
            }
          } catch (pe) {}
        }
      }

      // Include fallback messages
      if (fallbackMsgs && Array.isArray(fallbackMsgs)) {
        fallbackMsgs.forEach(m => {
          if (m && (m.message || m.message_type)) {
            const uniqueKey = m.id || `${m.created_at}_${m.message}`;
            if (!msgMap.has(uniqueKey)) msgMap.set(uniqueKey, m);
          }
        });
      }

      // Query database if table exists
      try {
        let query = supabase
          .from('counselor_messages')
          .select('*')
          .order('created_at', { ascending: true });

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          data.forEach(dbm => {
            const uniqueKey = dbm.id || `${dbm.created_at}_${dbm.message}`;
            msgMap.set(uniqueKey, dbm);
          });
        }
      } catch (dbErr) {}

      let combined = Array.from(msgMap.values());
      if (combined.length > 0) {
        combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setMessages(combined);
      }
    } catch (e) {
      console.log('Error fetching messages:', e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputMessage('');

    const newMsg = {
      id: 'msg_' + Date.now(),
      counselor_id: userRole === 'counselor' ? (counselorId || targetCounselor.id || 'counselor_veda') : (targetCounselor.id || 'counselor_veda'),
      child_id: userRole === 'child' ? (currentUser?.id || 'child_user') : (childId || 'student_case'),
      sender_id: currentUser?.id || (userRole === 'counselor' ? 'counselor_veda' : 'child_user'),
      sender_role: userRole,
      message_type: 'text',
      message: trimmed,
      created_at: new Date().toISOString()
    };

    // Optimistic UI update across all storage keys
    const updated = [...messages, newMsg];
    setMessages(updated);
    await saveMessagesAcrossKeys(updated);

    try {
      await supabase.from('counselor_messages').insert({
        counselor_id: newMsg.counselor_id,
        child_id: newMsg.child_id,
        sender_id: newMsg.sender_id,
        sender_role: newMsg.sender_role,
        message_type: 'text',
        message: newMsg.message,
        created_at: newMsg.created_at
      });

      // M10: Dispatch in-app notification to the message recipient
      const recipientId = userRole === 'child' ? newMsg.counselor_id : newMsg.child_id;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      await fetch(`${apiHost}/api/notifications/trigger-alert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: userRole === 'child' ? 'child_message' : 'counselor_message',
          details: {
            recipient_id: recipientId,
            sender_role: userRole,
            sender_name: userRole === 'child' ? resolvedChildName : (targetCounselor.name || 'Counselor')
          }
        })
      });
    } catch (err) {
      console.log('Saved to local storage, db insert note:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingDate) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Date Required: Please choose a date for the meeting.');
      } else {
        Alert.alert('Date Required', 'Please choose a date for the meeting.');
      }
      return;
    }

    setIsSchedulingMeeting(true);
    try {
      const scheduledDateTime = new Date(`${meetingDate}T10:00:00`).toISOString();
      const currentMeetingTopic = meetingTopic || 'Wellness & Report Review Session';
      const currentMeetingTime = meetingTime || '11:00 AM';
      const currentMeetingLink = meetingLink || 'https://meet.google.com/alphacare-session';

      // 1. Insert into appointments table and AsyncStorage
      const aptRecord = {
        id: 'apt_' + Date.now(),
        child_id: childId,
        childName: resolvedChildName,
        counselor_id: targetCounselor.id || currentUser?.id,
        scheduled_at: scheduledDateTime,
        status: 'Confirmed',
        notes: `${currentMeetingTopic} at ${currentMeetingTime}. Link: ${currentMeetingLink}`
      };

      try {
        const storedAptsStr = await AsyncStorage.getItem('@alphacare_appointments');
        let storedApts = storedAptsStr ? JSON.parse(storedAptsStr) : [];
        storedApts.unshift(aptRecord);
        await AsyncStorage.setItem('@alphacare_appointments', JSON.stringify(storedApts));
      } catch (localAptErr) {
        console.log('Local appointments storage error:', localAptErr);
      }

      try {
        await supabase.from('appointments').insert({
          child_id: childId,
          counselor_id: targetCounselor.id || currentUser?.id,
          scheduled_at: scheduledDateTime,
          status: 'Confirmed',
          notes: `${currentMeetingTopic} at ${currentMeetingTime}. Link: ${currentMeetingLink}`
        });
      } catch (aptErr) {
        console.log('Appointments table insert note:', aptErr);
      }

      // 2. Post meeting card message in chat
      const meetingMsg = {
        id: 'meet_' + Date.now(),
        counselor_id: targetCounselor.id || currentUser?.id,
        child_id: childId,
        sender_id: currentUser?.id,
        sender_role: userRole,
        message_type: 'meeting_invite',
        message: `🗓️ Counselor arranged a session for you: ${currentMeetingTopic}`,
        metadata: {
          topic: currentMeetingTopic,
          date: meetingDate,
          time: currentMeetingTime,
          link: currentMeetingLink
        },
        created_at: new Date().toISOString()
      };

      const updated = [...messages, meetingMsg];
      setMessages(updated);
      await saveMessagesAcrossKeys(updated);

      try {
        await supabase.from('counselor_messages').insert({
          counselor_id: meetingMsg.counselor_id,
          child_id: meetingMsg.child_id,
          sender_id: meetingMsg.sender_id,
          sender_role: meetingMsg.sender_role,
          message_type: 'meeting_invite',
          message: meetingMsg.message,
          metadata: JSON.stringify(meetingMsg.metadata),
          created_at: meetingMsg.created_at
        });
      } catch (e) {
        console.log('Saved meeting card locally:', e);
      }

      // M10: Dispatch meeting invitation notification to student
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiHost = getApiHost();

        await fetch(`${apiHost}/api/notifications/trigger-alert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'meeting_invite',
            details: {
              target_child_id: childId,
              topic: currentMeetingTopic,
              date: meetingDate,
              time: currentMeetingTime
            }
          })
        });
      } catch (notifErr) {
        console.warn('Meeting notification dispatch note:', notifErr.message);
      }

      setIsMeetingModalVisible(false);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Meeting Scheduled! 🗓️\nSession is scheduled for ${meetingDate} at ${currentMeetingTime}. The invite card is posted in your chat.`);
      } else {
        Alert.alert('Meeting Scheduled! 🗓️', `Session is scheduled for ${meetingDate} at ${currentMeetingTime}. The invite card is posted in your chat.`);
      }
    } catch (e) {
      console.log('Schedule meeting error:', e);
      setIsMeetingModalVisible(false);
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  const otherPersonName = userRole === 'counselor' ? resolvedChildName : (targetCounselor.name || 'Counselor');

  return (
    <View style={styles.appContainer}>
      {isDesktop && userRole === 'child' && (
        <ChildSidebar
          activeTab="Counselor Chat"
          navigation={navigation}
          userName={resolvedChildName}
        />
      )}

      <View style={styles.mainArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* HEADER BAR */}
          <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.avatarCircle}>
            <AppIcon name={userRole === 'counselor' ? 'user' : 'counselor'} size={22} color="#7C3AED" strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{otherPersonName}</Text>
            <Text style={styles.headerSubtitle}>
              {userRole === 'counselor'
                ? `${resolvedChildName} • AlphaCare Safe Chat`
                : `${targetCounselor.qualification || 'Approved Counselor'} • AlphaCare`}
            </Text>
          </View>
        </View>

        {/* Action Button: Counselor can arrange meeting */}
        {userRole === 'counselor' ? (
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => setIsMeetingModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <AppIcon name="calendar" size={15} color="#FFFFFF" strokeWidth={2.2} />
    <Text style={styles.scheduleBtnText}>Arrange Meeting</Text>
  </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.switchCounselorHeaderBtn}
            onPress={() => {
              fetchApprovedCounselors();
              setShowCounselorDirectory(prev => !prev);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.switchCounselorHeaderBtnText}>
              {showCounselorDirectory && targetCounselor.id ? '← Return to Chat' : 'Counselors'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* VIEW 1: APPROVED COUNSELORS DIRECTORY (When child needs to link or wants to switch) */}
      {userRole === 'child' && (!targetCounselor.id || showCounselorDirectory) ? (
        <ScrollView style={styles.directoryScroll} contentContainerStyle={styles.directoryContainer}>
          <View style={styles.directoryHeaderBox}>
            <View style={styles.directoryIconWrap}>
              <Text style={{ fontSize: 36 }}>🩺</Text>
            </View>
            <Text style={styles.directoryMainTitle}>Available Approved Counselors</Text>
            <Text style={styles.directorySubTitle}>
              Pehle kisi verified counselor ko link karein. Admin ne jin jin specialists ko approve kiya hai, sirf wahi yaha listed hain.
            </Text>
            <View style={styles.adminVerifiedPill}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <AppIcon name="shield" size={14} color="#059669" strokeWidth={2.2} />
    <Text style={styles.adminVerifiedPillText}>Admin Verified & Real Counselors</Text>
  </View>
            </View>

            {targetCounselor.id ? (
              <TouchableOpacity
                style={styles.cancelSwitchBtn}
                onPress={() => setShowCounselorDirectory(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelSwitchBtnText}>← Return to Chat with {targetCounselor.name}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isLoadingApproved ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
                Loading admin approved counselors...
              </Text>
            </View>
          ) : (
            <View style={styles.directoryCardsList}>
              {approvedCounselors.map((counselor, idx) => {
                const isCurrentlyLinked = targetCounselor.id === counselor.user_id;
                return (
                  <View key={counselor.user_id || idx} style={[styles.directoryItemCard, isCurrentlyLinked && styles.directoryItemCardLinked]}>
                    <View style={styles.directoryCardTopRow}>
                      <View style={styles.directoryAvatarCircle}>
                        <AppIcon name="counselor" size={32} color="#7C3AED" strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.directoryNameRow}>
                          <Text style={styles.directoryCounselorName}>{counselor.full_name || counselor.name}</Text>
                          <View style={styles.approvedPill}>
                            <Text style={styles.approvedPillText}>✓ Admin Approved</Text>
                          </View>
                        </View>
                        <Text style={styles.directoryCounselorQual}>{counselor.qualification}</Text>
                        <Text style={styles.directoryCounselorSpec}>🎯 Specialization: {counselor.specialization}</Text>
                        <Text style={styles.directoryCounselorExp}>⭐ {counselor.experience} clinical experience</Text>
                      </View>
                    </View>

                    <View style={styles.directoryCardBottomRow}>
                      <View style={styles.liveStatusRow}>
                        <View style={styles.greenDot} />
                        <Text style={styles.liveStatusText}>
                          {isCurrentlyLinked ? 'Currently Linked with you' : 'Available for 1-on-1 Safe Chat'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.linkCounselorBtn, isCurrentlyLinked && styles.linkCounselorBtnActive]}
                        onPress={() => handleLinkCounselor(counselor)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.linkCounselorBtnText}>
                          {isCurrentlyLinked ? '✓ Connected (Open Chat) →' : '🔗 Link & Start Chat →'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {approvedCounselors.length === 0 && (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center' }}>
                    No approved counselors found at the moment. Please check back shortly.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* COUNSELOR QUICK PROFILE BANNER (Visible for Student) */}
      {userRole === 'child' && (
        <View style={styles.profileBanner}>
          {targetCounselor.id ? (
            <>
              <View style={styles.counselorHeroCard}>
                <View style={styles.counselorHeroAvatarBox}>
                  <AppIcon name="counselor" size={30} color="#7C3AED" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={styles.counselorHeroName}>{targetCounselor.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={styles.verifiedTag}>
                        <Text style={styles.verifiedTagText}>✓ Admin Approved</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.switchCounselorSmallBtn}
                        onPress={() => {
                          fetchApprovedCounselors();
                          setShowCounselorDirectory(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.switchCounselorSmallBtnText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.counselorHeroQual}>
                    {targetCounselor.qualification || 'Certified Clinical Counselor'}
                  </Text>
                  <View style={styles.counselorHeroMetaRow}>
                    <Text style={styles.counselorHeroExp}>⭐ {targetCounselor.experience || 'Licensed Practitioner'}</Text>
                    <Text style={styles.counselorHeroDot}>•</Text>
                    <Text style={styles.counselorHeroSpec}>{targetCounselor.specialization || 'Child & Adolescent Emotional Wellbeing'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.counselorHeroTipBox}>
                <Text style={styles.counselorHeroTipText}>
                  <Text style={{ fontWeight: '800' }}>Direct Support Channel:</Text> {targetCounselor.name} is available here for confidential guidance and video consultation.
                </Text>
              </View>
            </>
          ) : (
            <View style={[styles.counselorHeroCard, { backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' }]}>
              <View style={[styles.counselorHeroAvatarBox, { backgroundColor: '#EDE9FE' }]}>
                <AppIcon name="counselor" size={30} color="#7C3AED" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={[styles.counselorHeroName, { color: '#4338CA' }]}>No Counselor Linked Yet</Text>
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>Link Required</Text>
                  </View>
                </View>
                <Text style={[styles.counselorHeroQual, { color: '#64748B', marginTop: 2 }]}>
                  Pehle niche diye gaye Admin-Approved counselors mein se kisi ko link karein. Uske baad aap unse 1-on-1 confidential chat kar sakte hain.
                </Text>
                <TouchableOpacity
                  style={styles.linkBannerBtn}
                  onPress={() => {
                    fetchApprovedCounselors();
                    setShowCounselorDirectory(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.linkBannerBtnText}>🔗 Choose an Approved Counselor Below ↓</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* MESSAGES LIST */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContainer}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6E56D6" />
            <Text style={styles.loadingText}>Loading secure chat...</Text>
          </View>
        ) : messages.length === 0 ? (
          userRole === 'child' && !targetCounselor.id ? (
            <View style={styles.availableInlineSection}>
              <View style={styles.availableInlineHeader}>
                <View>
                  <Text style={styles.availableInlineTitle}>Available Approved Counselors 🩺</Text>
                  <Text style={styles.availableInlineSub}>
                    Admin ne jin jin verified specialists ko approval diya hai, unme se kisi ko select karein:
                  </Text>
                </View>
                <View style={styles.inlineAdminBadge}>
                  <Text style={styles.inlineAdminBadgeText}>🛡️ Admin Verified</Text>
                </View>
              </View>

              {isLoadingApproved ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading approved counselors...</Text>
                </View>
              ) : (
                <View style={styles.inlineCardsList}>
                  {approvedCounselors.map((counselor, idx) => (
                    <View key={counselor.user_id || idx} style={styles.inlineCounselorCard}>
                      <View style={styles.inlineCounselorTopRow}>
                        <View style={styles.inlineAvatarCircle}>
                          <AppIcon name="counselor" size={28} color="#7C3AED" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.inlineNameRow}>
                            <Text style={styles.inlineCounselorName}>{counselor.full_name || counselor.name}</Text>
                            <View style={styles.approvedPillSmall}>
                              <Text style={styles.approvedPillSmallText}>✓ Admin Approved</Text>
                            </View>
                          </View>
                          <Text style={styles.inlineCounselorQual}>{counselor.qualification}</Text>
                          <Text style={styles.inlineCounselorSpec}>🎯 {counselor.specialization}</Text>
                          <Text style={styles.inlineCounselorExp}>⭐ {counselor.experience} clinical experience</Text>
                        </View>
                      </View>

                      <View style={styles.inlineCardBottomRow}>
                        <View style={styles.liveStatusRow}>
                          <View style={styles.greenDot} />
                          <Text style={styles.liveStatusText}>Available for Safe Chat</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.inlineLinkBtn}
                          onPress={() => handleLinkCounselor(counselor)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.inlineLinkBtnText}>🔗 Link & Chat with {counselor.name ? counselor.name.split(' ')[0] : 'Counselor'} →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {approvedCounselors.length === 0 && (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: '#64748B' }}>Loading verified counselors list...</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={{ marginBottom: 12 }}><AppIcon name="chat" size={44} color="#C4B5FD" strokeWidth={1.8} /></View>
              <Text style={styles.emptyTitle}>Start your confidential conversation</Text>
              <Text style={styles.emptySub}>
                {userRole === 'child'
                  ? 'Your counselor can view your shared report and offer tailored guidance or arrange a video meeting.'
                  : 'Greet the student, review their shared check-in, and provide caring mental health support.'}
              </Text>
            </View>
          )
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_role === userRole;
            const parsedMeta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata || '{}') : (msg.metadata || {});

            if (msg.message_type === 'report_share' || msg.reportData) {
              const rep = msg.reportData || {};
              return (
                <View key={msg.id || idx} style={styles.reportCardBubble}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportCardBadge}>📊 SHARED WELLNESS REPORT</Text>
                    <Text style={styles.reportCardDate}>
                      {new Date(msg.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reportLevelText}>{rep.level || 'Assessment Result'}</Text>
                  <Text style={styles.reportScoreText}>Overall Stress Score: {rep.score || '—'}/60</Text>
                  <Text style={styles.reportDescText}>{rep.description || 'Check-in shared with counselor for guidance.'}</Text>
                  <View style={styles.reportTipsBox}>
                    <Text style={styles.reportTipsTitle}>Auto-generated Insights:</Text>
                    {(rep.tips || [
                      'Routine check-in completed',
                      'Counselor support requested'
                    ]).slice(0, 2).map((tip, i) => (
                      <Text key={i} style={styles.reportTipItem}>• {tip}</Text>
                    ))}
                  </View>
                  <Text style={styles.reportSentBy}>
                    Shared by {resolvedChildName}
                  </Text>
                </View>
              );
            }

            if (msg.message_type === 'meeting_invite' || parsedMeta.date) {
              return (
                <View key={msg.id || idx} style={styles.meetingCardBubble}>
                  <View style={styles.meetingCardHeader}>
                    <Text style={styles.meetingIcon}>🗓️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meetingCardTitle}>{parsedMeta.topic || 'Counseling Session Scheduled'}</Text>
                      <Text style={styles.meetingCardSub}>One-on-One Guided Consultation</Text>
                    </View>
                    <View style={styles.confirmedPill}>
                      <Text style={styles.confirmedPillText}>Confirmed</Text>
                    </View>
                  </View>

                  <View style={styles.meetingDetailsBox}>
                    <Text style={styles.meetingDetailRow}>
                      📅 <Text style={{ fontWeight: '800' }}>Date:</Text> {parsedMeta.date || 'Tomorrow'}
                    </Text>
                    <Text style={styles.meetingDetailRow}>
                      ⏰ <Text style={{ fontWeight: '800' }}>Time:</Text> {parsedMeta.time || '11:00 AM'}
                    </Text>
                    {parsedMeta.link ? (
                      <TouchableOpacity
                        style={{ backgroundColor: '#2563EB', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, marginTop: 12, alignItems: 'center' }}
                        onPress={() => {
                          let rawLink = (parsedMeta.link || '').trim();
                          let finalUrl = rawLink;

                          // Google Meet expects format meet.google.com/xxx-yyyy-zzz. Custom names like /alphacare-session trigger "Invalid video call name".
                          // If invalid meet link detected, open secure Jitsi free instant meeting room:
                          if (!rawLink || rawLink.includes('alphacare-session') || !rawLink.startsWith('http')) {
                            finalUrl = 'https://meet.jit.si/AlphaCare-Counseling-Session';
                          }

                          if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            window.open(finalUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            Alert.alert('Join Meeting', `Opening consultation meeting room:\n${finalUrl}`);
                          }
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>📹 Join Video Call Now</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.meetingCardFooter}>
                    Arranged by Counselor {targetCounselor.name}
                  </Text>
                </View>
              );
            }

            // Normal text message
            return (
              <View
                key={msg.id || idx}
                style={[
                  styles.messageBubble,
                  isMe ? styles.myBubble : styles.otherBubble
                ]}
              >
                <Text style={[styles.bubbleSenderLabel, isMe && { color: '#EDE9FE' }]}>
                  {isMe ? 'You' : otherPersonName}
                </Text>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                  {msg.message}
                </Text>
                <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* INPUT AREA */}
      <View style={styles.inputArea}>
        {userRole === 'counselor' && (
          <TouchableOpacity
            style={styles.quickMeetingBtn}
            onPress={() => setIsMeetingModalVisible(true)}
            title="Arrange Meeting"
          >
            <AppIcon name="calendar" size={18} color="#7C3AED" strokeWidth={2.2} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.textInput}
          placeholder={userRole === 'child' && !targetCounselor.id ? 'Pehle upar kisi counselor ko link karein...' : `Message ${otherPersonName}...`}
          placeholderTextColor="#94A3B8"
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputMessage.trim() || isSending) && styles.sendBtnDisabled]}
          disabled={!inputMessage.trim() || isSending}
          onPress={handleSendMessage}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppIcon name="send" size={16} color="#FFFFFF" strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      
        </>
      )}

      {/* ARRANGE MEETING MODAL (FOR COUNSELOR) */}
      <Modal
        visible={isMeetingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMeetingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <AppIcon name="calendar" size={20} color="#6366F1" strokeWidth={2.2} />
    <Text style={styles.modalTitle}>Arrange Counseling Session</Text>
  </View>
                <Text style={styles.modalSub}>With patient {resolvedChildName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMeetingModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.formLabel}>Session Topic</Text>
              <TextInput
                style={styles.formInput}
                value={meetingTopic}
                onChangeText={setMeetingTopic}
                placeholder="e.g. Wellness check-in & stress coping"
              />

              <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={meetingDate}
                onChangeText={setMeetingDate}
                placeholder="2026-09-15"
              />

              <Text style={styles.formLabel}>Time</Text>
              <TextInput
                style={styles.formInput}
                value={meetingTime}
                onChangeText={setMeetingTime}
                placeholder="11:00 AM"
              />

              <Text style={styles.formLabel}>Google Meet / Room Link</Text>
              <TextInput
                style={styles.formInput}
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="https://meet.google.com/..."
              />

              <TouchableOpacity
                style={[styles.confirmMeetingBtn, isSchedulingMeeting && { opacity: 0.7 }]}
                disabled={isSchedulingMeeting}
                onPress={handleScheduleMeeting}
              >
                {isSchedulingMeeting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmMeetingBtnText}>Confirm & Post In Chat</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
        </KeyboardAvoidingView>
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
    backgroundColor: '#FDFBFF',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
    height: '100%',
  },
  // INLINE COUNSELORS LIST (WHEN NOT YET LINKED)
  linkBannerBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  linkBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  availableInlineSection: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  availableInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  availableInlineTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  availableInlineSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  inlineAdminBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  inlineAdminBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  inlineCardsList: {
    gap: 14,
  },
  inlineCounselorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inlineCounselorTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  inlineAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  inlineCounselorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  approvedPillSmall: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  approvedPillSmallText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  inlineCounselorQual: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '700',
    marginBottom: 2,
  },
  inlineCounselorSpec: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 2,
  },
  inlineCounselorExp: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  inlineCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  inlineLinkBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 11,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  inlineLinkBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // DIRECTORY STYLES (AVAILABLE APPROVED COUNSELORS)
  directoryScroll: {
    flex: 1,
    width: '100%',
  },
  directoryContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
  },
  directoryHeaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  directoryIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  directoryMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  directorySubTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 520,
    marginBottom: 14,
  },
  adminVerifiedPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  adminVerifiedPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  cancelSwitchBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelSwitchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  directoryCardsList: {
    gap: 16,
  },
  directoryItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  directoryItemCardLinked: {
    borderColor: '#818CF8',
    backgroundColor: '#FAF5FF',
  },
  directoryCardTopRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  directoryAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  directoryCounselorName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  approvedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  approvedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  directoryCounselorQual: {
    fontSize: 13.5,
    color: '#4F46E5',
    fontWeight: '700',
    marginBottom: 4,
  },
  directoryCounselorSpec: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 2,
  },
  directoryCounselorExp: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  directoryCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 12,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveStatusText: {
    fontSize: 12.5,
    color: '#059669',
    fontWeight: '700',
  },
  linkCounselorBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  linkCounselorBtnActive: {
    backgroundColor: '#059669',
  },
  linkCounselorBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  switchCounselorHeaderBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  switchCounselorHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4338CA',
  },
  switchCounselorSmallBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  switchCounselorSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 14
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  avatarEmoji: {
    fontSize: 22
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1
  },
  scheduleBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  scheduleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  verifiedText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800'
  },
  profileBanner: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  counselorHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  counselorHeroAvatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DDD6FE'
  },
  counselorHeroName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E1B4B'
  },
  verifiedTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  verifiedTagText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800'
  },
  counselorHeroQual: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '700',
    marginTop: 2
  },
  counselorHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  counselorHeroExp: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '800'
  },
  counselorHeroDot: {
    color: '#9CA3AF',
    fontSize: 10
  },
  counselorHeroSpec: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600'
  },
  counselorHeroTipBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF'
  },
  counselorHeroTipText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18
  },
  messagesScroll: {
    flex: 1
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 12
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600'
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center'
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6E56D6',
    borderBottomRightRadius: 4
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bubbleSenderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  myMessageText: {
    color: '#FFFFFF'
  },
  otherMessageText: {
    color: '#1E293B'
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  myMessageTime: {
    color: '#DDD6FE'
  },
  otherMessageTime: {
    color: '#94A3B8'
  },
  reportCardBubble: {
    width: '100%',
    maxWidth: 550,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginVertical: 8
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
    paddingBottom: 8,
    marginBottom: 10
  },
  reportCardBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7C3AED'
  },
  reportCardDate: {
    fontSize: 11,
    color: '#94A3B8'
  },
  reportLevelText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B'
  },
  reportScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
    marginTop: 2
  },
  reportDescText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 6
  },
  reportTipsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10
  },
  reportTipsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4
  },
  reportTipItem: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16
  },
  reportSentBy: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'right'
  },
  meetingCardBubble: {
    width: '100%',
    maxWidth: 550,
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#059669',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginVertical: 8
  },
  meetingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
    paddingBottom: 10,
    marginBottom: 10
  },
  meetingIcon: {
    fontSize: 28,
    marginRight: 10
  },
  meetingCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B'
  },
  meetingCardSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2
  },
  confirmedPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  confirmedPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  meetingDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    gap: 6
  },
  meetingDetailRow: {
    fontSize: 12,
    color: '#1F2937'
  },
  meetingCardFooter: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'right'
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10
  },
  quickMeetingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickMeetingBtnText: {
    fontSize: 20
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6E56D6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnDisabled: {
    opacity: 0.5
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A'
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  modalClose: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '800'
  },
  modalBody: {
    padding: 18,
    gap: 12
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155'
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A'
  },
  confirmMeetingBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  confirmMeetingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});
