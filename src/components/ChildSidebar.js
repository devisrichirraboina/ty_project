import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { clearUserAuthSession } from '../services/authGuard';
import { AppIcon } from './icons/AppIcon';

export const ChildSidebar = ({
  activeTab = 'Home',
  navigation,
  userName = 'Friend',
  onTabPress,
}) => {
  // Never allow counselor names to leak into child navigation
  const safeUserName = (userName && !userName.toLowerCase().includes('veda') && !userName.toLowerCase().includes('siddi') && userName !== 'Friend')
    ? userName
    : undefined;
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

  const handlePress = async (item) => {
    if (onTabPress) {
      const handled = onTabPress(item);
      if (handled) return;
    }

    if (item.label === 'Log Out' || item.route === 'Login') {
      try {
        await clearUserAuthSession();
        if (navigation) navigation.replace('RoleSelection');
      } catch (err) {
        console.log('Logout error:', err);
      }
      return;
    }

    if (!navigation) return;

    if (item.label === 'Home' || item.route === 'ChildDashboard') {
      navigation.navigate('ChildDashboard', { initialTab: 'Home', childName: safeUserName });
      return;
    }

    if (item.action === 'open_privacy' || item.label === 'Profile & Privacy') {
      navigation.navigate('ChildDashboard', { initialTab: 'Profile & Privacy', childName: safeUserName });
      return;
    }

    if (item.action === 'open_reports') {
      navigation.navigate('ChildDashboard', { openAction: 'report', childName: safeUserName });
      return;
    }

    if (item.action === 'open_progress') {
      navigation.navigate('ChildDashboard', { openAction: 'progress', childName: safeUserName });
      return;
    }

    if (item.action === 'open_notifications') {
      navigation.navigate('ChildDashboard', { openAction: 'notifications', childName: safeUserName });
      return;
    }

    if (item.route === 'CounselorChat') {
      navigation.navigate('CounselorChat', { childName: safeUserName, currentRole: 'child' });
      return;
    }

    if (item.route) {
      navigation.navigate(item.route, { childName: safeUserName });
    }
  };

  return (
    <View style={styles.sidebar}>
      <TouchableOpacity
        style={styles.logoSection}
        onPress={() => navigation && navigation.navigate('ChildDashboard', { initialTab: 'Home', childName: safeUserName })}
        activeOpacity={0.8}
      >
        <View style={styles.logoIconCircle}>
          <AppIcon name="heart" size={20} color="#7C3AED" fill="#8B5CF6" strokeWidth={1.5} />
        </View>
        <View>
          <Text style={styles.logoText}>AlphaCare</Text>
          <Text style={styles.logoSubtext}>Smaller Worries</Text>
          <Text style={styles.logoSubtext}>Brighter Tomorrows</Text>
        </View>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.navContainer}>
        {sidebarItems.map((item) => {
          const isActive =
            activeTab === item.label ||
            (activeTab === 'FacialEmotion' && item.route === 'FacialEmotion') ||
            (activeTab === 'Journal' && item.route === 'Journal') ||
            (activeTab === 'Chatbot' && item.route === 'Chatbot') ||
            (activeTab === 'StressBusters' && item.route === 'StressBusters') ||
            (activeTab === 'Questionnaire' && item.route === 'Questionnaire') ||
            (activeTab === 'CounselorChat' && item.route === 'CounselorChat');

          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
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
        <View style={styles.youAreAmazing}>
          <Text style={styles.youAreAmazingText}>You are amazing!</Text>
          <View style={styles.bottomDecorBox}>
            <AppIcon name="leaf" size={20} color="#059669" strokeWidth={2} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRightWidth: 1,
    borderRightColor: '#F0EEF9',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  logoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#26345D',
  },
  logoSubtext: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
  },
  navContainer: {
    paddingHorizontal: 15,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#F3E8FF',
  },
  navIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIconBoxActive: {},
  navText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  navTextActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  sidebarBottom: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  youAreAmazing: {
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    overflow: 'hidden',
  },
  youAreAmazingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#26345D',
    textAlign: 'center',
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
});
