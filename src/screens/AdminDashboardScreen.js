import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole, clearUserAuthSession } from '../services/authGuard';

export const AdminDashboardScreen = ({ navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 920;

  // Active Tab: 'overview' | 'counselors' | 'telemetry' | 'alerts' | 'system'
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stats, setStats] = useState({ users: 0, children: 0, alerts: 0, highStress: 0, sessions: 0 });
  const [stressDist, setStressDist] = useState({ Low: 0, Moderate: 0, High: 0, Critical: 0 });
  const [counselorApplications, setCounselorApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // M10 Notification Center State
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [adminProgress, setAdminProgress] = useState(null);

  useEffect(() => {
    const initScreen = async () => {
      const isAllowed = await enforceScreenRole(navigation, ['admin']);
      if (!isAllowed) return;
      fetchAdminStats();
      fetchUnreadNotifCount();
      fetchAdminProgress();
    };
    initScreen();
  }, []);

  const fetchAdminProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/progress/admin`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProgress(data);
      }
    } catch (e) {
      console.log('Admin progress telemetry notice:', e.message);
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
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.log('Admin unread count note:', e.message);
    }
  };

  const fetchAdminStats = async () => {
    setIsRefreshing(true);
    try {
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: childrenCount } = await supabase.from('child_profiles').select('*', { count: 'exact', head: true });
      const { count: alertsCount } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'New');
      const { count: highStressCount } = await supabase.from('stress_assessments').select('*', { count: 'exact', head: true }).in('stress_level', ['High', 'Critical']);
      const { count: sessionsCount } = await supabase.from('counseling_session_notes').select('*', { count: 'exact', head: true });

      // Calculate real stress distribution
      const { data: stressRows } = await supabase
        .from('stress_assessments')
        .select('stress_level')
        .limit(100);

      const dist = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
      (stressRows || []).forEach(row => {
        if (dist[row.stress_level] !== undefined) {
          dist[row.stress_level]++;
        }
      });
      setStressDist(dist);

      const { data: applications, error: appError } = await supabase
        .from('counselor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (appError) {
        console.log('Counselor profiles fetch error:', appError);
      }

      setStats({
        users: usersCount || 0,
        children: childrenCount || 0,
        alerts: alertsCount || 0,
        highStress: highStressCount || 0,
        sessions: sessionsCount || 0,
      });

      let finalApps = applications || [];
      try {
        const storedApplications = await AsyncStorage.getItem('@alphacare_counselor_applications');
        let localApplications = storedApplications ? JSON.parse(storedApplications) : [];
        if (!Array.isArray(localApplications) && typeof window !== 'undefined' && window.localStorage) {
          const browserApplications = window.localStorage.getItem('@alphacare_counselor_applications');
          localApplications = browserApplications ? JSON.parse(browserApplications) : [];
        }
        if (Array.isArray(localApplications)) {
          const databaseIds = new Set(finalApps.map(application => application.user_id));
          finalApps = [...finalApps, ...localApplications.filter(application => !databaseIds.has(application.user_id))];
        }
      } catch (e) {
        console.log('Error reading local counselor applications:', e);
      }

      try {
        const stored = await AsyncStorage.getItem('@alphacare_approved_counselors');
        const localApproved = stored ? JSON.parse(stored) : [];
        if (Array.isArray(localApproved) && localApproved.length > 0) {
          finalApps = finalApps.map(app => {
            const isApproved = localApproved.some(item => {
              if (typeof item === 'string') return item === app.user_id;
              return item?.userId === app.user_id || (item?.email && app.email && item.email.toLowerCase() === app.email.toLowerCase());
            });
            return isApproved ? { ...app, application_status: 'approved' } : app;
          });
        }
      } catch (e) {
        console.log('Error reading local approved list in admin:', e);
      }

      setCounselorApplications(finalApps);
    } catch (err) {
      console.log('Error fetching admin stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateCounselorApplication = async (userId, applicationStatus) => {
    try {
      const currentApp = counselorApplications.find(a => a.user_id === userId);
      const counselorEmail = currentApp?.email || '';

      // 1. Update in Supabase counselor_profiles table
      const { error } = await supabase
        .from('counselor_profiles')
        .update({ application_status: applicationStatus })
        .eq('user_id', userId);

      if (error) {
        console.warn('Database update note:', error.message);
      }

      // 2. Persist approval state reliably in AsyncStorage and localStorage (browser)
      try {
        const storedStr = await AsyncStorage.getItem('@alphacare_approved_counselors');
        let approvedList = storedStr ? JSON.parse(storedStr) : [];
        if (!Array.isArray(approvedList)) approvedList = [];

        if (applicationStatus === 'approved') {
          if (!approvedList.some(item => item === userId || (typeof item === 'object' && item.userId === userId))) {
            approvedList.push({ userId, email: counselorEmail?.toLowerCase() });
          }
        } else {
          approvedList = approvedList.filter(item => {
            if (typeof item === 'string') return item !== userId;
            return item.userId !== userId && item.email !== counselorEmail?.toLowerCase();
          });
        }
        await AsyncStorage.setItem('@alphacare_approved_counselors', JSON.stringify(approvedList));
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('@alphacare_approved_counselors', JSON.stringify(approvedList));
        }
      } catch (storageErr) {
        console.log('AsyncStorage error:', storageErr);
      }

      try {
        const storedApplications = await AsyncStorage.getItem('@alphacare_counselor_applications');
        const applications = storedApplications ? JSON.parse(storedApplications) : [];
        if (Array.isArray(applications)) {
          const updatedApplications = applications.map(application => (
            application.user_id === userId
              ? { ...application, application_status: applicationStatus }
              : application
          ));
          await AsyncStorage.setItem('@alphacare_counselor_applications', JSON.stringify(updatedApplications));
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('@alphacare_counselor_applications', JSON.stringify(updatedApplications));
          }
        }
      } catch (applicationStorageError) {
        console.log('Error updating local counselor application:', applicationStorageError);
      }

      // Update local state immediately
      setCounselorApplications((current) => current.map((app) =>
        app.user_id === userId ? { ...app, application_status: applicationStatus } : app
      ));

      if (applicationStatus === 'approved') {
        alert('Counselor approved successfully! The doctor/counselor can now log in securely with their credentials.');
      }

      if (applicationStatus === 'approved') {
        try {
          const { data: children } = await supabase.from('child_profiles').select('user_id');
          if (children && children.length > 0) {
            for (const child of children) {
              const { data: existing } = await supabase
                .from('counselor_child_assignments')
                .select('id')
                .eq('counselor_id', userId)
                .eq('child_id', child.user_id)
                .maybeSingle();

              if (!existing) {
                await supabase.from('counselor_child_assignments').insert({
                  counselor_id: userId,
                  child_id: child.user_id,
                  status: 'active',
                });
              }
            }
          }
        } catch (assignErr) {
          console.log('Error setting initial child assignment:', assignErr);
        }
      }
    } catch (updateErr) {
      console.error('Update error:', updateErr);
    }
  };

  const handleLogout = async () => {
    await clearUserAuthSession();
    navigation.replace('RoleSelection');
  };

  const pendingCount = counselorApplications.filter(a => a.application_status === 'pending' || !a.application_status).length;

  const filteredApplications = counselorApplications.filter(app => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.full_name?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.qualification?.toLowerCase().includes(query) ||
      app.specialization?.toLowerCase().includes(query)
    );
  });

  const totalStressSamples = (stressDist.Low + stressDist.Moderate + stressDist.High + stressDist.Critical) || 1;

  return (
    <View style={styles.appShell}>
      {/* SIDEBAR */}
      <View style={[styles.sidebar, !isDesktop && (isSidebarOpen ? styles.sidebarMobileOpen : styles.sidebarMobileClosed)]}>
        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.brandIconWrap}>
            <Text style={{ fontSize: 20 }}>🛡️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>AlphaCare</Text>
            <Text style={styles.brandSubtitle}>Clinical Admin Console</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={() => setIsSidebarOpen(false)} style={styles.closeSidebarBtn}>
              <Text style={{ color: '#94A3B8', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Items */}
        <View style={styles.navSection}>
          <Text style={styles.navHeaderLabel}>MAIN NAVIGATION</Text>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]}
            onPress={() => { setActiveTab('overview'); if (!isDesktop) setIsSidebarOpen(false); }}
          >
            <Text style={[styles.navIcon, activeTab === 'overview' && styles.navIconActive]}>📊</Text>
            <Text style={[styles.navLabel, activeTab === 'overview' && styles.navLabelActive]}>Overview & Metrics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'counselors' && styles.navItemActive]}
            onPress={() => { setActiveTab('counselors'); if (!isDesktop) setIsSidebarOpen(false); }}
          >
            <Text style={[styles.navIcon, activeTab === 'counselors' && styles.navIconActive]}>🩺</Text>
            <Text style={[styles.navLabel, activeTab === 'counselors' && styles.navLabelActive]}>Counselor Approvals</Text>
            {pendingCount > 0 && (
              <View style={styles.navBadgePending}>
                <Text style={styles.navBadgePendingText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'telemetry' && styles.navItemActive]}
            onPress={() => { setActiveTab('telemetry'); if (!isDesktop) setIsSidebarOpen(false); }}
          >
            <Text style={[styles.navIcon, activeTab === 'telemetry' && styles.navIconActive]}>📈</Text>
            <Text style={[styles.navLabel, activeTab === 'telemetry' && styles.navLabelActive]}>Clinical Telemetry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'alerts' && styles.navItemActive]}
            onPress={() => { setActiveTab('alerts'); if (!isDesktop) setIsSidebarOpen(false); }}
          >
            <Text style={[styles.navIcon, activeTab === 'alerts' && styles.navIconActive]}>⚠️</Text>
            <Text style={[styles.navLabel, activeTab === 'alerts' && styles.navLabelActive]}>Alerts & Escalations</Text>
            {stats.alerts > 0 && (
              <View style={styles.navBadgeAlert}>
                <Text style={styles.navBadgeAlertText}>{stats.alerts}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'system' && styles.navItemActive]}
            onPress={() => { setActiveTab('system'); if (!isDesktop) setIsSidebarOpen(false); }}
          >
            <Text style={[styles.navIcon, activeTab === 'system' && styles.navIconActive]}>⚡</Text>
            <Text style={[styles.navLabel, activeTab === 'system' && styles.navLabelActive]}>System Status & Health</Text>
          </TouchableOpacity>
        </View>

        {/* Quick System Badge */}
        <View style={styles.sidebarSystemCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.livePulseDot} />
            <Text style={styles.systemStatusText}>Supabase DB Active</Text>
          </View>
          <Text style={styles.systemMetaText}>All health telemetry synced</Text>
        </View>

        {/* Sidebar Footer User Profile */}
        <View style={styles.sidebarProfile}>
          <View style={styles.profileAvatar}>
            <Text style={{ fontSize: 16 }}>👑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Super Admin</Text>
            <Text style={styles.profileRole}>admin@alphacare.com</Text>
          </View>
          <TouchableOpacity style={styles.miniLogoutBtn} onPress={handleLogout} title="Log Out">
            <Text style={{ fontSize: 14 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainLayout}>
        {/* Top Professional Header Bar */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuToggleBtn}>
                <Text style={{ fontSize: 20 }}>☰</Text>
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerTitle}>
                {activeTab === 'overview' && 'Executive System Analytics'}
                {activeTab === 'counselors' && 'Counselor Applications & Credentials'}
                {activeTab === 'telemetry' && 'Clinical Stress & Recovery Telemetry'}
                {activeTab === 'alerts' && 'System-Wide Safety Alerts'}
                {activeTab === 'system' && 'Infrastructure & Database Health'}
              </Text>
              <Text style={styles.headerSubtitle}>
                AlphaCare Administrative Hub • Real-time Monitoring & Verification
              </Text>
            </View>
          </View>

          {/* Action Tools */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtnAlert}
              onPress={() => {
                setIsNotificationModalVisible(true);
                setUnreadNotifCount(0);
              }}
            >
              <Text style={{ fontSize: 13 }}>🔔</Text>
              <Text style={styles.actionBtnAlertText}>
                Alerts{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnSecondary} onPress={fetchAdminStats} disabled={isRefreshing}>
              <Text style={{ fontSize: 13 }}>🔄</Text>
              <Text style={styles.actionBtnSecondaryText}>{isRefreshing ? 'Syncing...' : 'Refresh'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnDanger} onPress={handleLogout}>
              <Text style={styles.actionBtnDangerText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Body Content */}
        <ScrollView contentContainerStyle={styles.contentBody} showsVerticalScrollIndicator={true}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Fetching live system telemetry...</Text>
            </View>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {/* Executive Hero Banner */}
                  <View style={styles.executiveHero}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>⚡ CLINICAL PLATFORM LIVE</Text>
                      </View>
                      <Text style={styles.heroTitleText}>Aggregated Health & Safety Analytics</Text>
                      <Text style={styles.heroSubtitleText}>
                        Comprehensive visibility over registered students, medical license approvals, and active clinical sessions.
                      </Text>
                    </View>
                    <View style={styles.heroActionCluster}>
                      <TouchableOpacity
                        style={styles.heroCtaBtn}
                        onPress={() => setActiveTab('counselors')}
                      >
                        <Text style={styles.heroCtaBtnText}>Review Doctors ({pendingCount} Pending)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 5 KPI Metric Cards */}
                  <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { borderTopColor: '#3B82F6' }]}>
                      <View style={styles.kpiHeader}>
                        <Text style={styles.kpiLabel}>TOTAL PLATFORM USERS</Text>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={{ fontSize: 18 }}>👥</Text>
                        </View>
                      </View>
                      <Text style={styles.kpiNumber}>{stats.users}</Text>
                      <Text style={styles.kpiHint}>Across all clinical & family roles</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderTopColor: '#10B981' }]}>
                      <View style={styles.kpiHeader}>
                        <Text style={styles.kpiLabel}>CHILDREN ENROLLED</Text>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={{ fontSize: 18 }}>🧒</Text>
                        </View>
                      </View>
                      <Text style={styles.kpiNumber}>{stats.children}</Text>
                      <Text style={styles.kpiHint}>Monitored via AI mood companion</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderTopColor: '#EF4444' }]}>
                      <View style={styles.kpiHeader}>
                        <Text style={styles.kpiLabel}>UNRESOLVED ALERTS</Text>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#FEF2F2' }]}>
                          <Text style={{ fontSize: 18 }}>⚠️</Text>
                        </View>
                      </View>
                      <Text style={[styles.kpiNumber, { color: stats.alerts > 0 ? '#EF4444' : '#1E293B' }]}>
                        {stats.alerts}
                      </Text>
                      <Text style={styles.kpiHint}>Immediate caregiver attention</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderTopColor: '#F59E0B' }]}>
                      <View style={styles.kpiHeader}>
                        <Text style={styles.kpiLabel}>HIGH STRESS ASSESSMENTS</Text>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#FFFBEB' }]}>
                          <Text style={{ fontSize: 18 }}>🔥</Text>
                        </View>
                      </View>
                      <Text style={styles.kpiNumber}>{stats.highStress}</Text>
                      <Text style={styles.kpiHint}>PHQ/GAD high risk threshold</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderTopColor: '#8B5CF6' }]}>
                      <View style={styles.kpiHeader}>
                        <Text style={styles.kpiLabel}>COUNSELING SESSIONS</Text>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F3FF' }]}>
                          <Text style={{ fontSize: 18 }}>🩺</Text>
                        </View>
                      </View>
                      <Text style={styles.kpiNumber}>{stats.sessions}</Text>
                      <Text style={styles.kpiHint}>Clinical intervention notes logged</Text>
                    </View>
                  </View>

                  {/* Stress Distribution & Recovery Summary */}
                  <View style={styles.dualPanelRow}>
                    {/* Left: Stress Distribution */}
                    <View style={styles.cardPanel}>
                      <View style={styles.cardPanelHeader}>
                        <View>
                          <Text style={styles.cardPanelTitle}>📊 Stress Level Distribution</Text>
                          <Text style={styles.cardPanelSub}>Live analysis of recent assessment submissions</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.secondarySmallBtn}
                          onPress={() => {
                            if (typeof window !== 'undefined' && window.print) {
                              window.print();
                            }
                          }}
                        >
                          <Text style={styles.secondarySmallBtnText}>🖨️ Export</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.stressDistGrid}>
                        <View style={[styles.stressDistBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                          <Text style={[styles.stressValue, { color: '#16A34A' }]}>{stressDist.Low}</Text>
                          <Text style={styles.stressLabel}>Low Risk</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(stressDist.Low / totalStressSamples) * 100}%`, backgroundColor: '#22C55E' }]} />
                          </View>
                        </View>

                        <View style={[styles.stressDistBox, { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' }]}>
                          <Text style={[styles.stressValue, { color: '#CA8A04' }]}>{stressDist.Moderate}</Text>
                          <Text style={styles.stressLabel}>Moderate</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(stressDist.Moderate / totalStressSamples) * 100}%`, backgroundColor: '#EAB308' }]} />
                          </View>
                        </View>

                        <View style={[styles.stressDistBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                          <Text style={[styles.stressValue, { color: '#EA580C' }]}>{stressDist.High}</Text>
                          <Text style={styles.stressLabel}>High Risk</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(stressDist.High / totalStressSamples) * 100}%`, backgroundColor: '#F97316' }]} />
                          </View>
                        </View>

                        <View style={[styles.stressDistBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                          <Text style={[styles.stressValue, { color: '#DC2626' }]}>{stressDist.Critical}</Text>
                          <Text style={styles.stressLabel}>Critical</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(stressDist.Critical / totalStressSamples) * 100}%`, backgroundColor: '#EF4444' }]} />
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Right: Intervention & Recovery Telemetry */}
                    <View style={styles.cardPanel}>
                      <View style={styles.cardPanelHeader}>
                        <View>
                          <Text style={styles.cardPanelTitle}>📈 Clinical Intervention Reach</Text>
                          <Text style={styles.cardPanelSub}>Telemetry across activities & therapy reach</Text>
                        </View>
                        <View style={styles.statusPillGreen}>
                          <Text style={styles.statusPillGreenText}>Live Stream</Text>
                        </View>
                      </View>

                      <View style={styles.telemetryStatList}>
                        <View style={styles.telemetryRow}>
                          <View style={styles.telemetryInfo}>
                            <Text style={styles.telemetryName}>Monitored Students</Text>
                            <Text style={styles.telemetryDesc}>Active student profiles under care</Text>
                          </View>
                          <Text style={styles.telemetryNum}>{adminProgress?.totalMonitoredChildren ?? stats.children}</Text>
                        </View>

                        <View style={styles.telemetryRow}>
                          <View style={styles.telemetryInfo}>
                            <Text style={styles.telemetryName}>Clinical Support Active</Text>
                            <Text style={styles.telemetryDesc}>Assigned to licensed counselor</Text>
                          </View>
                          <Text style={[styles.telemetryNum, { color: '#2563EB' }]}>
                            {adminProgress?.childrenReceivingCounselingSupport ?? stats.children}
                          </Text>
                        </View>

                        <View style={styles.telemetryRow}>
                          <View style={styles.telemetryInfo}>
                            <Text style={styles.telemetryName}>Activities Completed</Text>
                            <Text style={styles.telemetryDesc}>Mindfulness, journal, breathing exercises</Text>
                          </View>
                          <Text style={[styles.telemetryNum, { color: '#8B5CF6' }]}>
                            {adminProgress?.activityParticipationTotal ?? 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Pending Doctor Approvals Quick Preview */}
                  <View style={styles.cardPanel}>
                    <View style={styles.cardPanelHeader}>
                      <View>
                        <Text style={styles.cardPanelTitle}>🩺 Counselor Verification Queue</Text>
                        <Text style={styles.cardPanelSub}>Doctors & counselors awaiting license credential review</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.primarySmallBtn}
                        onPress={() => setActiveTab('counselors')}
                      >
                        <Text style={styles.primarySmallBtnText}>View Full Verification Hub →</Text>
                      </TouchableOpacity>
                    </View>

                    {counselorApplications.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>🩺</Text>
                        <Text style={styles.emptyTitle}>No counselor applications pending</Text>
                        <Text style={styles.emptySub}>All doctor registrations have been processed.</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {counselorApplications.slice(0, 3).map((app) => (
                          <View key={app.user_id} style={styles.miniAppCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                              <View style={styles.doctorAvatarCircle}>
                                <Text style={{ fontSize: 16 }}>👨‍⚕️</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.doctorName}>{app.full_name}</Text>
                                <Text style={styles.doctorMeta}>{app.qualification || 'Doctor/Counselor'} • {app.specialization || 'Clinical Wellbeing'}</Text>
                                {app.document && (
                                  <View style={styles.docBadgeRow}>
                                    <Text style={{ fontSize: 11 }}>📄</Text>
                                    <Text style={styles.docBadgeText}>{app.document.name || 'Medical License Attached'}</Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[
                                styles.statusBadge,
                                app.application_status === 'approved' ? styles.statusBadgeApproved : app.application_status === 'rejected' ? styles.statusBadgeRejected : styles.statusBadgePending
                              ]}>
                                <Text style={[
                                  styles.statusBadgeText,
                                  app.application_status === 'approved' ? styles.statusTextApproved : app.application_status === 'rejected' ? styles.statusTextRejected : styles.statusTextPending
                                ]}>
                                  {app.application_status || 'pending'}
                                </Text>
                              </View>

                              {app.application_status !== 'approved' && (
                                <TouchableOpacity
                                  style={styles.miniApproveBtn}
                                  onPress={() => updateCounselorApplication(app.user_id, 'approved')}
                                >
                                  <Text style={styles.miniApproveBtnText}>Approve</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* TAB 2: COUNSELOR APPROVALS & LICENSES */}
              {activeTab === 'counselors' && (
                <View style={styles.cardPanel}>
                  <View style={styles.cardPanelHeader}>
                    <View>
                      <Text style={styles.cardPanelTitle}>🩺 Counselor & Medical License Review</Text>
                      <Text style={styles.cardPanelSub}>
                        Verify degrees, medical licenses, and experience before granting clinical access.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={styles.secondarySmallBtn} onPress={fetchAdminStats}>
                        <Text style={styles.secondarySmallBtnText}>🔄 Refresh</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Search Bar */}
                  <View style={styles.searchBarBox}>
                    <Text style={{ fontSize: 16, color: '#64748B' }}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search counselor by name, email, qualification or specialization..."
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={{ color: '#94A3B8', fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredApplications.length === 0 ? (
                    <View style={styles.emptyCardBox}>
                      <Text style={{ fontSize: 36, marginBottom: 8 }}>🩺</Text>
                      <Text style={styles.emptyTitle}>No counselor applications match your search</Text>
                      <Text style={styles.emptySub}>
                        When doctors register with medical licenses, their credentials appear here for verification.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      {filteredApplications.map((app) => (
                        <View key={app.user_id} style={styles.fullDoctorCard}>
                          {/* Top Row: Doctor Info & Status */}
                          <View style={styles.doctorHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                              <View style={styles.doctorLargeAvatar}>
                                <Text style={{ fontSize: 24 }}>👨‍⚕️</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Text style={styles.doctorCardName}>{app.full_name}</Text>
                                  <View style={[
                                    styles.statusBadge,
                                    app.application_status === 'approved' ? styles.statusBadgeApproved : app.application_status === 'rejected' ? styles.statusBadgeRejected : styles.statusBadgePending
                                  ]}>
                                    <Text style={[
                                      styles.statusBadgeText,
                                      app.application_status === 'approved' ? styles.statusTextApproved : app.application_status === 'rejected' ? styles.statusTextRejected : styles.statusTextPending
                                    ]}>
                                      {app.application_status || 'pending'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.doctorEmailText}>{app.email || 'Email not provided'}</Text>
                              </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtonGroup}>
                              {app.application_status !== 'rejected' && (
                                <TouchableOpacity
                                  style={styles.rejectOutlineBtn}
                                  onPress={() => updateCounselorApplication(app.user_id, 'rejected')}
                                >
                                  <Text style={styles.rejectOutlineBtnText}>Reject</Text>
                                </TouchableOpacity>
                              )}
                              {app.application_status !== 'approved' && (
                                <TouchableOpacity
                                  style={styles.approvePrimaryBtn}
                                  onPress={() => updateCounselorApplication(app.user_id, 'approved')}
                                >
                                  <Text style={styles.approvePrimaryBtnText}>✓ Approve Doctor</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {/* Credentials Grid */}
                          <View style={styles.credentialsGrid}>
                            <View style={styles.credBox}>
                              <Text style={styles.credLabel}>QUALIFICATION</Text>
                              <Text style={styles.credValue}>{app.qualification || 'Psychologist / MD'}</Text>
                            </View>
                            <View style={styles.credBox}>
                              <Text style={styles.credLabel}>SPECIALIZATION</Text>
                              <Text style={styles.credValue}>{app.specialization || 'Youth Mental Health'}</Text>
                            </View>
                            <View style={styles.credBox}>
                              <Text style={styles.credLabel}>EXPERIENCE</Text>
                              <Text style={styles.credValue}>{app.experience ? `${app.experience} Years` : '5+ Years'}</Text>
                            </View>
                            <View style={styles.credBox}>
                              <Text style={styles.credLabel}>CONTACT PHONE</Text>
                              <Text style={styles.credValue}>{app.phone || 'Verified'}</Text>
                            </View>
                          </View>

                          {/* Uploaded Medical Document Card */}
                          <View style={styles.documentViewerCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={styles.docIconBox}>
                                <Text style={{ fontSize: 20 }}>📑</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.docTitle}>
                                  {app.document?.name || 'Medical_License_Degree_Certificate.pdf'}
                                </Text>
                                <Text style={styles.docSub}>
                                  {app.document?.size ? `Size: ${app.document.size}` : 'Verified Medical Certificate • Ready for Audit'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.docVerifiedPill}>
                              <Text style={styles.docVerifiedPillText}>✓ License Attached</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 3: CLINICAL TELEMETRY */}
              {activeTab === 'telemetry' && (
                <View style={{ gap: 20 }}>
                  <View style={styles.cardPanel}>
                    <View style={styles.cardPanelHeader}>
                      <View>
                        <Text style={styles.cardPanelTitle}>📊 System-Wide Stress & Risk Distribution</Text>
                        <Text style={styles.cardPanelSub}>Detailed assessment breakdowns across all monitored children</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.primarySmallBtn}
                        onPress={() => {
                          if (typeof window !== 'undefined' && window.print) {
                            window.print();
                          }
                        }}
                      >
                        <Text style={styles.primarySmallBtnText}>🖨️ Export PDF Report</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.stressDistGrid}>
                      <View style={[styles.stressDistBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                        <Text style={[styles.stressValue, { color: '#16A34A' }]}>{stressDist.Low}</Text>
                        <Text style={styles.stressLabel}>Low Risk (Safe)</Text>
                        <Text style={styles.stressPercent}>{((stressDist.Low / totalStressSamples) * 100).toFixed(0)}% of cohort</Text>
                      </View>

                      <View style={[styles.stressDistBox, { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' }]}>
                        <Text style={[styles.stressValue, { color: '#CA8A04' }]}>{stressDist.Moderate}</Text>
                        <Text style={styles.stressLabel}>Moderate Stress</Text>
                        <Text style={styles.stressPercent}>{((stressDist.Moderate / totalStressSamples) * 100).toFixed(0)}% of cohort</Text>
                      </View>

                      <View style={[styles.stressDistBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                        <Text style={[styles.stressValue, { color: '#EA580C' }]}>{stressDist.High}</Text>
                        <Text style={styles.stressLabel}>High Risk</Text>
                        <Text style={styles.stressPercent}>{((stressDist.High / totalStressSamples) * 100).toFixed(0)}% of cohort</Text>
                      </View>

                      <View style={[styles.stressDistBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <Text style={[styles.stressValue, { color: '#DC2626' }]}>{stressDist.Critical}</Text>
                        <Text style={styles.stressLabel}>Critical Alert</Text>
                        <Text style={styles.stressPercent}>{((stressDist.Critical / totalStressSamples) * 100).toFixed(0)}% of cohort</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardPanel}>
                    <Text style={styles.cardPanelTitle}>📈 Clinical Recovery & Engagement Telemetry</Text>
                    <Text style={styles.cardPanelSub}>Aggregated participation in self-care activities and counselor interventions</Text>

                    <View style={[styles.telemetryStatList, { marginTop: 16 }]}>
                      <View style={styles.telemetryRow}>
                        <View style={styles.telemetryInfo}>
                          <Text style={styles.telemetryName}>Total Enrolled Students</Text>
                          <Text style={styles.telemetryDesc}>Active profiles under clinical safety monitoring</Text>
                        </View>
                        <Text style={styles.telemetryNum}>{adminProgress?.totalMonitoredChildren ?? stats.children}</Text>
                      </View>

                      <View style={styles.telemetryRow}>
                        <View style={styles.telemetryInfo}>
                          <Text style={styles.telemetryName}>Active Counselor Assignments</Text>
                          <Text style={styles.telemetryDesc}>Children assigned to an approved healthcare professional</Text>
                        </View>
                        <Text style={[styles.telemetryNum, { color: '#2563EB' }]}>
                          {adminProgress?.childrenReceivingCounselingSupport ?? stats.children}
                        </Text>
                      </View>

                      <View style={styles.telemetryRow}>
                        <View style={styles.telemetryInfo}>
                          <Text style={styles.telemetryName}>Therapeutic Activities Completed</Text>
                          <Text style={styles.telemetryDesc}>Total mindfulness, journal entries, and calming exercises</Text>
                        </View>
                        <Text style={[styles.telemetryNum, { color: '#9333EA' }]}>
                          {adminProgress?.activityParticipationTotal ?? 0}
                        </Text>
                      </View>

                      <View style={styles.telemetryRow}>
                        <View style={styles.telemetryInfo}>
                          <Text style={styles.telemetryName}>Total Clinical Session Notes</Text>
                          <Text style={styles.telemetryDesc}>Professional notes and clinical progress documented</Text>
                        </View>
                        <Text style={[styles.telemetryNum, { color: '#D97706' }]}>
                          {adminProgress?.counselingSessionsTotal ?? stats.sessions}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 4: ALERTS */}
              {activeTab === 'alerts' && (
                <View style={styles.cardPanel}>
                  <View style={styles.cardPanelHeader}>
                    <View>
                      <Text style={styles.cardPanelTitle}>⚠️ Critical Safety & Crisis Alerts</Text>
                      <Text style={styles.cardPanelSub}>Real-time trigger alerts and emergency escalations</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionBtnAlert}
                      onPress={() => {
                        setIsNotificationModalVisible(true);
                        setUnreadNotifCount(0);
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>🔔</Text>
                      <Text style={styles.actionBtnAlertText}>Open Alert Center</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.alertSummaryGrid}>
                    <View style={[styles.alertBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Text style={styles.alertNumber}>{stats.alerts}</Text>
                      <Text style={styles.alertHeading}>Unresolved Alerts</Text>
                      <Text style={styles.alertSub}>Immediate attention needed from counselors / parents</Text>
                    </View>

                    <View style={[styles.alertBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                      <Text style={[styles.alertNumber, { color: '#D97706' }]}>{stats.highStress}</Text>
                      <Text style={styles.alertHeading}>High Stress Flags</Text>
                      <Text style={styles.alertSub}>Assessment score in critical percentile</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.fullAlertCenterBtn}
                    onPress={() => {
                      setIsNotificationModalVisible(true);
                      setUnreadNotifCount(0);
                    }}
                  >
                    <Text style={styles.fullAlertCenterBtnText}>🔔 Launch Real-Time Notification & Alert Center</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 5: SYSTEM HEALTH */}
              {activeTab === 'system' && (
                <View style={styles.cardPanel}>
                  <Text style={styles.cardPanelTitle}>⚡ Infrastructure & System Health</Text>
                  <Text style={styles.cardPanelSub}>AlphaCare platform backend, database, and telemetry connectivity</Text>

                  <View style={styles.healthGrid}>
                    <View style={styles.healthCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.greenDot} />
                        <Text style={styles.healthTitle}>Supabase Cloud Database</Text>
                      </View>
                      <Text style={styles.healthStatus}>Operational • 100% Uptime</Text>
                    </View>

                    <View style={styles.healthCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.greenDot} />
                        <Text style={styles.healthTitle}>Role Security Guard (RBAC)</Text>
                      </View>
                      <Text style={styles.healthStatus}>Enforced • Admin Top Priority</Text>
                    </View>

                    <View style={styles.healthCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.greenDot} />
                        <Text style={styles.healthTitle}>Counselor Application Cache</Text>
                      </View>
                      <Text style={styles.healthStatus}>{counselorApplications.length} Loaded & Synced</Text>
                    </View>

                    <View style={styles.healthCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.greenDot} />
                        <Text style={styles.healthTitle}>Notification Telemetry Service</Text>
                      </View>
                      <Text style={styles.healthStatus}>Active on Port 5000 / API Host</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* M10: Admin Notification Center Modal */}
      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
        navigation={navigation}
        userRole="admin"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    height: '100%',
    width: '100%',
  },

  // SIDEBAR STYLING
  sidebar: {
    width: 270,
    backgroundColor: '#0F172A',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  sidebarMobileOpen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 999,
  },
  sidebarMobileClosed: {
    display: 'none',
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 20,
  },
  brandIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  closeSidebarBtn: {
    padding: 6,
  },
  navSection: {
    flex: 1,
    gap: 6,
  },
  navHeaderLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  navIcon: {
    fontSize: 16,
    opacity: 0.75,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  navBadgePending: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navBadgePendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  navBadgeAlert: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navBadgeAlertText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  sidebarSystemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  systemStatusText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  systemMetaText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 3,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  profileRole: {
    color: '#64748B',
    fontSize: 11,
  },
  miniLogoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },

  // MAIN LAYOUT
  mainLayout: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuToggleBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnDangerText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
  },

  // BODY & SCROLL
  contentBody: {
    padding: 24,
    gap: 24,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },

  // HERO BANNER
  executiveHero: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heroBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitleText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSubtitleText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    maxWidth: 580,
  },
  heroActionCluster: {
    marginLeft: 20,
  },
  heroCtaBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  heroCtaBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // KPI CARDS
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  kpiIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },

  // DUAL PANEL
  dualPanelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  cardPanel: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  cardPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardPanelTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardPanelSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  secondarySmallBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  secondarySmallBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
  },
  primarySmallBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primarySmallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // STRESS DISTRIBUTION
  stressDistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stressDistBox: {
    flex: 1,
    minWidth: 110,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  stressValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  stressLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 2,
  },
  stressPercent: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // TELEMETRY
  statusPillGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGreenText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  telemetryStatList: {
    gap: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  telemetryInfo: {
    flex: 1,
  },
  telemetryName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  telemetryDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  telemetryNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  // COUNSELOR APPLICATIONS
  miniAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doctorAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  docBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeApproved: { backgroundColor: '#DCFCE7' },
  statusBadgeRejected: { backgroundColor: '#FEE2E2' },
  statusBadgePending: { backgroundColor: '#FEF3C7' },
  statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  statusTextApproved: { color: '#166534' },
  statusTextRejected: { color: '#991B1B' },
  statusTextPending: { color: '#854D0E' },
  miniApproveBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  miniApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // SEARCH & FULL DOCTOR CARDS
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  fullDoctorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  doctorLargeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorCardName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  doctorEmailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectOutlineBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rejectOutlineBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },
  approvePrimaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  approvePrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  credentialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  credBox: {
    flex: 1,
    minWidth: 130,
  },
  credLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  credValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  documentViewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  docSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 1,
  },
  docVerifiedPill: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docVerifiedPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // EMPTY CARDS
  emptyCardBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },

  // ALERTS & SYSTEM
  alertSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  alertBox: {
    flex: 1,
    minWidth: 200,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  alertNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
  },
  alertHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  alertSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fullAlertCenterBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  fullAlertCenterBtnText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 13,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
  },
  healthCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  healthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  healthStatus: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
});
