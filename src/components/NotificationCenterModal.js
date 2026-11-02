import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';

export const NotificationCenterModal = ({ visible, onClose, navigation, userRole = 'child' }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      const res = await fetch(`${apiHost}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      }
    } catch (e) {
      console.log('Error fetching notifications:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      await fetch(`${apiHost}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.log('Error marking as read:', e.message);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiHost = getApiHost();

      await fetch(`${apiHost}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.log('Mark all read error:', err.message);
    }
  };

  const handleNotificationPress = (notif) => {
    handleMarkAsRead(notif.id);
    onClose();

    if (notif.related_route && navigation) {
      if (notif.related_route === 'CounselorChat') {
        navigation.navigate('CounselorChat', { currentRole: userRole });
      } else if (notif.related_route === 'ParentDashboard') {
        navigation.navigate('ParentDashboard');
      } else if (notif.related_route === 'CounselorDashboard') {
        navigation.navigate('CounselorDashboard');
      } else if (notif.related_route === 'ChildDashboard') {
        navigation.navigate('ChildDashboard');
      } else if (notif.related_route === 'AdminDashboard') {
        navigation.navigate('AdminDashboard');
      }
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'stress_alert': return '🚨';
      case 'meeting_invite': return '🗓️';
      case 'meeting_update': return '✏️';
      case 'meeting_cancel': return '❌';
      case 'counselor_message':
      case 'child_message': return '💬';
      case 'wellness_recommendation': return '✨';
      case 'report_ready': return '📊';
      default: return '🔔';
    }
  };

  const filteredNotifs = filter === 'unread' 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
              <View>
                <Text style={styles.title}>Notification Center</Text>
                <Text style={styles.subtitle}>Important updates & alerts</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* FILTER & MARK ALL ROW */}
          <View style={styles.filterRow}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                  Unread ({notifications.filter(n => !n.is_read).length})
                </Text>
              </TouchableOpacity>
            </View>

            {notifications.some(n => !n.is_read) && (
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LIST */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>Fetching updates...</Text>
            </View>
          ) : filteredNotifs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>✨</Text>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySubtitle}>No new notifications or alerts at this moment.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {filteredNotifs.map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.itemCard, !n.is_read && styles.itemCardUnread]}
                  onPress={() => handleNotificationPress(n)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemIconCircle}>
                    <Text style={{ fontSize: 20 }}>{getIconForType(n.type)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <Text style={[styles.itemTitle, !n.is_read && { fontWeight: '900', color: '#1E1B4B' }]}>
                        {n.title}
                      </Text>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.itemMessage}>{n.message}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.itemTime}>
                        {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {n.related_route ? (
                        <Text style={styles.viewActionText}>View Details ➔</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
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
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800'
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC'
  },
  filterChipActive: {
    backgroundColor: '#EDE9FE'
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B'
  },
  filterTextActive: {
    color: '#7C3AED'
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED'
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B'
  },
  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center'
  },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  itemCardUnread: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE'
  },
  itemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED'
  },
  itemMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 2
  },
  itemTime: {
    fontSize: 11,
    color: '#94A3B8'
  },
  viewActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED'
  }
});
