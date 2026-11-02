import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';

export const ConsentPrivacyModal = ({
  visible,
  onClose,
  userRole = 'child',
  childId = null,
  childName = null
}) => {
  const [consentData, setConsentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'data_usage' | 'sharing'

  useEffect(() => {
    if (visible) {
      fetchConsentDetails();
    }
  }, [visible, childId]);

  const fetchConsentDetails = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();
      const targetQuery = childId ? `?child_id=${childId}` : '';

      const res = await fetch(`${apiHost}/api/consent${targetQuery}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setConsentData(data);
      } else {
        setConsentData({
          status: 'GRANTED',
          consent_type: 'all',
          privacy_summary: {
            data_collected: ['Mood check-in ratings', 'Stress assessment answers', 'Wellness activity records'],
            purpose: 'Provide early stress detection, personalized coping exercises, and clinical care.',
            sharing_policy: 'Shared exclusively with verified parents and assigned school counselors. Never sold or rented.',
            ai_privacy: 'AI requests are strictly anonymized without emails, phone numbers, or real identities.'
          }
        });
      }
    } catch (e) {
      console.log('Consent fetch notice:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConsent = async (newStatus) => {
    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/consent/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          child_id: childId || session?.user?.id,
          status: newStatus,
          consent_type: 'all'
        })
      });

      if (res.ok) {
        const result = await res.json();
        setConsentData(prev => ({ ...prev, status: newStatus }));
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(result.message || 'Consent updated.');
        } else {
          Alert.alert('Consent Updated', result.message || 'Status updated successfully.');
        }
      } else {
        const err = await res.json();
        Alert.alert('Notice', err.error || 'Failed to update consent.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to connect to consent services.');
    } finally {
      setIsUpdating(false);
    }
  };

  const isGranted = consentData?.status === 'GRANTED';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 20 }}>🛡️</Text>
              </View>
              <View>
                <Text style={styles.title}>Privacy & Guardian Consent</Text>
                <Text style={styles.subtitle}>
                  {childName ? `Managing settings for ${childName}` : 'How AlphaCare safeguards your data'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* TAB BAR */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview & Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'data_usage' && styles.tabItemActive]}
              onPress={() => setActiveTab('data_usage')}
            >
              <Text style={[styles.tabText, activeTab === 'data_usage' && styles.tabTextActive]}>What We Collect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'sharing' && styles.tabItemActive]}
              onPress={() => setActiveTab('sharing')}
            >
              <Text style={[styles.tabText, activeTab === 'sharing' && styles.tabTextActive]}>AI & Security</Text>
            </TouchableOpacity>
          </View>

          {/* CONTENT BODY */}
          {isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading privacy profile...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              
              {/* TAB 1: OVERVIEW & STATUS */}
              {activeTab === 'overview' && (
                <View>
                  <View style={[styles.statusBanner, isGranted ? styles.statusBannerGranted : styles.statusBannerWithdrawn]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 24 }}>{isGranted ? '✅' : '⚠️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.statusTitle, { color: isGranted ? '#065F46' : '#92400E' }]}>
                          Consent Status: {consentData?.status || 'GRANTED'}
                        </Text>
                        <Text style={[styles.statusSub, { color: isGranted ? '#047857' : '#B45309' }]}>
                          {isGranted
                            ? 'Wellness monitoring and personalized coping recommendations are active.'
                            : 'Consent is paused. Sensitive assessment history is restricted.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>👶 Child-Friendly Privacy Promise</Text>
                    <Text style={styles.cardDesc}>
                      AlphaCare uses your daily mood check-ins and relaxation exercises to help you feel your best.
                      Here is our promise to you:
                    </Text>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>💜</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>Your Voice Matters:</Text> You only share what you feel comfortable sharing.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>🔒</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>Private & Protected:</Text> Your personal thoughts are never posted publicly or sold.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>👩‍⚕️</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>Caring Support:</Text> Only your linked parent and assigned school counselor can review your wellness progress.
                      </Text>
                    </View>
                  </View>

                  {/* PARENT/GUARDIAN ACTION CONTROLS */}
                  {userRole === 'parent' && (
                    <View style={styles.actionCard}>
                      <Text style={styles.actionCardTitle}>Guardian Authorization Controls</Text>
                      <Text style={styles.actionCardDesc}>
                        As a legal guardian, you can grant or withdraw consent for automated wellness tracking at any time.
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                        {isGranted ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.withdrawBtn]}
                            onPress={() => handleUpdateConsent('WITHDRAWN')}
                            disabled={isUpdating}
                          >
                            <Text style={styles.withdrawBtnText}>
                              {isUpdating ? 'Updating...' : 'Withdraw Consent'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.grantBtn]}
                            onPress={() => handleUpdateConsent('GRANTED')}
                            disabled={isUpdating}
                          >
                            <Text style={styles.grantBtnText}>
                              {isUpdating ? 'Updating...' : 'Grant Consent'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* TAB 2: DATA USAGE */}
              {activeTab === 'data_usage' && (
                <View>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>📊 What Information We Collect</Text>
                    <View style={styles.dataTagRow}>
                      <View style={styles.dataTag}><Text style={styles.dataTagText}>Daily Moods</Text></View>
                      <View style={styles.dataTag}><Text style={styles.dataTagText}>Stress Check-in Responses</Text></View>
                      <View style={styles.dataTag}><Text style={styles.dataTagText}>Breathing & Game Progress</Text></View>
                      <View style={styles.dataTag}><Text style={styles.dataTagText}>Completed Activities</Text></View>
                    </View>

                    <Text style={[styles.cardTitle, { marginTop: 16 }]}>🎯 Why We Use This Data</Text>
                    <Text style={styles.cardDesc}>
                      • Early intervention: Discovering stress before it leads to exhaustion or burnout.{"\n"}
                      • Tailored coping: Suggesting breathing, meditation, or journaling matching your mood.{"\n"}
                      • Counselor coordination: Enabling your school psychologist or counselor to offer warm, timely check-ins.
                    </Text>
                  </View>
                </View>
              )}

              {/* TAB 3: AI & SECURITY */}
              {activeTab === 'sharing' && (
                <View>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>🤖 AI Safety & Minimization</Text>
                    <Text style={styles.cardDesc}>
                      AlphaCare uses OpenRouter AI for our supportive wellness chatbot. To protect your identity:
                    </Text>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>🛡️</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>No Names or Emails Sent:</Text> Prompts are strictly anonymized.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>🚫</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>Non-Diagnostic:</Text> AI never makes medical diagnoses or prescribes medication.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>🔐</Text>
                      <Text style={styles.bulletText}>
                        <Text style={{ fontWeight: '700' }}>Zero Model Training:</Text> Your private conversations are not used to train public models.
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.card, { marginTop: 12 }]}>
                    <Text style={styles.cardTitle}>🛡️ Multi-Tier Access Control (RBAC)</Text>
                    <Text style={styles.cardDesc}>
                      Data security is enforced on the database level via Row Level Security (RLS) and verified JWT tokens:
                    </Text>
                    <Text style={[styles.cardDesc, { marginTop: 6, fontStyle: 'italic' }]}>
                      • Child: Can only query their own assessments and recommendations.{"\n"}
                      • Parent: Can only view their own linked children.{"\n"}
                      • Counselor: Can only access actively assigned students.
                    </Text>
                  </View>
                </View>
              )}

            </ScrollView>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  container: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B'
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700'
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabItemActive: {
    borderBottomColor: '#7C3AED',
    backgroundColor: '#FFFFFF'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B'
  },
  tabTextActive: {
    color: '#7C3AED'
  },
  body: {
    padding: 20
  },
  statusBanner: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1
  },
  statusBannerGranted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  statusBannerWithdrawn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  statusSub: {
    fontSize: 12,
    marginTop: 2
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8
  },
  cardDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8
  },
  bulletDot: {
    fontSize: 14,
    marginTop: 1
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18
  },
  actionCard: {
    backgroundColor: '#FDF4FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5D0FE',
    marginBottom: 10
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#86198F',
    marginBottom: 4
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#701A75',
    lineHeight: 16
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  grantBtn: {
    backgroundColor: '#059669'
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  withdrawBtn: {
    backgroundColor: '#DC2626'
  },
  withdrawBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  dataTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  dataTag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE'
  },
  dataTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9'
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    alignItems: 'flex-end'
  },
  doneBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  }
});
