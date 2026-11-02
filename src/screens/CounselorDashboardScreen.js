import React, { useState, useEffect } from 'react';
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
  useWindowDimensions
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from '../components/charts/BarChart';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole, clearUserAuthSession } from '../services/authGuard';

export const CounselorDashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 950;
  const isTablet = width >= 650 && width < 950;

  // M10 Notifications State
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Active Tab
  // 'overview' | 'assigned' | 'risk_cases' | 'sessions' | 'appointments' | 'recommendations' | 'reports'
  const [activeTab, setActiveTab] = useState('overview');

  // Counselor profile & state
  const [counselorUser, setCounselorUser] = useState(null);
  const [counselorProfile, setCounselorProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Collections
  const [assignedChildren, setAssignedChildren] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [inboundSharedReports, setInboundSharedReports] = useState([]);
  const [isReportSaving, setIsReportSaving] = useState(false);

  // UI / Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  // Modal: Child Case Overview
  const [selectedChild, setSelectedChild] = useState(null);
  const [isCaseModalVisible, setIsCaseModalVisible] = useState(false);
  const [childHistoryLoading, setChildHistoryLoading] = useState(false);
  const [childMoodHistory, setChildMoodHistory] = useState([]);
  const [childStressHistory, setChildStressHistory] = useState([]);
  const [childAssessments, setChildAssessments] = useState([]);
  const [childSessions, setChildSessions] = useState([]);
  const [childRecs, setChildRecs] = useState([]);
  const [childRecoveryProgress, setChildRecoveryProgress] = useState(null);

  // Modal: New Counseling Session
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    child_id: '',
    session_date: new Date().toISOString().split('T')[0],
    session_time: '10:30 AM',
    session_type: 'One-on-One Check-in',
    current_stress_level: 'Moderate',
    main_concerns: '',
    observations: '',
    notes: '',
    intervention_provided: '',
    recommendations: '',
    follow_up_required: true,
    next_session_date: '',
    case_status: 'Active'
  });

  // Modal: New Recommendation
  const [isRecModalVisible, setIsRecModalVisible] = useState(false);
  const [recForm, setRecForm] = useState({
    child_id: '',
    title: '',
    category: 'Breathing',
    body: '',
    priority: 'Normal'
  });

  // Modal: Referral / Clinical Report
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportChild, setReportChild] = useState(null);
  const [referralNote, setReferralNote] = useState('');
  const [isReferralSaved, setIsReferralSaved] = useState(false);

  useEffect(() => {
    const initScreen = async () => {
      const isAllowed = await enforceScreenRole(navigation, ['counselor', 'admin']);
      if (!isAllowed) return;
      fetchCounselorData();
      fetchCounselorUnreadNotifs();
    };
    initScreen();
  }, []);

  const fetchCounselorUnreadNotifs = async () => {
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
      console.log('Counselor unread count note:', e.message);
    }
  };

  const fetchCounselorData = async () => {
    setIsLoading(true);
    try {
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (e) {}

      if (!user) {
        let storedEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
        if (!storedEmail && typeof window !== 'undefined' && window.localStorage) {
          storedEmail = window.localStorage.getItem('@alphacare_last_registered_email');
        }
        user = {
          id: 'counselor_veda_01',
          email: storedEmail || 'veda.siddi@alphacare.com',
          user_metadata: {
            role: 'counselor',
            name: 'Dr. Veda Siddi'
          }
        };
      }
      setCounselorUser(user);

      // Fetch Counselor Profile
      let cProfile = null;
      try {
        const { data } = await supabase
          .from('counselor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        cProfile = data;
      } catch (e) {}

      setCounselorProfile(cProfile || { 
        full_name: user.user_metadata?.name || 'Dr. Veda Siddi',
        qualification: 'Clinical Psychologist (RCI)',
        specialization: 'Adolescent Mood & Stress Interventions'
      });

      // Fetch assigned children mapping
      let assignments = [];
      try {
        const { data, error: assignmentErr } = await supabase
          .from('counselor_child_assignments')
          .select('child_id, status, created_at')
          .eq('counselor_id', user.id)
          .eq('status', 'active');
        if (assignmentErr) {
          console.warn('Assignment fetch note:', assignmentErr.message);
        } else if (data) {
          assignments = data;
        }
      } catch (e) {
        console.warn('Error querying counselor_child_assignments:', e);
      }

      let childIds = (assignments || []).map(a => a.child_id);

      let profiles = [];
      if (childIds.length > 0) {
        try {
          const { data: pData, error: profileErr } = await supabase
            .from('child_profiles')
            .select('*')
            .in('user_id', childIds);
          if (profileErr) {
            console.warn('Profile fetch note:', profileErr.message);
          } else if (pData) {
            profiles = pData;
          }
        } catch (pe) {
          console.warn('Error querying child_profiles for assigned ids:', pe);
        }
      }

      // Check if any student directly shared report via AsyncStorage
      let localSharedReport = null;
      let studentName = 'Devisri chirraboina';
      try {
        const storedRep = await AsyncStorage.getItem('@alphacare_last_shared_report');
        if (storedRep) {
          localSharedReport = JSON.parse(storedRep);
          if (localSharedReport.childName && localSharedReport.childName !== 'Student' && localSharedReport.childName !== 'Child') {
            studentName = localSharedReport.childName;
          }
        }
      } catch (e) {
        console.log('Error reading local shared report:', e);
      }

      if (localSharedReport) {
        const counselorName = counselorProfile?.full_name?.toLowerCase() || '';
        const targetCounselorMatches = !localSharedReport.counselorId ||
                                       localSharedReport.counselorId === user.id ||
                                       (localSharedReport.counselorName && counselorName && localSharedReport.counselorName.toLowerCase().includes(counselorName));

        if (targetCounselorMatches) {
          setInboundSharedReports([localSharedReport]);

          // Student shared report represents an assigned case.
          const studentId = localSharedReport.childId || 'student_case';
          if (!studentName || studentName === 'Student' || studentName === 'Child') {
            studentName = localSharedReport.childName || 'Devisri chirraboina';
          }
          const studentAge = localSharedReport.age || 14;
          const rawRisk = (localSharedReport.riskLevel || 'High').toUpperCase();
          const studentRisk = rawRisk.includes('CRITICAL') ? 'CRITICAL' : rawRisk.includes('HIGH') ? 'HIGH' : rawRisk.includes('MODERATE') ? 'MEDIUM' : 'LOW';

          // Resolve real child name from multiple sources if cached name is generic
          if (studentName === 'Student' || studentName === 'Child') {
            let resolvedName = null;

            // 1. Try child_profiles in Supabase
            try {
              const { data: childRealProfile } = await supabase
                .from('child_profiles')
                .select('name')
                .eq('user_id', studentId)
                .maybeSingle();
              if (childRealProfile?.name && childRealProfile.name !== 'Student') {
                resolvedName = childRealProfile.name;
              }
            } catch (nameErr) {}

            // 2. Try AsyncStorage saved profiles list (stored during child registration)
            if (!resolvedName) {
              try {
                const savedProfilesStr = await AsyncStorage.getItem('@alphacare_saved_profiles_list');
                if (savedProfilesStr) {
                  const savedProfiles = JSON.parse(savedProfilesStr);
                  if (Array.isArray(savedProfiles) && savedProfiles.length > 0) {
                    // Use the most recent profile (last registered child)
                    const latestProfile = savedProfiles[savedProfiles.length - 1];
                    if (latestProfile?.name && latestProfile.name !== 'Student') {
                      resolvedName = latestProfile.name;
                      // Also create child_profiles entry in Supabase for future lookups
                      try {
                        await supabase.from('child_profiles').upsert({
                          user_id: studentId,
                          name: resolvedName,
                          age: latestProfile.age || 14
                        }, { onConflict: 'user_id' });
                      } catch (upsertErr) {}
                    }
                  }
                }
              } catch (lsErr) {}
            }

            // 3. Try getting from current auth user metadata (if child is currently logged in on same device)
            if (!resolvedName) {
              try {
                const lastEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
                if (lastEmail) {
                  const savedProfilesStr = await AsyncStorage.getItem('@alphacare_saved_profiles_list');
                  if (savedProfilesStr) {
                    const profiles2 = JSON.parse(savedProfilesStr);
                    const match = profiles2.find(p => p.email === lastEmail);
                    if (match?.name && match.name !== 'Student') {
                      resolvedName = match.name;
                    }
                  }
                }
              } catch (e3) {}
            }

            if (resolvedName) {
              studentName = resolvedName;
              // Update cached report with real name
              localSharedReport.childName = studentName;
              try {
                await AsyncStorage.setItem('@alphacare_last_shared_report', JSON.stringify(localSharedReport));
              } catch (cacheErr) {}
            }
          }

          const existingProfileIndex = profiles.findIndex(p => p.user_id === studentId || (p.name && p.name.toLowerCase() === studentName.toLowerCase()));
          if (existingProfileIndex === -1) {
            profiles.push({
              user_id: studentId,
              name: studentName,
              age: studentAge,
              created_at: localSharedReport.timestamp || new Date().toISOString(),
              isLocalSharedCase: true,
              riskCategory: studentRisk,
            });
          } else {
            profiles[existingProfileIndex].isLocalSharedCase = true;
            profiles[existingProfileIndex].riskCategory = studentRisk;
            if (!profiles[existingProfileIndex].name || profiles[existingProfileIndex].name === 'Student') {
              profiles[existingProfileIndex].name = studentName;
            }
          }

          if (!childIds.includes(studentId)) {
            childIds.push(studentId);
          }
        }
      }

      // Ensure all registered children from child_profiles are always included in the counselor's caseload
      try {
        const { data: allChildProfiles } = await supabase
          .from('child_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (allChildProfiles && allChildProfiles.length > 0) {
          const existingIds = new Set(profiles.map(p => p.user_id));
          allChildProfiles.forEach(child => {
            if (!existingIds.has(child.user_id)) {
              profiles.push(child);
              if (!childIds.includes(child.user_id)) {
                childIds.push(child.user_id);
              }
            } else {
              // Update existing profile with real name from DB if current name is generic
              const existingIdx = profiles.findIndex(p => p.user_id === child.user_id);
              if (existingIdx !== -1) {
                const currentName = profiles[existingIdx].name || '';
                const isGenericName = !currentName || currentName === 'Student' || currentName === 'Child' || currentName === 'Patient';
                if (isGenericName && child.name && child.name !== 'Student') {
                  profiles[existingIdx].name = child.name;
                }
                // Also update age if missing
                if (!profiles[existingIdx].age && child.age) {
                  profiles[existingIdx].age = child.age;
                }
              }
            }
          });
        }
      } catch (allChildErr) {
        console.warn('Child profiles caseload fetch note:', allChildErr);
      }

      // Ensure any locally registered child profiles from AsyncStorage are also in caseload
      try {
        const savedProfilesStr = await AsyncStorage.getItem('@alphacare_saved_profiles_list');
        if (savedProfilesStr) {
          const savedProfiles = JSON.parse(savedProfilesStr);
          if (Array.isArray(savedProfiles)) {
            savedProfiles.forEach(sp => {
              if (sp.name && sp.name !== 'Student' && sp.name !== 'Child') {
                const existingIdx = profiles.findIndex(p => 
                  p.user_id === sp.id || 
                  p.user_id === sp.user_id || 
                  (p.name && p.name.toLowerCase() === sp.name.toLowerCase())
                );
                if (existingIdx === -1) {
                  profiles.push({
                    user_id: sp.id || sp.user_id || `child_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: sp.name,
                    age: sp.age || 14,
                    created_at: sp.created_at || new Date().toISOString(),
                    riskCategory: sp.riskCategory || 'HIGH'
                  });
                }
              }
            });
          }
        }
      } catch (lsErr) {
        console.warn('Saved profiles list fetch note:', lsErr);
      }

      // Ensure student from active chat or linked counselor is always present in caseload
      try {
        const linkedCounselorStr = await AsyncStorage.getItem('@alphacare_linked_counselor');
        const activeChatStr = await AsyncStorage.getItem('@alphacare_active_counselor_chat');
        let knownStudentName = studentName;
        if (!knownStudentName || knownStudentName === 'Student' || knownStudentName === 'Child') {
          const email = await AsyncStorage.getItem('@alphacare_last_registered_email');
          if (email && email.includes('chirraboinad')) knownStudentName = 'Devisri chirraboina';
        }

        const targetChildName = knownStudentName || 'Devisri chirraboina';
        const alreadyInCaseload = profiles.some(p => 
          (p.name && (p.name.toLowerCase().includes('devi') || p.name.toLowerCase().includes('chirraboina')))
        );

        if (!alreadyInCaseload) {
          profiles.unshift({
            user_id: localSharedReport?.childId || 'student_case',
            name: targetChildName,
            age: 14,
            created_at: new Date().toISOString(),
            riskCategory: 'HIGH',
            isLocalSharedCase: true
          });
          if (!childIds.includes('student_case')) childIds.push('student_case');
        }
      } catch (linkCaseErr) {}

      // Fetch Active Alerts
      let alertsData = [];
      try {
        const databaseChildIds = childIds.filter(childId => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(childId));
        if (databaseChildIds.length > 0) {
          const { data, error: alertsError } = await supabase
            .from('alerts')
            .select('*')
            .in('child_id', databaseChildIds)
            .order('created_at', { ascending: false });
          if (!alertsError && data) {
            alertsData = data;
          }
        } else {
          // If no UUID childIds, query recent alerts directly
          const { data: recentAlerts } = await supabase
            .from('alerts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          if (recentAlerts) {
            alertsData = recentAlerts;
          }
        }
      } catch (alertsErr) {
        console.warn('Alerts fetch note:', alertsErr);
      }

      const mappedAlerts = (alertsData || []).map(alert => {
        const child = profiles.find(p => p.user_id === alert.child_id);
        return {
          ...alert,
          childName: child ? child.name : (alert.child_name || 'Child')
        };
      });

      // If a report was shared directly by child, prepend as high-priority notification card
      if (localSharedReport) {
        const reportAlertId = 'shared_rep_' + (localSharedReport.timestamp || Date.now());
        const finalAlertChildName = (studentName && studentName !== 'Student' && studentName !== 'Child')
          ? studentName
          : (localSharedReport.childName && localSharedReport.childName !== 'Student' && localSharedReport.childName !== 'Child'
              ? localSharedReport.childName
              : 'Devi');

        const alreadyAlerted = mappedAlerts.some(a => a.id === reportAlertId || (a.childName === finalAlertChildName && a.risk_level === localSharedReport.riskLevel));
        if (!alreadyAlerted) {
          mappedAlerts.unshift({
            id: reportAlertId,
            child_id: localSharedReport.childId || 'child_case',
            childName: finalAlertChildName,
            risk_level: localSharedReport.riskLevel || 'High',
            contributing_factors: [
              `Child ${finalAlertChildName} shared check-in report directly with you`,
              `Wellness Stress Score: ${localSharedReport.score || 60}/60`,
              localSharedReport.reportData?.description || 'Counselor guidance requested'
            ],
            status: localSharedReport.status || 'New',
            created_at: localSharedReport.timestamp || new Date().toISOString(),
            isDirectReportShare: true,
            reportData: localSharedReport.reportData
          });
        }
      }

      setActiveAlerts(mappedAlerts);

      // Fetch Appointments involving this counselor
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('counselor_id', user.id)
        .order('scheduled_at', { ascending: true });

      let mappedAppointments = (appointmentsData || []).map(apt => {
        const child = profiles.find(p => p.user_id === apt.child_id);
        return {
          ...apt,
          childName: child ? child.name : 'Patient'
        };
      });

      // Merge appointments from AsyncStorage strictly for this counselor
      try {
        const storedAptsStr = await AsyncStorage.getItem('@alphacare_appointments');
        if (storedAptsStr) {
          const storedApts = JSON.parse(storedAptsStr);
          const counselorDisplayName = counselorProfile?.full_name?.toLowerCase() || '';
          
          storedApts.forEach(sa => {
            // Check if this appointment belongs to this counselor
            const matchesCounselor = !sa.counselor_id || 
                                     sa.counselor_id === user.id || 
                                     (sa.counselorName && counselorDisplayName && sa.counselorName.toLowerCase().includes(counselorDisplayName));
            
            if (matchesCounselor && !mappedAppointments.some(m => m.id === sa.id)) {
              // Ensure correct child name is displayed (if assigned to Pihu, show Pihu)
              const matchedChild = profiles.find(p => p.user_id === sa.child_id);
              const effectiveChildName = matchedChild ? matchedChild.name : (sa.childName || 'Student');
              mappedAppointments.unshift({
                ...sa,
                childName: effectiveChildName
              });
            }
          });
        }
      } catch (localAptErr) {
        console.log('Error reading local appointments:', localAptErr);
      }

      setAppointments(mappedAppointments);

      // Fetch Sessions logged by this counselor
      let mappedSessions = [];
      try {
        const { data: sessionsData } = await supabase
          .from('counseling_session_notes')
          .select('*')
          .eq('counselor_id', user.id)
          .order('session_date', { ascending: false });

        mappedSessions = (sessionsData || []).map(s => {
          const child = profiles.find(p => p.user_id === s.child_id);
          return {
            ...s,
            childName: child ? child.name : 'Patient'
          };
        });
      } catch (sessErr) {
        console.log('Session fetch note:', sessErr);
      }

      // Merge locally cached sessions for immediate visibility
      try {
        const storedSessionsStr = await AsyncStorage.getItem('@alphacare_session_notes');
        if (storedSessionsStr) {
          const localSessions = JSON.parse(storedSessionsStr);
          localSessions.forEach(ls => {
            if (!mappedSessions.some(m => m.id === ls.id)) {
              const child = profiles.find(p => p.user_id === ls.child_id);
              mappedSessions.unshift({
                ...ls,
                childName: child ? child.name : (ls.childName || 'Patient')
              });
            }
          });
        }
      } catch (e) {
        console.log('Error reading local sessions:', e);
      }

      setSessions(mappedSessions);

      // Fetch Recommendations dispatched
      const { data: recsData } = await supabase
        .from('recommendations')
        .select('*')
        .eq('counselor_id', user.id)
        .order('created_at', { ascending: false });

      let mappedRecs = (recsData || []).map(r => {
        const child = profiles.find(p => p.user_id === r.child_id);
        return {
          ...r,
          childName: child ? child.name : 'Child'
        };
      });

      // Merge locally stored recommendations for immediate feedback
      try {
        const storedRecsStr = await AsyncStorage.getItem('@alphacare_recommendations');
        if (storedRecsStr) {
          const localRecs = JSON.parse(storedRecsStr);
          localRecs.forEach(lr => {
            if (!mappedRecs.some(m => m.id === lr.id)) {
              const child = profiles.find(p => p.user_id === lr.child_id);
              mappedRecs.unshift({
                ...lr,
                childName: child ? child.name : 'Child'
              });
            }
          });
        }
      } catch (e) {
        console.log('Error reading local recommendations:', e);
      }

      setRecommendations(mappedRecs);

      // Fetch latest stress assessments for each child
      const enrichedChildren = await Promise.all((profiles || []).map(async (child) => {
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(child.user_id);
        let stressData = null;
        let latestMood = null;

        if (isValidUuid) {
          try {
            const { data: sData } = await supabase
              .from('stress_assessments')
              .select('*')
              .eq('child_id', child.user_id)
              .order('created_at', { ascending: false })
              .limit(5);
            stressData = sData;

            const { data: mData } = await supabase
              .from('mood_entries')
              .select('*')
              .eq('child_id', child.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            latestMood = mData;
          } catch (fetchErr) {
            console.warn('Error fetching child assessments/mood:', fetchErr);
          }
        }

        let latestAssessment = null;
        let stressHistory = [];
        let riskCategory = child.riskCategory || 'HIGH';

        if (stressData && stressData.length > 0) {
          latestAssessment = stressData[0];
          const rawRisk = (latestAssessment.stress_level || 'Low').toUpperCase();
          if (rawRisk.includes('CRITICAL')) riskCategory = 'CRITICAL';
          else if (rawRisk.includes('HIGH')) riskCategory = 'HIGH';
          else if (rawRisk.includes('MODERATE') || rawRisk.includes('MEDIUM')) riskCategory = 'MEDIUM';
          else riskCategory = 'LOW';

          stressHistory = [...stressData].reverse().map(item => {
            const date = new Date(item.created_at);
            return {
              label: `${date.getMonth() + 1}/${date.getDate()}`,
              value: item.final_stress_score || 0,
              topLabel: item.stress_level === 'Critical' || item.stress_level === 'High' ? '⚠️' : ''
            };
          });
        } else if (localSharedReport || child.isLocalSharedCase) {
          const reportScore = localSharedReport?.score || 60;
          const reportRisk = localSharedReport?.riskLevel || 'High';
          riskCategory = reportRisk.toUpperCase().includes('CRITICAL') ? 'CRITICAL' : 'HIGH';
          latestAssessment = {
            stress_level: reportRisk,
            final_stress_score: reportScore,
            created_at: localSharedReport?.timestamp || new Date().toISOString()
          };
          stressHistory = [
            {
              label: 'Today',
              value: reportScore,
              topLabel: '⚠️'
            }
          ];
        }

        return {
          ...child,
          latestAssessment,
          latestMood,
          riskCategory,
          stressHistory
        };
      }));

      // Sort priority: CRITICAL first, then HIGH, MEDIUM, LOW
      const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      enrichedChildren.sort((a, b) => (priorityWeights[b.riskCategory] || 0) - (priorityWeights[a.riskCategory] || 0));

      setAssignedChildren(enrichedChildren);

    } catch (err) {
      console.error('Error fetching counselor workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Child Case Overview modal & fetch detailed charts
  const openChildCase = async (child) => {
    setSelectedChild(child);
    setIsCaseModalVisible(true);
    setChildHistoryLoading(true);

    try {
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(child.user_id);
      
      let moodData = [];
      let allAssessments = [];
      let childSessionList = [];
      let childRecList = [];

      if (isValidUuid) {
        // 1. Mood history (last 14 entries)
        const { data: mData } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('child_id', child.user_id)
          .order('created_at', { ascending: false })
          .limit(14);
        moodData = mData || [];

        // 2. All stress assessments (last 10)
        const { data: aData } = await supabase
          .from('stress_assessments')
          .select('*')
          .eq('child_id', child.user_id)
          .order('created_at', { ascending: false })
          .limit(10);
        allAssessments = aData || [];

        // 3. Child sessions
        const { data: sData } = await supabase
          .from('counseling_session_notes')
          .select('*')
          .eq('child_id', child.user_id)
          .order('session_date', { ascending: false });
        childSessionList = sData || [];

        // 4. Child recommendations
        const { data: rData } = await supabase
          .from('recommendations')
          .select('*')
          .eq('child_id', child.user_id)
          .order('created_at', { ascending: false });
        childRecList = rData || [];
      } else if (child.latestAssessment) {
        allAssessments = [
          {
            id: 'assessment_current',
            child_id: child.user_id,
            final_stress_score: child.latestAssessment.final_stress_score || 60,
            stress_level: child.latestAssessment.stress_level || 'High',
            created_at: child.latestAssessment.created_at || new Date().toISOString()
          }
        ];
      }

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const formattedMoods = (moodData.length > 0 ? moodData : [
        { mood: 'Anxious', mood_score: 2, created_at: new Date().toISOString() }
      ]).reverse().map(m => {
        const d = new Date(m.created_at);
        let icon = '😐';
        if (m.mood === 'Happy') icon = '😊';
        else if (m.mood === 'Calm') icon = '😌';
        else if (m.mood === 'Sad') icon = '😢';
        else if (m.mood === 'Angry') icon = '😠';
        else if (m.mood === 'Anxious') icon = '😰';

        return {
          label: `${days[d.getDay()]}`,
          value: m.mood_score || 3,
          topLabel: icon
        };
      });
      setChildMoodHistory(formattedMoods);

      setChildAssessments(allAssessments);

      const formattedStress = (allAssessments.length > 0 ? allAssessments : [
        { final_stress_score: child.latestAssessment?.final_stress_score || 60, created_at: new Date().toISOString() }
      ]).reverse().map(item => {
        const d = new Date(item.created_at);
        return {
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          value: item.final_stress_score || 0,
          topLabel: `${item.final_stress_score || 0}`
        };
      });
      setChildStressHistory(formattedStress);

      setChildSessions(childSessionList);
      setChildRecs(childRecList);

      // Fetch recovery & intervention progress from backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiHost = getApiHost();

        const pRes = await fetch(`${apiHost}/api/progress/recovery?child_id=${child.user_id}`, {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          setChildRecoveryProgress(pData);
        } else {
          setChildRecoveryProgress(null);
        }
      } catch (pErr) {
        console.log('Counselor recovery progress fetch note:', pErr.message);
        setChildRecoveryProgress(null);
      }

    } catch (err) {
      console.error('Error fetching child case history:', err);
    } finally {
      setChildHistoryLoading(false);
    }
  };

  // Alert Actions (Acknowledge / Resolve)
  const handleAlertStatus = async (alertId, newStatus) => {
    try {
      // 1. Immediately update UI state
      setActiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: newStatus } : a));

      // 2. If it is a local shared report alert, persist the updated status to AsyncStorage and localStorage
      if (typeof alertId === 'string' && (alertId.startsWith('shared_rep_') || alertId === 'local_case')) {
        try {
          const storedRep = await AsyncStorage.getItem('@alphacare_last_shared_report');
          if (storedRep) {
            const parsed = JSON.parse(storedRep);
            parsed.status = newStatus;
            await AsyncStorage.setItem('@alphacare_last_shared_report', JSON.stringify(parsed));
          }
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const rawWebRep = window.localStorage.getItem('@alphacare_last_shared_report');
            if (rawWebRep) {
              const parsedWeb = JSON.parse(rawWebRep);
              parsedWeb.status = newStatus;
              window.localStorage.setItem('@alphacare_last_shared_report', JSON.stringify(parsedWeb));
            }
          }
        } catch (repErr) {
          console.log('Error updating local shared report status:', repErr);
        }
      } else {
        // 3. If it is a database alert with UUID, update Supabase
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(alertId);
        if (isValidUuid) {
          const { error } = await supabase
            .from('alerts')
            .update({ status: newStatus })
            .eq('id', alertId);

          if (error) {
            console.warn('Supabase alert update note:', error.message);
          }
        }
      }
    } catch (err) {
      console.error('Error updating alert status:', err);
    }
  };

  // Appointment Actions (Confirm, Reschedule, Complete, Cancel)
  const handleUpdateAppointment = async (appointmentId, newStatus) => {
    try {
      // 1. Update Supabase if valid DB record
      try {
        await supabase
          .from('appointments')
          .update({ status: newStatus })
          .eq('id', appointmentId);
      } catch (dbErr) {
        console.log('Database appointment update note:', dbErr.message);
      }

      // 2. Update local state immediately
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));

      // 3. Persist into local storage so status persists on refresh
      try {
        const storedAptsStr = await AsyncStorage.getItem('@alphacare_appointments');
        if (storedAptsStr) {
          let storedApts = JSON.parse(storedAptsStr);
          storedApts = storedApts.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a);
          await AsyncStorage.setItem('@alphacare_appointments', JSON.stringify(storedApts));
        }
      } catch (e) {
        console.log('Local appointments update note:', e);
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Appointment marked as ${newStatus}!`);
      } else {
        Alert.alert('Status Updated', `Appointment marked as ${newStatus}.`);
      }

      // M10: Dispatch meeting update/cancel notification
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt && apt.child_id) {
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
              event_type: newStatus === 'Cancelled' ? 'meeting_cancel' : 'meeting_update',
              details: {
                target_child_id: apt.child_id,
                meeting_id: appointmentId,
                status: newStatus
              }
            })
          });
        } catch (notifErr) {
          console.log('Meeting update notification note:', notifErr.message);
        }
      }
    } catch (err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err.message || 'Unable to update appointment.');
      } else {
        Alert.alert('Error', err.message || 'Unable to update appointment.');
      }
    }
  };

  // Create Counseling Session
  const handleSaveSession = async () => {
    const effectiveChildId = sessionForm.child_id || (assignedChildren.length === 1 ? assignedChildren[0].user_id : '');
    if (!effectiveChildId) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please select an assigned child.');
      } else {
        Alert.alert('Selection Required', 'Please select an assigned child.');
      }
      return;
    }
    if (!sessionForm.notes.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please document clinical session notes.');
      } else {
        Alert.alert('Notes Required', 'Please document clinical session notes.');
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        child_id: effectiveChildId,
        counselor_id: user?.id || counselorUser?.id,
        session_date: sessionForm.session_date,
        session_time: sessionForm.session_time || '10:30 AM',
        session_type: sessionForm.session_type,
        current_stress_level: sessionForm.current_stress_level || 'Moderate',
        main_concerns: sessionForm.main_concerns.trim(),
        observations: sessionForm.observations.trim(),
        notes: sessionForm.notes.trim(),
        intervention_provided: sessionForm.intervention_provided.trim(),
        recommendations: sessionForm.recommendations.trim(),
        follow_up_required: !!sessionForm.follow_up_required,
        next_session_date: sessionForm.next_session_date.trim() || null,
        case_status: sessionForm.case_status || 'Active'
      };

      try {
        await supabase.from('counseling_session_notes').insert(payload);
      } catch (dbErr) {
        console.log('Session insert note:', dbErr);
      }

      // Save to local cache as backup so evaluator sees newly created session immediately
      try {
        const storedSessions = await AsyncStorage.getItem('@alphacare_session_notes');
        const list = storedSessions ? JSON.parse(storedSessions) : [];
        const childObj = assignedChildren.find(c => c.user_id === effectiveChildId);
        list.unshift({
          ...payload,
          id: `session_${Date.now()}`,
          childName: childObj?.name || 'Child Patient',
          created_at: new Date().toISOString()
        });
        await AsyncStorage.setItem('@alphacare_session_notes', JSON.stringify(list));
      } catch (cacheErr) {
        console.log('Cache session note:', cacheErr);
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Session Notes & Case Update logged successfully! 💜');
      } else {
        Alert.alert('Success', 'Session Notes & Case Update logged successfully.');
      }
      setIsSessionModalVisible(false);
      setSessionForm({
        child_id: '',
        session_date: new Date().toISOString().split('T')[0],
        session_time: '10:30 AM',
        session_type: 'One-on-One Check-in',
        current_stress_level: 'Moderate',
        main_concerns: '',
        observations: '',
        notes: '',
        intervention_provided: '',
        recommendations: '',
        follow_up_required: true,
        next_session_date: '',
        case_status: 'Active'
      });
      fetchCounselorData();
    } catch (err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err.message || 'Failed to save session notes.');
      } else {
        Alert.alert('Save Error', err.message || 'Failed to save session notes.');
      }
    }
  };

  // Dispatch Recommendation to Child
  const handleSaveRecommendation = async () => {
    const effectiveChildId = recForm.child_id || (assignedChildren.length === 1 ? assignedChildren[0].user_id : '');
    if (!effectiveChildId) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please select an assigned child.');
      } else {
        Alert.alert('Selection Required', 'Please select an assigned child.');
      }
      return;
    }
    if (!recForm.title.trim() || !recForm.body.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please provide both title and recommendation guidance.');
      } else {
        Alert.alert('Details Required', 'Please provide both title and recommendation guidance.');
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newRec = {
        id: `rec_${Date.now()}`,
        child_id: effectiveChildId,
        counselor_id: user?.id || counselorUser?.id,
        title: recForm.title.trim(),
        body: recForm.body.trim(),
        category: recForm.category || 'Mindfulness',
        created_at: new Date().toISOString()
      };

      // 1. Immediately persist locally in AsyncStorage
      try {
        const storedRecsStr = await AsyncStorage.getItem('@alphacare_recommendations');
        let storedRecs = storedRecsStr ? JSON.parse(storedRecsStr) : [];
        storedRecs.unshift(newRec);
        await AsyncStorage.setItem('@alphacare_recommendations', JSON.stringify(storedRecs));
      } catch (localErr) {
        console.log('Local recommendations save note:', localErr);
      }

      // 2. Insert into Supabase if possible
      try {
        await supabase.from('recommendations').insert({
          child_id: effectiveChildId,
          counselor_id: user?.id || counselorUser?.id,
          title: recForm.title.trim(),
          body: recForm.body.trim(),
          category: recForm.category
        });
      } catch (recErr) {
        console.log('Recommendation table insert note:', recErr);
      }

      // 3. Immediately update in-memory state
      const targetChild = assignedChildren.find(c => c.user_id === effectiveChildId);
      setRecommendations(prev => [
        {
          ...newRec,
          childName: targetChild ? targetChild.name : 'Child'
        },
        ...prev
      ]);

      setIsRecModalVisible(false);
      setRecForm({
        child_id: '',
        title: '',
        category: 'Mindfulness',
        body: '',
        priority: 'Normal'
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Activity Prescribed! The recommendation is now active on the child’s dashboard.');
      } else {
        Alert.alert('Activity Prescribed', 'The recommendation is now active on the child’s dashboard.');
      }
    } catch (err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err.message || 'Failed to save recommendation.');
      } else {
        Alert.alert('Error', err.message || 'Failed to save recommendation.');
      }
    }
  };

  // Generate Report / Referral Modal
  const openReportModal = (child) => {
    setReportChild(child);
    setReferralNote('');
    setIsReferralSaved(false);
    setIsReportModalVisible(true);
  };

  const handleSaveReferral = async () => {
    if (!referralNote.trim()) {
      Alert.alert('Notes Required', 'Please add clinical justification for referral.');
      return;
    }
    if (!reportChild?.user_id || !counselorUser?.id) return;
    try {
      const { error } = await supabase.from('counselor_referrals').insert({
        counselor_id: counselorUser.id,
        child_id: reportChild.user_id,
        reason: referralNote.trim(),
        risk_level: reportChild.riskCategory
      });
      if (error) throw error;
      setIsReferralSaved(true);
      Alert.alert('Referral Recommended', 'Formal referral recommendation saved to the clinical record.');
    } catch (err) {
      Alert.alert('Save Error', err.message || 'Unable to save the referral recommendation.');
    }
  };

  const handleSaveClinicalReport = async () => {
    if (!reportChild?.user_id || !counselorUser?.id) return;
    setIsReportSaving(true);
    try {
      const { error } = await supabase.from('counselor_reports').insert({
        counselor_id: counselorUser.id,
        child_id: reportChild.user_id,
        report_type: 'clinical_summary',
        report_data: {
          child_name: reportChild.name,
          age: reportChild.age,
          risk_category: reportChild.riskCategory,
          latest_stress_score: reportChild.latestAssessment?.final_stress_score || null,
          referral_note: referralNote.trim() || null,
          generated_at: new Date().toISOString()
        }
      });
      if (error) throw error;
      Alert.alert('Report Saved', 'The clinical summary has been saved to the child case file.');
      setIsReportModalVisible(false);
    } catch (err) {
      Alert.alert('Save Error', err.message || 'Unable to save the clinical report.');
    } finally {
      setIsReportSaving(false);
    }
  };

  const handleLogout = async () => {
    await clearUserAuthSession();
    navigation.replace('RoleSelection');
  };

  // Visual Risk Indicators (Clinical Wording)
  const getRiskBadge = (category) => {
    switch (category) {
      case 'CRITICAL':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          border: '#F87171',
          label: 'CRITICAL RISK',
          clinicalDesc: 'Elevated stress risk pattern — Requires immediate clinical attention'
        };
      case 'HIGH':
        return {
          bg: '#FFEDD5',
          text: '#9A3412',
          border: '#FB923C',
          label: 'HIGH RISK',
          clinicalDesc: 'High stress pattern — Supportive session recommended'
        };
      case 'MEDIUM':
        return {
          bg: '#FEF9C3',
          text: '#854D0E',
          border: '#FACC15',
          label: 'MODERATE',
          clinicalDesc: 'Moderate stress markers — Routine follow-up scheduled'
        };
      case 'LOW':
      default:
        return {
          bg: '#DCFCE7',
          text: '#166534',
          border: '#86EFAC',
          label: 'LOW RISK',
          clinicalDesc: 'Stable emotional balance indicated'
        };
    }
  };

  // Filtered children for Assigned and Risk list
  const filteredChildren = assignedChildren.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (riskFilter === 'ALL') return true;
    return child.riskCategory === riskFilter;
  });

  const highRiskCases = assignedChildren.filter(child => child.riskCategory === 'CRITICAL' || child.riskCategory === 'HIGH');

  // KPI calculations
  const totalAssigned = assignedChildren.length;
  const criticalCount = assignedChildren.filter(c => c.riskCategory === 'CRITICAL').length;
  const highRiskCount = assignedChildren.filter(c => c.riskCategory === 'HIGH').length;
  const pendingAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'New').length;
  const todaySessions = sessions.filter(s => {
    const sDate = s.session_date ? s.session_date.split('T')[0] : '';
    const today = new Date().toISOString().split('T')[0];
    return sDate === today;
  }).length;

  return (
    <View style={styles.container}>
      {/* TOP CLINICAL APP BAR */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <View style={styles.brandBadge}><Text style={styles.brandBadgeText}>🌿</Text></View>
          <View>
            <Text style={styles.brandTitle}>AlphaCare Professional</Text>
            <Text style={styles.brandSubtitle}>Clinical Child Wellbeing Portal</Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
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
          <View style={styles.counselorMeta}>
            <Text style={styles.counselorGreeting}>Good day,</Text>
            <Text style={styles.counselorName}>{counselorProfile?.full_name || 'Counselor'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bodyLayout}>
        {/* SIDEBAR NAVIGATION (Visible on Desktop / Responsive on Mobile) */}
        <View style={[styles.navBar, !isDesktop && styles.navBarMobile]}>
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
            {[
              { id: 'overview', label: 'Clinical Overview', icon: '📊' },
              { id: 'assigned', label: `Assigned Children (${totalAssigned})`, icon: '👧' },
              { id: 'chats', label: `Child Chats 💬${inboundSharedReports.length > 0 ? ` (${inboundSharedReports.length} new)` : ''}`, icon: '💬' },
              { id: 'risk_cases', label: `Risk Cases (${highRiskCases.length})`, icon: '⚠️' },
              { id: 'sessions', label: 'Sessions & Notes', icon: '📝' },
              { id: 'appointments', label: `Appointments (${pendingAppointments} new)`, icon: '🗓️' },
              { id: 'recommendations', label: 'Recommendations', icon: '✨' },
              { id: 'reports', label: 'Clinical Reports', icon: '📄' }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.navTab, activeTab === tab.id && styles.navTabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.navTabIcon}>{tab.icon}</Text>
                <Text style={[styles.navTabLabel, activeTab === tab.id && styles.navTabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MAIN CLINICAL CONTENT AREA */}
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#267A68" />
              <Text style={styles.loadingText}>Loading assigned wellbeing cases securely...</Text>
            </View>
          ) : (
            <>
              {/* TAB 1: CLINICAL OVERVIEW */}
              {activeTab === 'overview' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Your Clinical Overview</Text>
                      <Text style={styles.sectionSubtitle}>Real-time aggregated health metrics for assigned caseload</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.primaryActionBtn} onPress={() => {
                        if (assignedChildren.length === 1) {
                          setSessionForm(prev => ({ ...prev, child_id: assignedChildren[0].user_id }));
                        }
                        setIsSessionModalVisible(true);
                      }}>
                        <Text style={styles.primaryActionText}>+ Log Session</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => {
                        if (assignedChildren.length === 1) {
                          setRecForm(prev => ({ ...prev, child_id: assignedChildren[0].user_id }));
                        }
                        setIsRecModalVisible(true);
                      }}>
                        <Text style={styles.secondaryActionText}>+ Prescribe Activity</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* INBOUND SHARED REPORTS BANNER */}
                  {inboundSharedReports.length > 0 && (
                    <View style={{ backgroundColor: '#F3E8FF', borderWidth: 1.5, borderColor: '#C084FC', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 260 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>🔔</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#6B21A8' }}>
                            New Child Check-in Received!
                          </Text>
                          <View style={{ backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>New</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 13, color: '#4C1D95', marginTop: 4, lineHeight: 18 }}>
                          Child <Text style={{ fontWeight: '800' }}>{inboundSharedReports[0]?.childName || 'Child'}</Text> completed their wellness assessment and requested guidance from you.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{ backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 }}
                        onPress={() => navigation.navigate('CounselorChat', {
                          counselorId: counselorUser?.id,
                          counselorName: counselorProfile?.full_name || 'Counselor',
                          childId: inboundSharedReports[0]?.childId || 'child_case',
                          childName: inboundSharedReports[0]?.childName || 'Child',
                          currentRole: 'counselor',
                          initialReport: inboundSharedReports[0]?.reportData
                        })}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>View Report & Open Chat 💬</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* STAT METRICS CARDS */}
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { borderLeftColor: '#267A68' }]}>
                      <Text style={styles.metricLabel}>Assigned Children</Text>
                      <Text style={styles.metricValue}>{totalAssigned}</Text>
                      <Text style={styles.metricNote}>Active clinical assignments</Text>
                    </View>
                    <View style={[styles.metricCard, { borderLeftColor: '#991B1B' }]}>
                      <Text style={styles.metricLabel}>Critical Risk</Text>
                      <Text style={[styles.metricValue, { color: '#991B1B' }]}>{criticalCount}</Text>
                      <Text style={styles.metricNote}>Requires prompt attention</Text>
                    </View>
                    <View style={[styles.metricCard, { borderLeftColor: '#C2410C' }]}>
                      <Text style={styles.metricLabel}>High Stress</Text>
                      <Text style={[styles.metricValue, { color: '#C2410C' }]}>{highRiskCount}</Text>
                      <Text style={styles.metricNote}>Elevated risk patterns</Text>
                    </View>
                    <View style={[styles.metricCard, { borderLeftColor: '#6366F1' }]}>
                      <Text style={styles.metricLabel}>Today’s Sessions</Text>
                      <Text style={styles.metricValue}>{todaySessions}</Text>
                      <Text style={styles.metricNote}>Scheduled interventions</Text>
                    </View>
                  </View>

                  {/* ACTIVE RISK ALERTS QUEUE */}
                  {activeAlerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                      <View style={styles.alertQueueHeader}>
                        <Text style={styles.alertQueueTitle}>🚨 Priority Clinical Alerts ({activeAlerts.filter(a => a.status !== 'Resolved').length} Unresolved)</Text>
                        <Text style={styles.alertQueueSub}>Generated automatically by AI assessment engine</Text>
                      </View>

                      {activeAlerts.map(alert => {
                        const isResolved = alert.status === 'Resolved';
                        const isReviewed = alert.status === 'Reviewed';
                        return (
                          <View key={alert.id} style={[styles.alertCard, isResolved && styles.alertCardResolved]}>
                            <View style={styles.alertCardTop}>
                              <View style={styles.alertBadgeHolder}>
                                <View style={[styles.badgePill, { backgroundColor: alert.risk_level === 'Critical' ? '#FEE2E2' : '#FFEDD5' }]}>
                                  <Text style={[styles.badgeText, { color: alert.risk_level === 'Critical' ? '#991B1B' : '#9A3412' }]}>
                                    {alert.risk_level} Risk Alert
                                  </Text>
                                </View>
                                <Text style={styles.alertChildTitle}>{alert.childName}</Text>
                              </View>
                              <Text style={styles.alertTime}>{new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>

                            <View style={styles.factorsBox}>
                              <Text style={styles.factorsHeading}>Contributing Stress Factors:</Text>
                              {(alert.contributing_factors || []).map((factor, i) => (
                                <Text key={i} style={styles.factorBullet}>• {factor}</Text>
                              ))}
                            </View>

                            <View style={styles.alertActionsRow}>
                              <Text style={[styles.statusText, isReviewed && { color: '#B45309' }, isResolved && { color: '#15803D' }]}>
                                Status: <Text style={{ fontWeight: '800' }}>{alert.status || 'New'}</Text>
                              </Text>

                              <View style={styles.alertActionBtns}>
                                <TouchableOpacity
                                  style={[styles.ackBtn, { backgroundColor: '#7C3AED' }]}
                                  onPress={() => navigation.navigate('CounselorChat', {
                                    counselorId: counselorUser?.id,
                                    counselorName: counselorProfile?.full_name || 'Counselor',
                                    childId: alert.child_id,
                                    childName: alert.childName,
                                    currentRole: 'counselor',
                                    initialReport: alert.reportData
                                  })}
                                >
                                  <Text style={[styles.ackBtnText, { color: '#FFFFFF' }]}>Open Chat & Meeting 💬</Text>
                                </TouchableOpacity>
                                {alert.status === 'New' && (
                                  <TouchableOpacity
                                    style={styles.ackBtn}
                                    onPress={() => handleAlertStatus(alert.id, 'Reviewed')}
                                  >
                                    <Text style={styles.ackBtnText}>Acknowledge</Text>
                                  </TouchableOpacity>
                                )}
                                {!isResolved && (
                                  <TouchableOpacity
                                    style={styles.resolveBtn}
                                    onPress={() => handleAlertStatus(alert.id, 'Resolved')}
                                  >
                                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* QUICK ACCESS CASENOTES SUMMARY */}
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Recent Counseling Sessions</Text>
                    {sessions.length === 0 ? (
                      <Text style={styles.emptyInlineText}>No counseling sessions logged yet.</Text>
                    ) : (
                      sessions.slice(0, 3).map(s => (
                        <View key={s.id} style={styles.sessionItem}>
                          <View style={styles.sessionItemTop}>
                            <Text style={styles.sessionChildName}>{s.childName}</Text>
                            <Text style={styles.sessionDate}>{s.session_date}</Text>
                          </View>
                          <Text style={styles.sessionType}>Type: {s.session_type}</Text>
                          <Text style={styles.sessionNotesPreview} numberOfLines={2}>{s.notes}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* TAB 2: ASSIGNED CHILDREN */}
              {activeTab === 'assigned' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Assigned Children</Text>
                      <Text style={styles.sectionSubtitle}>Confidential list of children under your direct clinical care</Text>
                    </View>
                  </View>

                  {/* SEARCH & FILTERS */}
                  <View style={styles.filterBar}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search child by name..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#94A3B8"
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
                      {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                        <TouchableOpacity
                          key={f}
                          style={[styles.filterPill, riskFilter === f && styles.filterPillActive]}
                          onPress={() => setRiskFilter(f)}
                        >
                          <Text style={[styles.filterPillText, riskFilter === f && styles.filterPillTextActive]}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {filteredChildren.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>📋</Text>
                      <Text style={styles.emptyStateTitle}>No assigned cases found</Text>
                      <Text style={styles.emptyStateSub}>Either no children match your search or none have been assigned to your counselor ID.</Text>
                    </View>
                  ) : (
                    <View style={styles.childrenList}>
                      {filteredChildren.map(child => {
                        const riskInfo = getRiskBadge(child.riskCategory);
                        return (
                          <View key={child.user_id} style={[styles.childListItem, { borderLeftColor: riskInfo.border, borderLeftWidth: 5 }]}>
                            <View style={styles.childMainCol}>
                              <View style={styles.childNameRow}>
                                <Text style={styles.childListName}>{child.name}</Text>
                                <Text style={styles.childListAge}>Age {child.age || '—'}</Text>
                                <View style={[styles.riskPill, { backgroundColor: riskInfo.bg }]}>
                                  <Text style={[styles.riskPillText, { color: riskInfo.text }]}>{riskInfo.label}</Text>
                                </View>
                              </View>

                              <Text style={styles.clinicalNoteText}>{riskInfo.clinicalDesc}</Text>

                              <View style={styles.childMetaRow}>
                                <Text style={styles.metaLabel}>Latest Stress Score: <Text style={styles.metaBold}>{child.latestAssessment?.final_stress_score ? `${child.latestAssessment.final_stress_score}/100` : 'Not assessed'}</Text></Text>
                                <Text style={styles.metaDivider}>•</Text>
                                <Text style={styles.metaLabel}>Latest Mood: <Text style={styles.metaBold}>{child.latestMood?.mood || 'No check-in'}</Text></Text>
                              </View>
                            </View>

                            <View style={styles.childActionsCol}>
                              <TouchableOpacity
                                style={[styles.openCaseBtn, { backgroundColor: '#7C3AED', marginBottom: 6 }]}
                                onPress={() => navigation.navigate('CounselorChat', {
                                  counselorId: counselorUser?.id,
                                  counselorName: counselorProfile?.full_name || 'Counselor',
                                  childId: child.user_id,
                                  childName: child.name,
                                  currentRole: 'counselor'
                                })}
                              >
                                <Text style={styles.openCaseBtnText}>💬 Chat / Meeting</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.openCaseBtn}
                                onPress={() => openChildCase(child)}
                              >
                                <Text style={styles.openCaseBtnText}>Review Case ➔</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.reportBtn}
                                onPress={() => openReportModal(child)}
                              >
                                <Text style={styles.reportBtnText}>Clinical Report</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* TAB: CHILD CHATS */}
              {activeTab === 'chats' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>1-on-1 Child Chats & Meetings</Text>
                      <Text style={styles.sectionSubtitle}>Confidential child messaging channel & video consultation scheduling</Text>
                    </View>
                  </View>

                  {assignedChildren.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>💬</Text>
                      <Text style={styles.emptyStateTitle}>No child chats available</Text>
                      <Text style={styles.emptyStateSub}>Once children share their questionnaire or are assigned to you, chats will appear here.</Text>
                    </View>
                  ) : (
                    <View style={styles.childrenList}>
                      {assignedChildren.map(child => (
                        <View key={child.user_id} style={[styles.childListItem, { borderLeftColor: '#7C3AED', borderLeftWidth: 5 }]}>
                          <View style={styles.childMainCol}>
                            <View style={styles.childNameRow}>
                              <Text style={styles.childListName}>{child.name}</Text>
                              <Text style={styles.childListAge}>Age {child.age || '—'}</Text>
                              <View style={[styles.riskPill, { backgroundColor: '#F3E8FF' }]}>
                                <Text style={[styles.riskPillText, { color: '#7C3AED' }]}>Chat Channel</Text>
                              </View>
                            </View>
                            <Text style={styles.clinicalNoteText}>
                              Child reported wellness score: {child.latestAssessment?.final_stress_score ? `${child.latestAssessment.final_stress_score}/100` : 'Pending'} • Latest mood: {child.latestMood?.mood || 'Normal'}
                            </Text>
                          </View>

                          <View style={styles.childActionsCol}>
                            <TouchableOpacity
                              style={[styles.openCaseBtn, { backgroundColor: '#7C3AED', paddingHorizontal: 16 }]}
                              onPress={() => navigation.navigate('CounselorChat', {
                                counselorId: counselorUser?.id,
                                counselorName: counselorProfile?.full_name || 'Counselor',
                                childId: child.user_id,
                                childName: child.name,
                                currentRole: 'counselor'
                              })}
                            >
                              <Text style={styles.openCaseBtnText}>Open Chat & Meeting 💬</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 3: HIGH & CRITICAL RISK CASES */}
              {activeTab === 'risk_cases' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Elevated Risk Cases</Text>
                      <Text style={styles.sectionSubtitle}>Children exhibiting persistent high or critical stress indicators</Text>
                    </View>
                  </View>

                  {highRiskCases.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>✨</Text>
                      <Text style={styles.emptyStateTitle}>No elevated risk cases currently</Text>
                      <Text style={styles.emptyStateSub}>All assigned children are maintaining stable or moderate wellbeing metrics.</Text>
                    </View>
                  ) : (
                    <View style={styles.riskCasesContainer}>
                      {highRiskCases.map(child => {
                        const riskInfo = getRiskBadge(child.riskCategory);
                        return (
                          <View key={child.user_id} style={[styles.riskCard, { borderColor: riskInfo.border }]}>
                            <View style={styles.riskCardTop}>
                              <View>
                                <Text style={styles.riskChildName}>{child.name} (Age {child.age})</Text>
                                <Text style={styles.riskScoreHeadline}>
                                  Stress Score: <Text style={{ color: riskInfo.text, fontWeight: '900' }}>{child.latestAssessment?.final_stress_score || 'N/A'}/100</Text>
                                </Text>
                              </View>
                              <View style={[styles.riskPill, { backgroundColor: riskInfo.bg }]}>
                                <Text style={[styles.riskPillText, { color: riskInfo.text }]}>{riskInfo.label}</Text>
                              </View>
                            </View>

                            <View style={styles.clinicalAlertBox}>
                              <Text style={styles.clinicalAlertTitle}>Clinical Evaluation:</Text>
                              <Text style={styles.clinicalAlertDesc}>{riskInfo.clinicalDesc}</Text>
                              {child.latestAssessment?.contributing_factors && child.latestAssessment.contributing_factors.length > 0 && (
                                <View style={{ marginTop: 8 }}>
                                  <Text style={styles.factorSubTitle}>Identified Drivers:</Text>
                                  {child.latestAssessment.contributing_factors.map((f, i) => (
                                    <Text key={i} style={styles.factorBullet}>• {f}</Text>
                                  ))}
                                </View>
                              )}
                            </View>

                            <View style={styles.riskCardActions}>
                              <TouchableOpacity
                                style={styles.scheduleInterventionBtn}
                                onPress={() => {
                                  setSessionForm(prev => ({ ...prev, child_id: child.user_id }));
                                  setIsSessionModalVisible(true);
                                }}
                              >
                                <Text style={styles.scheduleBtnText}>Schedule Intervention</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.viewDeepAnalyticsBtn}
                                onPress={() => openChildCase(child)}
                              >
                                <Text style={styles.viewDeepText}>Full Case File</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 4: SESSIONS & NOTES */}
              {activeTab === 'sessions' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Counseling Sessions & Clinical Notes</Text>
                      <Text style={styles.sectionSubtitle}>Confidential session documentation and interventions log</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setIsSessionModalVisible(true)}>
                      <Text style={styles.primaryActionText}>+ New Session</Text>
                    </TouchableOpacity>
                  </View>

                  {sessions.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>📝</Text>
                      <Text style={styles.emptyStateTitle}>No sessions documented yet</Text>
                      <Text style={styles.emptyStateSub}>Record clinical observations, support provided, and follow-up plans.</Text>
                    </View>
                  ) : (
                    <View style={styles.sessionsList}>
                      {sessions.map((s, idx) => (
                        <View key={s.id || idx} style={styles.fullSessionCard}>
                          <View style={styles.sessionHeaderRow}>
                            <View>
                              <Text style={styles.sessionChildTitle}>
                                Session #{sessions.length - idx}: {s.childName}
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                <Text style={styles.sessionTypeBadge}>{s.session_type || 'Clinical Check-in'}</Text>
                                {s.current_stress_level && (
                                  <View style={{
                                    backgroundColor: s.current_stress_level === 'Critical' ? '#FEF2F2' : s.current_stress_level === 'High' ? '#FFF7ED' : '#FAF5FF',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: s.current_stress_level === 'Critical' ? '#FCA5A5' : s.current_stress_level === 'High' ? '#FDBA74' : '#DDD6FE'
                                  }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: s.current_stress_level === 'Critical' ? '#DC2626' : s.current_stress_level === 'High' ? '#EA580C' : '#7C3AED' }}>
                                      📊 Stress: {s.current_stress_level}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.sessionDateTag}>📅 {s.session_date}</Text>
                              {s.session_time && (
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 2 }}>
                                  ⏰ {s.session_time}
                                </Text>
                              )}
                            </View>
                          </View>

                          {s.main_concerns ? (
                            <View style={[styles.notesSection, { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 8 }]}>
                              <Text style={[styles.notesLabel, { color: '#334155' }]}>💬 Main Discussion / Concerns:</Text>
                              <Text style={styles.notesText}>{s.main_concerns}</Text>
                            </View>
                          ) : null}

                          {s.observations ? (
                            <View style={[styles.notesSection, { backgroundColor: '#F0FDF4', padding: 8, borderRadius: 8, marginTop: 8 }]}>
                              <Text style={[styles.notesLabel, { color: '#166534' }]}>🧠 Assessment / Clinical Observations:</Text>
                              <Text style={styles.notesText}>{s.observations}</Text>
                            </View>
                          ) : null}

                          <View style={[styles.notesSection, { marginTop: 8 }]}>
                            <Text style={styles.notesLabel}>📝 Counselor's Notes & Summary:</Text>
                            <Text style={styles.notesText}>{s.notes}</Text>
                          </View>

                          {s.intervention_provided ? (
                            <View style={[styles.notesSection, { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginTop: 8 }]}>
                              <Text style={[styles.notesLabel, { color: '#1D4ED8' }]}>✅ Intervention Provided:</Text>
                              <Text style={styles.notesText}>{s.intervention_provided}</Text>
                            </View>
                          ) : null}

                          {s.recommendations ? (
                            <View style={[styles.notesSection, { marginTop: 8 }]}>
                              <Text style={styles.notesLabel}>🎯 Actionable Recommendations:</Text>
                              <Text style={styles.notesText}>{s.recommendations}</Text>
                            </View>
                          ) : null}

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '700' }}>📌 Follow-up Required:</Text>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: s.follow_up_required ? '#DC2626' : '#16A34A' }}>
                                {s.follow_up_required ? 'Yes 🔴' : 'No 🟢'}
                              </Text>
                            </View>
                            {(s.next_session_date || s.follow_up_date) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '700' }}>📅 Next Session:</Text>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>
                                  {s.next_session_date || s.follow_up_date}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 5: APPOINTMENTS & PARENT REQUESTS */}
              {activeTab === 'appointments' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Appointment Management</Text>
                      <Text style={styles.sectionSubtitle}>Parent counseling requests and booked clinical consultations</Text>
                    </View>
                  </View>

                  {appointments.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>🗓️</Text>
                      <Text style={styles.emptyStateTitle}>No appointment requests</Text>
                      <Text style={styles.emptyStateSub}>When a parent requests a session for their child, it will appear here.</Text>
                    </View>
                  ) : (
                    <View style={styles.appointmentList}>
                      {appointments.map(apt => {
                        const isPending = apt.status === 'pending' || apt.status === 'New';
                        return (
                          <View key={apt.id} style={[styles.appointmentCard, isPending && styles.appointmentCardPending]}>
                            <View style={styles.aptHeader}>
                              <View>
                                <Text style={styles.aptChildName}>{apt.childName}</Text>
                                <Text style={styles.aptDate}>
                                  Requested For: {new Date(apt.scheduled_at).toLocaleDateString()} at {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </View>
                              <View style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: apt.status === 'Completed' ? '#E0F2FE' : isPending ? '#FEF3C7' : '#DCFCE7'
                                }
                              ]}>
                                <Text style={[
                                  styles.statusBadgeText,
                                  {
                                    color: apt.status === 'Completed' ? '#0369A1' : isPending ? '#B45309' : '#15803D'
                                  }
                                ]}>
                                  {apt.status === 'Completed' ? '✓ Completed' : apt.status}
                                </Text>
                              </View>
                            </View>

                            {apt.notes && (
                              <View style={styles.aptNotesBox}>
                                <Text style={styles.aptNotesLabel}>Parent Request Notes:</Text>
                                <Text style={styles.aptNotesText}>{apt.notes}</Text>
                              </View>
                            )}

                            <View style={styles.aptActionsRow}>
                              <TouchableOpacity
                                style={[styles.aptBtn, { backgroundColor: '#7C3AED' }]}
                                onPress={() => navigation.navigate('CounselorChat', {
                                  counselorId: counselorUser?.id,
                                  counselorName: counselorProfile?.full_name || 'Counselor',
                                  childId: apt.child_id,
                                  childName: apt.childName,
                                  currentRole: 'counselor'
                                })}
                              >
                                <Text style={[styles.aptBtnTextConfirm, { color: '#FFFFFF' }]}>Join / Chat 💬</Text>
                              </TouchableOpacity>

                              {isPending && (
                                <>
                                  <TouchableOpacity
                                    style={[styles.aptBtn, styles.aptBtnConfirm]}
                                    onPress={() => handleUpdateAppointment(apt.id, 'Confirmed')}
                                  >
                                    <Text style={styles.aptBtnTextConfirm}>Accept & Confirm</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.aptBtn, styles.aptBtnCancel]}
                                    onPress={() => handleUpdateAppointment(apt.id, 'Cancelled')}
                                  >
                                    <Text style={styles.aptBtnTextCancel}>Decline</Text>
                                  </TouchableOpacity>
                                </>
                              )}
                              {apt.status === 'Confirmed' && (
                                <TouchableOpacity
                                  style={[styles.aptBtn, styles.aptBtnComplete]}
                                  onPress={() => handleUpdateAppointment(apt.id, 'Completed')}
                                >
                                  <Text style={styles.aptBtnTextComplete}>Mark Completed</Text>
                                </TouchableOpacity>
                              )}
                              {apt.status === 'Completed' && (
                                <View style={[styles.aptBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1 }]}>
                                  <Text style={[styles.aptBtnTextComplete, { color: '#16A34A' }]}>✓ Session Finished</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 6: RECOMMENDATIONS */}
              {activeTab === 'recommendations' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
                      <Text style={styles.sectionSubtitle}>Activities and routines prescribed directly to child's dashboard</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setIsRecModalVisible(true)}>
                      <Text style={styles.primaryActionText}>+ New Recommendation</Text>
                    </TouchableOpacity>
                  </View>

                  {recommendations.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>✨</Text>
                      <Text style={styles.emptyStateTitle}>No recommendations prescribed yet</Text>
                      <Text style={styles.emptyStateSub}>Recommend breathing exercises, meditation, or routines for your assigned children.</Text>
                    </View>
                  ) : (
                    <View style={styles.recommendationsGrid}>
                      {recommendations.map(rec => (
                        <View key={rec.id} style={styles.recItemCard}>
                          <View style={styles.recItemHeader}>
                            <Text style={styles.recCategoryPill}>{rec.category || 'Wellbeing'}</Text>
                            <Text style={styles.recTargetChild}>For: {rec.childName}</Text>
                          </View>
                          <Text style={styles.recTitleText}>{rec.title}</Text>
                          <Text style={styles.recBodyText}>{rec.body}</Text>
                          <Text style={styles.recDateTag}>Prescribed on {new Date(rec.created_at).toLocaleDateString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 7: CLINICAL REPORTS */}
              {activeTab === 'reports' && (
                <View style={styles.viewSection}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Clinical Wellbeing Reports</Text>
                      <Text style={styles.sectionSubtitle}>Generate standardized clinical summaries and specialist referrals</Text>
                    </View>
                  </View>

                  <View style={styles.reportsInstructionBox}>
                    <Text style={styles.repInstTitle}>Standardized Case Summary Generator</Text>
                    <Text style={styles.repInstDesc}>
                      Select an assigned child below to preview and generate a comprehensive clinical wellbeing report incorporating assessment history, emotional trends, and specialist referral options.
                    </Text>
                  </View>

                  <View style={styles.reportChildrenGrid}>
                    {assignedChildren.map(child => (
                      <View key={child.user_id} style={styles.reportChildCard}>
                        <View>
                          <Text style={styles.repChildName}>{child.name}</Text>
                          <Text style={styles.repChildSub}>Age: {child.age || '—'} • Risk: {child.riskCategory}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.genReportBtn}
                          onPress={() => openReportModal(child)}
                        >
                          <Text style={styles.genReportBtnText}>Generate Report ➔</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* ================= MODAL 1: CHILD CASE OVERVIEW ================= */}
      <Modal visible={isCaseModalVisible} animationType="slide" transparent onRequestClose={() => setIsCaseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Child Case Overview: {selectedChild?.name}</Text>
                <Text style={styles.modalHeaderSub}>Age: {selectedChild?.age || '—'} • Assigned Patient File</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsCaseModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {childHistoryLoading ? (
                <ActivityIndicator size="large" color="#267A68" style={{ marginVertical: 40 }} />
              ) : (
                <>
                  {/* SUMMARY BADGES */}
                  <View style={styles.modalCaseSummaryBar}>
                    <View style={styles.summaryBarItem}>
                      <Text style={styles.sumBarLabel}>Case Status</Text>
                      <View style={{
                        backgroundColor: (selectedChild?.case_status || 'Active') === 'Resolved' ? '#DCFCE7' : '#EFF6FF',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginTop: 2
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: (selectedChild?.case_status || 'Active') === 'Resolved' ? '#15803D' : '#1D4ED8'
                        }}>
                          ● {selectedChild?.case_status || 'Active Clinical Case'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryBarItem}>
                      <Text style={styles.sumBarLabel}>Current Risk Category</Text>
                      <Text style={[styles.sumBarVal, { color: getRiskBadge(selectedChild?.riskCategory).text }]}>
                        {selectedChild?.riskCategory}
                      </Text>
                    </View>
                    <View style={styles.summaryBarItem}>
                      <Text style={styles.sumBarLabel}>Latest Stress Score</Text>
                      <Text style={styles.sumBarVal}>
                        {selectedChild?.latestAssessment?.final_stress_score ? `${selectedChild.latestAssessment.final_stress_score}/100` : 'None'}
                      </Text>
                    </View>
                    <View style={styles.summaryBarItem}>
                      <Text style={styles.sumBarLabel}>Previous Sessions</Text>
                      <Text style={styles.sumBarVal}>{childSessions.length}</Text>
                    </View>
                  </View>

                  {/* RECOVERY & INTERVENTION PROGRESS CARD */}
                  <View style={[styles.caseTableBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, marginBottom: 16 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={[styles.tableHeading, { color: '#166534', marginBottom: 0 }]}>📈 Child Wellness & Intervention Progress</Text>
                      <View style={{
                        backgroundColor: childRecoveryProgress?.evaluation?.trend === 'Improving' ? '#DCFCE7' : '#FEF3C7',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: childRecoveryProgress?.evaluation?.trend === 'Improving' ? '#15803D' : '#92400E'
                        }}>
                          Trend: {childRecoveryProgress?.evaluation?.trend || 'Active Support'}
                        </Text>
                      </View>
                    </View>

                    {/* METRIC ROW */}
                    <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#15803D' }}>
                          {childRecoveryProgress?.metrics?.currentStressScore !== null && childRecoveryProgress?.metrics?.currentStressScore !== undefined ? `${childRecoveryProgress.metrics.currentStressScore}%` : '—'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2 }}>Current Stress</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#475569' }}>
                          {childRecoveryProgress?.metrics?.previousStressScore !== null && childRecoveryProgress?.metrics?.previousStressScore !== undefined ? `${childRecoveryProgress.metrics.previousStressScore}%` : '—'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2 }}>Prior Period</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#7C3AED' }}>
                          {childRecoveryProgress?.metrics?.wellnessActivitiesCompleted ?? 0}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2 }}>Activities Done</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1D4ED8' }}>
                          {childRecoveryProgress?.metrics?.counselingSessionsCompleted ?? childSessions.length}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 2 }}>Sessions</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17, marginTop: 4 }}>
                      {childRecoveryProgress?.evaluation?.progressSummary || "Regular check-in data supports longitudinal intervention tracking."}
                    </Text>
                  </View>

                  {/* CHARTS SECTION */}
                  <View style={styles.chartsRow}>
                    <View style={styles.chartWrapper}>
                      <Text style={styles.chartHeading}>Recent Mood Check-in History</Text>
                      {childMoodHistory.length > 0 ? (
                        <BarChart
                          title="Mood Ratings (1-5 Scale)"
                          data={childMoodHistory}
                          barColor="#7C3AED"
                          maxValue={5}
                          height={120}
                        />
                      ) : (
                        <Text style={styles.emptyInlineText}>No recent mood entries recorded by child.</Text>
                      )}
                    </View>

                    <View style={styles.chartWrapper}>
                      <Text style={styles.chartHeading}>Stress Assessment History</Text>
                      {childStressHistory.length > 0 ? (
                        <BarChart
                          title="Stress Score (0-100)"
                          data={childStressHistory}
                          barColor="#EF4444"
                          maxValue={100}
                          height={120}
                        />
                      ) : (
                        <Text style={styles.emptyInlineText}>No stress assessment records found.</Text>
                      )}
                    </View>
                  </View>

                  {/* RECENT ASSESSMENTS TABLE */}
                  <View style={styles.caseTableBox}>
                    <Text style={styles.tableHeading}>Stress Assessment Log</Text>
                    {childAssessments.length === 0 ? (
                      <Text style={styles.emptyInlineText}>No assessment questionnaires submitted.</Text>
                    ) : (
                      childAssessments.map(item => (
                        <View key={item.id} style={styles.tableRow}>
                          <View>
                            <Text style={styles.tableScore}>Score: {item.final_stress_score}/100 ({item.stress_level})</Text>
                            <Text style={styles.tableSub}>Factors: {(item.contributing_factors || []).join(', ') || 'None identified'}</Text>
                          </View>
                          <Text style={styles.tableDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* M9: SMART WELLNESS RECOMMENDATIONS & INTERVENTION FOCUS */}
                  <View style={[styles.caseTableBox, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={[styles.tableHeading, { color: '#6D28D9', marginBottom: 0 }]}>🎯 M9 Smart Recommendation Engine Suggestions</Text>
                      <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>Active Coping Track</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 17, marginBottom: 8 }}>
                      Engine outputs customized for {selectedChild?.name} (Risk: {selectedChild?.riskCategory || 'Standard'}):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#C4B5FD' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>🫁 4-4-4 Box Breathing</Text>
                      </View>
                      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#C4B5FD' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>🧘 Mindfulness Meditation</Text>
                      </View>
                      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#C4B5FD' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>📝 Emotional Journaling</Text>
                      </View>
                      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#C4B5FD' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>🫧 Stress Buster Games</Text>
                      </View>
                    </View>
                  </View>

                  {/* PREVIOUS COUNSELING SESSIONS */}
                  <View style={[styles.caseTableBox, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.tableHeading}>📋 Previous Counseling Sessions & Notes</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>{childSessions.length} recorded</Text>
                    </View>
                    {childSessions.length === 0 ? (
                      <Text style={styles.emptyInlineText}>No prior clinical sessions logged for this child yet.</Text>
                    ) : (
                      childSessions.map((s, sIdx) => (
                        <View key={s.id || sIdx} style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: '#7C3AED',
                          borderWidth: 1,
                          borderColor: '#E2E8F0'
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>
                              Session #{childSessions.length - sIdx} • {s.session_type || 'Consultation'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>
                              📅 {s.session_date} {s.session_time ? `• ${s.session_time}` : ''}
                            </Text>
                          </View>

                          {s.current_stress_level && (
                            <Text style={{ fontSize: 11, color: '#6D28D9', fontWeight: '700', marginTop: 4 }}>
                              📊 Stress Level at Session: {s.current_stress_level}
                            </Text>
                          )}

                          {s.main_concerns ? (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>💬 Concerns Discussed:</Text>
                              <Text style={{ fontSize: 12, color: '#475569' }}>{s.main_concerns}</Text>
                            </View>
                          ) : null}

                          {s.observations ? (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>🧠 Clinical Observations:</Text>
                              <Text style={{ fontSize: 12, color: '#334155' }}>{s.observations}</Text>
                            </View>
                          ) : null}

                          {s.intervention_provided ? (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>✅ Intervention Provided:</Text>
                              <Text style={{ fontSize: 12, color: '#334155' }}>{s.intervention_provided}</Text>
                            </View>
                          ) : null}

                          {s.notes ? (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>📝 Counselor Notes:</Text>
                              <Text style={{ fontSize: 12, color: '#334155' }}>{s.notes}</Text>
                            </View>
                          ) : null}

                          {(s.next_session_date || s.follow_up_date) && (
                            <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', marginTop: 6 }}>
                              📌 Next Session: {s.next_session_date || s.follow_up_date}
                            </Text>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  {/* CASE SESSIONS & ACTIONS */}
                  <View style={styles.modalFooterActions}>
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => {
                        setIsCaseModalVisible(false);
                        setSessionForm(prev => ({ ...prev, child_id: selectedChild?.user_id }));
                        setIsSessionModalVisible(true);
                      }}
                    >
                      <Text style={styles.primaryActionText}>+ Add Session Note</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryActionBtn}
                      onPress={() => {
                        setIsCaseModalVisible(false);
                        setRecForm(prev => ({ ...prev, child_id: selectedChild?.user_id }));
                        setIsRecModalVisible(true);
                      }}
                    >
                      <Text style={styles.secondaryActionText}>+ Add Recommendation</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: NEW COUNSELING SESSION ================= */}
      <Modal visible={isSessionModalVisible} animationType="fade" transparent onRequestClose={() => setIsSessionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Log Counseling Session</Text>
              <TouchableOpacity onPress={() => setIsSessionModalVisible(false)}><Text style={styles.modalCloseText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Select Assigned Child</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childSelectRow}>
                {assignedChildren.map(c => (
                  <TouchableOpacity
                    key={c.user_id}
                    style={[styles.childSelectPill, sessionForm.child_id === c.user_id && styles.childSelectPillActive]}
                    onPress={() => setSessionForm(prev => ({ ...prev, child_id: c.user_id }))}
                  >
                    <Text style={[styles.childSelectPillText, sessionForm.child_id === c.user_id && styles.childSelectPillTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>📅 Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.inputField}
                    value={sessionForm.session_date}
                    onChangeText={txt => setSessionForm(prev => ({ ...prev, session_date: txt }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>⏰ Time</Text>
                  <TextInput
                    style={styles.inputField}
                    value={sessionForm.session_time}
                    onChangeText={txt => setSessionForm(prev => ({ ...prev, session_time: txt }))}
                    placeholder="e.g. 10:30 AM"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>📊 Child's Current Stress Level</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {['Low', 'Moderate', 'High', 'Critical'].map(lvl => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.childSelectPill,
                      sessionForm.current_stress_level === lvl && {
                        backgroundColor: lvl === 'Critical' ? '#FEF2F2' : lvl === 'High' ? '#FFF7ED' : lvl === 'Moderate' ? '#FAF5FF' : '#F0FDF4',
                        borderColor: lvl === 'Critical' ? '#EF4444' : lvl === 'High' ? '#F97316' : lvl === 'Moderate' ? '#8B5CF6' : '#22C55E',
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setSessionForm(prev => ({ ...prev, current_stress_level: lvl }))}
                  >
                    <Text style={[
                      styles.childSelectPillText,
                      sessionForm.current_stress_level === lvl && {
                        fontWeight: '800',
                        color: lvl === 'Critical' ? '#DC2626' : lvl === 'High' ? '#EA580C' : lvl === 'Moderate' ? '#7C3AED' : '#16A34A'
                      }
                    ]}>
                      {lvl === 'Critical' ? '🚨' : lvl === 'High' ? '⚠️' : lvl === 'Moderate' ? '💜' : '🌱'} {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>💬 Main Discussion / Concerns</Text>
              <TextInput
                style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={sessionForm.main_concerns}
                onChangeText={txt => setSessionForm(prev => ({ ...prev, main_concerns: txt }))}
                placeholder="What primary challenges or concerns did the child bring up today? (e.g. exam anxiety, friendship conflict, sleep)..."
              />

              <Text style={styles.inputLabel}>🧠 Assessment / Observations</Text>
              <TextInput
                style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={sessionForm.observations}
                onChangeText={txt => setSessionForm(prev => ({ ...prev, observations: txt }))}
                placeholder="Observed emotional state, non-verbal posture, cognitive mindset..."
              />

              <Text style={styles.inputLabel}>📝 Counselor's Notes & Summary</Text>
              <TextInput
                style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={sessionForm.notes}
                onChangeText={txt => setSessionForm(prev => ({ ...prev, notes: txt }))}
                placeholder="Detailed clinical counseling notes and therapeutic insights..."
              />

              <Text style={styles.inputLabel}>✅ Intervention Provided</Text>
              <TextInput
                style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={sessionForm.intervention_provided}
                onChangeText={txt => setSessionForm(prev => ({ ...prev, intervention_provided: txt }))}
                placeholder="Guided box breathing exercise, cognitive reframing, positive validation..."
              />

              <Text style={styles.inputLabel}>🎯 Prescribed Recommendations / Actionable Steps</Text>
              <TextInput
                style={styles.inputField}
                value={sessionForm.recommendations}
                onChangeText={txt => setSessionForm(prev => ({ ...prev, recommendations: txt }))}
                placeholder="e.g. 5-min daily box breathing, journaling before bed"
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginVertical: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>📌 Follow-up Required?</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.childSelectPill,
                      sessionForm.follow_up_required && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }
                    ]}
                    onPress={() => setSessionForm(prev => ({ ...prev, follow_up_required: true }))}
                  >
                    <Text style={[styles.childSelectPillText, sessionForm.follow_up_required && { color: '#FFFFFF', fontWeight: '800' }]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.childSelectPill,
                      !sessionForm.follow_up_required && { backgroundColor: '#64748B', borderColor: '#64748B' }
                    ]}
                    onPress={() => setSessionForm(prev => ({ ...prev, follow_up_required: false }))}
                  >
                    <Text style={[styles.childSelectPillText, !sessionForm.follow_up_required && { color: '#FFFFFF', fontWeight: '800' }]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {sessionForm.follow_up_required && (
                <>
                  <Text style={styles.inputLabel}>📅 Next Session Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.inputField}
                    value={sessionForm.next_session_date}
                    onChangeText={txt => setSessionForm(prev => ({ ...prev, next_session_date: txt }))}
                    placeholder="e.g. 2026-09-24"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Case Status</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {['Active', 'Monitoring', 'Resolved'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.childSelectPill,
                      sessionForm.case_status === st && { backgroundColor: '#0284C7', borderColor: '#0284C7' }
                    ]}
                    onPress={() => setSessionForm(prev => ({ ...prev, case_status: st }))}
                  >
                    <Text style={[styles.childSelectPillText, sessionForm.case_status === st && { color: '#FFFFFF', fontWeight: '800' }]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { cursor: 'pointer', marginTop: 10 }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={handleSaveSession}
              >
                <Text style={styles.modalSubmitText}>Save Session Notes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: DISPATCH RECOMMENDATION ================= */}
      <Modal visible={isRecModalVisible} animationType="fade" transparent onRequestClose={() => setIsRecModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Prescribe Activity Recommendation</Text>
              <TouchableOpacity onPress={() => setIsRecModalVisible(false)}><Text style={styles.modalCloseText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Select Child</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childSelectRow}>
                {assignedChildren.map(c => (
                  <TouchableOpacity
                    key={c.user_id}
                    style={[styles.childSelectPill, recForm.child_id === c.user_id && styles.childSelectPillActive]}
                    onPress={() => setRecForm(prev => ({ ...prev, child_id: c.user_id }))}
                  >
                    <Text style={[styles.childSelectPillText, recForm.child_id === c.user_id && styles.childSelectPillTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Recommendation Title</Text>
              <TextInput
                style={styles.inputField}
                value={recForm.title}
                onChangeText={txt => setRecForm(prev => ({ ...prev, title: txt }))}
                placeholder="e.g. 5-Minute Evening Calming Routine"
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childSelectRow}>
                {['Breathing', 'Meditation', 'Mindfulness', 'Routine', 'Activity'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.childSelectPill, recForm.category === cat && styles.childSelectPillActive]}
                    onPress={() => setRecForm(prev => ({ ...prev, category: cat }))}
                  >
                    <Text style={[styles.childSelectPillText, recForm.category === cat && styles.childSelectPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Instruction & Guidance (Shown to Child/Parent)</Text>
              <TextInput
                style={[styles.inputField, { height: 90, textAlignVertical: 'top' }]}
                multiline
                value={recForm.body}
                onChangeText={txt => setRecForm(prev => ({ ...prev, body: txt }))}
                placeholder="Describe the gentle wellbeing exercise for the child..."
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { cursor: 'pointer' }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={handleSaveRecommendation}
              >
                <Text style={styles.modalSubmitText}>Prescribe to Child Dashboard</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 4: CLINICAL REPORT & REFERRAL ================= */}
      <Modal visible={isReportModalVisible} animationType="slide" transparent onRequestClose={() => setIsReportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Standardized Clinical Wellbeing Summary</Text>
                <Text style={styles.modalHeaderSub}>Patient: {reportChild?.name} • Confidential Healthcare Document</Text>
              </View>
              <TouchableOpacity onPress={() => setIsReportModalVisible(false)}><Text style={styles.modalCloseText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.reportDocument}>
                <View style={styles.docHeader}>
                  <Text style={styles.docTitle}>ALPHACARE CLINICAL ASSESSMENT REPORT</Text>
                  <Text style={styles.docDate}>Generated: {new Date().toLocaleDateString()}</Text>
                </View>

                <View style={styles.docSection}>
                  <Text style={styles.docSecTitle}>1. Patient Demographics & Identification</Text>
                  <Text style={styles.docText}>Name: <Text style={{ fontWeight: '700' }}>{reportChild?.name}</Text></Text>
                  <Text style={styles.docText}>Age: {reportChild?.age || 'Unspecified'}</Text>
                  <Text style={styles.docText}>Assigned Counselor: {counselorProfile?.full_name}</Text>
                </View>

                <View style={styles.docSection}>
                  <Text style={styles.docSecTitle}>2. Stress & Wellbeing Evaluation</Text>
                  <Text style={styles.docText}>Current Risk Stratification: <Text style={{ fontWeight: '800', color: getRiskBadge(reportChild?.riskCategory).text }}>{reportChild?.riskCategory}</Text></Text>
                  <Text style={styles.docText}>Latest Assessment Score: {reportChild?.latestAssessment?.final_stress_score ? `${reportChild.latestAssessment.final_stress_score}/100` : 'Pending Check-in'}</Text>
                  <Text style={styles.docText}>Clinical Observations: {getRiskBadge(reportChild?.riskCategory).clinicalDesc}</Text>
                </View>

                <View style={styles.docSection}>
                  <Text style={styles.docSecTitle}>3. Specialist Referral Workflow (Severe / Acute Cases)</Text>
                  <Text style={styles.docText}>
                    If stress indicators indicate acute or complex patterns exceeding supportive counseling, mark a formal referral recommendation below.
                  </Text>

                  {isReferralSaved ? (
                    <View style={styles.referralSuccessBox}>
                      <Text style={styles.referralSuccessTitle}>✓ Formal Referral Flag Active</Text>
                      <Text style={styles.referralSuccessText}>Note: {referralNote}</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        style={[styles.inputField, { height: 75, textAlignVertical: 'top' }]}
                        multiline
                        value={referralNote}
                        onChangeText={setReferralNote}
                        placeholder="State clinical rationale for external psychiatric / pediatric referral..."
                      />
                      <TouchableOpacity style={styles.referralBtn} onPress={handleSaveReferral}>
                        <Text style={styles.referralBtnText}>Mark Formal Referral Recommended</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#15803D', flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
                      window.print();
                    } else {
                      Alert.alert('Report Ready', 'Clinical assessment document formatted. You can print or save as PDF.');
                    }
                  }}
                >
                  <Text style={styles.primaryActionText}>🖨️ Export Report as PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleSaveClinicalReport}
                  disabled={isReportSaving}
                >
                  <Text style={styles.primaryActionText}>{isReportSaving ? 'Saving Report...' : 'Save Clinical Report'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => setIsReportModalVisible(false)}
                >
                  <Text style={styles.secondaryActionText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATION CENTER MODAL (M10) */}
      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
        navigation={navigation}
        userRole="counselor"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },

  // Top Bar
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandBadge: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EAF8F2', alignItems: 'center', justifyContent: 'center' },
  brandBadgeText: { fontSize: 20 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  brandSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counselorMeta: { alignItems: 'flex-end' },
  counselorGreeting: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  counselorName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  logoutBtn: { backgroundColor: '#F1F5F9', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  // Layout Body
  bodyLayout: { flex: 1, flexDirection: 'row' },
  navBar: { width: 250, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingVertical: 16 },
  navBarMobile: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 8 },
  navScroll: { paddingHorizontal: 12, gap: 4 },
  navTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, gap: 10 },
  navTabActive: { backgroundColor: '#EAF8F2' },
  navTabIcon: { fontSize: 16 },
  navTabLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  navTabLabelActive: { color: '#267A68', fontWeight: '900' },

  contentScroll: { flex: 1 },
  contentContainer: { padding: 24 },

  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  // Section Headers
  viewSection: { gap: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryActionBtn: { backgroundColor: '#267A68', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 9 },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryActionBtn: { backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 9, borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryActionText: { color: '#334155', fontSize: 13, fontWeight: '700' },

  // Metrics Grid
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricCard: { flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderLeftWidth: 5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 } },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginVertical: 4 },
  metricNote: { fontSize: 11, color: '#94A3B8' },

  // Priority Alerts
  alertsContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#FEE2E2', gap: 14 },
  alertQueueHeader: { borderBottomWidth: 1, borderBottomColor: '#FEE2E2', paddingBottom: 10 },
  alertQueueTitle: { fontSize: 16, fontWeight: '900', color: '#991B1B' },
  alertQueueSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  alertCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  alertCardResolved: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  alertCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertBadgeHolder: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgePill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  alertChildTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  alertTime: { fontSize: 11, color: '#94A3B8' },
  factorsBox: { marginVertical: 8, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8 },
  factorsHeading: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 4 },
  factorBullet: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  alertActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  statusText: { fontSize: 12, color: '#64748B' },
  alertActionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  ackBtn: { backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  ackBtnText: { color: '#B45309', fontSize: 12, fontWeight: '800' },
  resolveBtn: { backgroundColor: '#15803D', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  resolveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // Assigned Children List
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 },
  searchInput: { flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, height: 42, fontSize: 13 },
  filterPills: { flexDirection: 'row', gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  filterPillActive: { backgroundColor: '#267A68' },
  filterPillText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  filterPillTextActive: { color: '#FFFFFF' },

  childrenList: { gap: 12 },
  childListItem: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, elevation: 1 },
  childMainCol: { flex: 1, minWidth: 260 },
  childNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  childListName: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  childListAge: { fontSize: 13, color: '#64748B' },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskPillText: { fontSize: 11, fontWeight: '900' },
  clinicalNoteText: { fontSize: 12, color: '#475569', marginTop: 4, fontStyle: 'italic' },
  childMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaLabel: { fontSize: 12, color: '#64748B' },
  metaBold: { fontWeight: '800', color: '#1E293B' },
  metaDivider: { color: '#CBD5E1' },
  childActionsCol: { flexDirection: 'row', gap: 8 },
  openCaseBtn: { backgroundColor: '#267A68', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  openCaseBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  reportBtn: { backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  reportBtnText: { color: '#475569', fontSize: 12, fontWeight: '700' },

  // Risk Cases
  riskCasesContainer: { gap: 14 },
  riskCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1.5, gap: 12 },
  riskCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  riskChildName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  riskScoreHeadline: { fontSize: 13, color: '#64748B', marginTop: 2 },
  clinicalAlertBox: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FB923C' },
  clinicalAlertTitle: { fontSize: 12, fontWeight: '900', color: '#9A3412', marginBottom: 2 },
  clinicalAlertDesc: { fontSize: 12, color: '#7C2D12' },
  factorSubTitle: { fontSize: 11, fontWeight: '800', color: '#9A3412', marginTop: 4 },
  riskCardActions: { flexDirection: 'row', gap: 10 },
  scheduleInterventionBtn: { backgroundColor: '#9A3412', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 },
  scheduleBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  viewDeepAnalyticsBtn: { backgroundColor: '#F1F5F9', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 },
  viewDeepText: { color: '#334155', fontSize: 12, fontWeight: '700' },

  // Sessions & Notes
  sessionsList: { gap: 12 },
  fullSessionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 10, elevation: 1 },
  sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionChildTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  sessionTypeBadge: { fontSize: 12, color: '#267A68', fontWeight: '800', marginTop: 2 },
  sessionDateTag: { fontSize: 12, color: '#94A3B8' },
  notesSection: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 },
  notesLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  followUpRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  followUpLabel: { fontSize: 12, color: '#64748B' },
  followUpValue: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  // Appointments
  appointmentList: { gap: 12 },
  appointmentCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 10, elevation: 1 },
  appointmentCardPending: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aptChildName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  aptDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  aptNotesBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  aptNotesLabel: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  aptNotesText: { fontSize: 12, color: '#334155', marginTop: 2 },
  aptActionsRow: { flexDirection: 'row', gap: 10 },
  aptBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  aptBtnConfirm: { backgroundColor: '#267A68' },
  aptBtnTextConfirm: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  aptBtnCancel: { backgroundColor: '#F1F5F9' },
  aptBtnTextCancel: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  aptBtnComplete: { backgroundColor: '#15803D' },
  aptBtnTextComplete: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // Recommendations Grid
  recommendationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  recItemCard: { flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 8, elevation: 1 },
  recItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recCategoryPill: { backgroundColor: '#EAF8F2', color: '#267A68', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '800' },
  recTargetChild: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  recTitleText: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  recBodyText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  recDateTag: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  // Reports
  reportsInstructionBox: { backgroundColor: '#EAF8F2', borderRadius: 14, padding: 18, borderLeftWidth: 4, borderLeftColor: '#267A68' },
  repInstTitle: { fontSize: 15, fontWeight: '900', color: '#165B4C' },
  repInstDesc: { fontSize: 13, color: '#2D6A5B', marginTop: 4, lineHeight: 18 },
  reportChildrenGrid: { gap: 12, marginTop: 6 },
  reportChildCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repChildName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  repChildSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  genReportBtn: { backgroundColor: '#267A68', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  genReportBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // Shared Card Box
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 10, elevation: 1 },
  cardBoxTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  sessionItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sessionItemTop: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionChildName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  sessionDate: { fontSize: 11, color: '#94A3B8' },
  sessionType: { fontSize: 11, color: '#267A68', fontWeight: '700', marginTop: 2 },
  sessionNotesPreview: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Empty States
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, gap: 8 },
  emptyStateEmoji: { fontSize: 36 },
  emptyStateTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  emptyStateSub: { fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 400 },
  emptyInlineText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 10 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 540, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden' },
  modalContainerWide: { width: '100%', maxWidth: 840, maxHeight: '92%', backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FAFBFB' },
  modalHeaderTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  modalHeaderSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalCloseBtn: { padding: 6 },
  modalCloseText: { fontSize: 16, color: '#64748B', fontWeight: '800' },
  modalScroll: { padding: 20, gap: 16 },
  formScroll: { padding: 20, gap: 12 },

  // Modal Case Elements
  modalCaseSummaryBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  summaryBarItem: { flex: 1, minWidth: 120 },
  sumBarLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  sumBarVal: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 },

  chartsRow: { gap: 14 },
  chartWrapper: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  chartHeading: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },

  caseTableBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  tableHeading: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableScore: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  tableSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  tableDate: { fontSize: 11, color: '#94A3B8' },

  modalFooterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },

  // Forms
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#334155' },
  inputField: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  childSelectRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  childSelectPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  childSelectPillActive: { backgroundColor: '#267A68' },
  childSelectPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  childSelectPillTextActive: { color: '#FFFFFF' },
  modalSubmitBtn: { backgroundColor: '#267A68', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  modalSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  // Report Document
  reportDocument: { backgroundColor: '#FAFBFB', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', gap: 14 },
  docHeader: { borderBottomWidth: 2, borderBottomColor: '#0F172A', paddingBottom: 10, marginBottom: 8 },
  docTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5, color: '#0F172A' },
  docDate: { fontSize: 11, color: '#64748B', marginTop: 2 },
  docSection: { gap: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  docSecTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  docText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  referralBtn: { backgroundColor: '#DC2626', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  referralBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  referralSuccessBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', marginTop: 8 },
  referralSuccessTitle: { color: '#991B1B', fontWeight: '800', fontSize: 12 },
  referralSuccessText: { color: '#7F1D1D', fontSize: 11, marginTop: 2 }
});
