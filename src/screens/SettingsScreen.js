import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export const SettingsScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const currentParams = route?.params || {};
  const initialName = currentParams.childName || currentParams.name || 'Aarav';

  // State for user profile
  const [profile, setProfile] = useState({
    name: initialName,
    username: currentParams.username || 'aarav_patel',
    email: currentParams.email || 'aarav@alphacare.app',
    age: String(currentParams.age || '13'),
    avatar: '👦',
    profileImage: currentParams.profileImage || null,
    bio: 'Learning, growing, and smiling every day! 🌟',
    address: 'B-204, Green Meadows, Garden Road',
    city: 'Mumbai',
    school: 'St. Xavier International School',
    guardianName: 'Priya Patel (Mother)',
    guardianPhone: '+91 98765 43210',
    notifications: true,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'security' | 'preferences'

  const avatarChoices = ['👦', '👧', '🧒', '🧸', '🐱', '🦊', '🦄', '🌟'];

  const sidebarItems = [
    { icon: '🏠', label: 'Home', route: 'ChildDashboard' },
    { icon: '🎮', label: 'Stress Busters', route: 'StressBusters' },
    { icon: '🤖', label: 'AI Assistant', route: 'Chatbot' },
    { icon: '📋', label: 'Wellness Check-in', route: 'Questionnaire' },
    { icon: '🚪', label: 'Log Out', route: 'Login' },
    { icon: '⚙️', label: 'Settings', route: 'Settings' },
  ];

  // Load existing profile from AsyncStorage if saved
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUserStr = await AsyncStorage.getItem('alphacare_current_user');
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          setProfile((prev) => ({
            ...prev,
            ...parsed,
          }));
        } else {
          // Check alphacare_accounts for matching user
          const accountsStr = await AsyncStorage.getItem('alphacare_accounts');
          if (accountsStr) {
            const accounts = JSON.parse(accountsStr);
            if (Array.isArray(accounts) && accounts.length > 0) {
              const matched =
                accounts.find(
                  (a) =>
                    (a.name && a.name.toLowerCase() === initialName.toLowerCase()) ||
                    (a.username && a.username.toLowerCase() === initialName.toLowerCase())
                ) || accounts[accounts.length - 1];

              if (matched) {
                setProfile((prev) => ({
                  ...prev,
                  name: matched.name || prev.name,
                  username: matched.username || prev.username,
                  email: matched.email || prev.email,
                  age: matched.age ? String(matched.age) : prev.age,
                  address: matched.address || prev.address,
                  city: matched.city || prev.city,
                  school: matched.school || prev.school,
                  guardianName: matched.guardianName || prev.guardianName,
                  guardianPhone: matched.guardianPhone || prev.guardianPhone,
                  avatar: matched.avatar || prev.avatar,
                  profileImage: matched.profileImage || prev.profileImage,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.log('Error reading profile:', err);
      }
    };
    loadUserData();
  }, [initialName]);

  const handleUpdateField = (field, val) => {
    setProfile((prev) => ({ ...prev, [field]: val }));
    setStatusMessage(null);
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Uri = event.target.result;
              handleUpdateField('profileImage', base64Uri);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow gallery permissions to choose a profile photo!');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          handleUpdateField('profileImage', result.assets[0].uri);
        }
      }
    } catch (err) {
      console.log('Error picking image from gallery:', err);
      setStatusMessage({ type: 'error', text: 'Could not select photo. Please try again.' });
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setStatusMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
        return;
      }
    }

    try {
      // 1. Save current session
      const updatedUser = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      if (newPassword) {
        updatedUser.password = newPassword;
      }

      await AsyncStorage.setItem('alphacare_current_user', JSON.stringify(updatedUser));

      // 2. Also update in alphacare_accounts array so login stays in sync
      const accountsStr = await AsyncStorage.getItem('alphacare_accounts');
      if (accountsStr) {
        let accounts = JSON.parse(accountsStr);
        if (Array.isArray(accounts)) {
          const index = accounts.findIndex(
            (acc) =>
              (acc.email && acc.email.toLowerCase() === profile.email.toLowerCase()) ||
              (acc.username && acc.username.toLowerCase() === profile.username.toLowerCase())
          );
          if (index !== -1) {
            accounts[index] = {
              ...accounts[index],
              name: profile.name,
              age: Number(profile.age) || accounts[index].age,
              address: profile.address,
              city: profile.city,
              school: profile.school,
              guardianName: profile.guardianName,
              guardianPhone: profile.guardianPhone,
              avatar: profile.avatar,
              profileImage: profile.profileImage || null,
              bio: profile.bio,
              ...(newPassword ? { password: newPassword } : {}),
            };
          } else {
            accounts.push(updatedUser);
          }
          await AsyncStorage.setItem('alphacare_accounts', JSON.stringify(accounts));
        }
      }

      setStatusMessage({ type: 'success', text: '🎉 Profile and details saved successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (Platform.OS !== 'web') {
        Alert.alert('Saved', 'Your profile details have been updated!');
      }
    } catch (err) {
      console.log('Error saving profile:', err);
      setStatusMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    }
  };

  const Sidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.logoSection}>
        <Text style={styles.logoIcon}>💜</Text>
        <View>
          <Text style={styles.logoText}>AlphaCare</Text>
          <Text style={styles.logoSubtext}>Smaller Worries</Text>
          <Text style={styles.logoSubtext}>Brighter Tomorrows</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.navContainer}>
        {sidebarItems.map((item) => {
          const isActive = item.label === 'Settings';
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                if (item.route === 'Settings') return;
                if (item.route === 'ChildDashboard') {
                  navigation.navigate('ChildDashboard', {
                    childName: profile.name,
                    name: profile.name,
                  });
                } else {
                  navigation.navigate(item.route);
                }
              }}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
              <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sidebarBottom}>
        <LinearGradient
          colors={['#E0F2FE', '#F3E8FF']}
          style={styles.youAreAmazing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.youAreAmazingText}>Your Safe Space 💜</Text>
          <Text style={styles.bottomDecor}>✨</Text>
        </LinearGradient>
      </View>
    </View>
  );

  return (
    <View style={styles.appContainer}>
      {isDesktop && <Sidebar />}

      <View style={styles.mainArea}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.navigate('ChildDashboard', {
                  childName: profile.name,
                  name: profile.name,
                })
              }
            >
              <Text style={styles.backButtonText}>← Dashboard</Text>
            </TouchableOpacity>
            <Text style={styles.screenHeading}>Profile & Settings ⚙️</Text>
          </View>

          <TouchableOpacity style={styles.saveTopBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveTopBtnText}>Save Changes ✨</Text>
          </TouchableOpacity>
        </View>

        {/* Content Scroll View */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status banner */}
          {statusMessage && (
            <View
              style={[
                styles.statusBanner,
                statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  statusMessage.type === 'success' ? styles.statusSuccessText : styles.statusErrorText,
                ]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Profile Overview Card */}
          <LinearGradient
            colors={['#FFFFFF', '#FAF5FF']}
            style={styles.overviewCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.overviewHeader}>
              <View style={styles.avatarCircleWrapper}>
                <TouchableOpacity
                  style={styles.avatarCircle}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  {profile.profileImage ? (
                    <Image source={{ uri: profile.profileImage }} style={styles.avatarPhoto} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{profile.avatar}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraBadgeBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cameraBadgeIcon}>📷</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.overviewInfo}>
                <Text style={styles.overviewName}>{profile.name || 'Your Name'}</Text>
                <Text style={styles.overviewHandle}>@{profile.username || 'username'}</Text>

                <View style={styles.photoActionRow}>
                  <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickImage} activeOpacity={0.8}>
                    <Text style={styles.uploadPhotoBtnText}>📷 Choose from Gallery</Text>
                  </TouchableOpacity>

                  {profile.profileImage ? (
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleUpdateField('profileImage', null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removePhotoBtnText}>✕ Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>🌟 AlphaCare Explorer</Text>
                  </View>
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageBadgeText}>🎂 {profile.age} Years Old</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Avatar Selector */}
            <View style={styles.avatarPickerSection}>
              <Text style={styles.fieldSectionLabel}>Pick Your Buddy Avatar:</Text>
              <View style={styles.avatarPickerRow}>
                {avatarChoices.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.avatarChoiceBtn,
                      profile.avatar === emoji && styles.avatarChoiceSelected,
                    ]}
                    onPress={() => handleUpdateField('avatar', emoji)}
                  >
                    <Text style={styles.avatarChoiceText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </LinearGradient>

          {/* Section Navigation Pills */}
          <View style={styles.sectionTabsRow}>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'profile' && styles.sectionTabActive]}
              onPress={() => setActiveSection('profile')}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === 'profile' && styles.sectionTabTextActive,
                ]}
              >
                👤 Personal Details & Address
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'security' && styles.sectionTabActive]}
              onPress={() => setActiveSection('security')}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === 'security' && styles.sectionTabTextActive,
                ]}
              >
                🔒 Password & Security
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'preferences' && styles.sectionTabActive]}
              onPress={() => setActiveSection('preferences')}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === 'preferences' && styles.sectionTabTextActive,
                ]}
              >
                💜 Guardians & Preferences
              </Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 1: PERSONAL & ADDRESS DETAILS */}
          {activeSection === 'profile' && (
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>Personal Information 📝</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Keep your details updated so AlphaCare can customize your experience.
              </Text>

              <View style={styles.inputGrid}>
                {/* Full Name */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Full Name <Text style={styles.reqAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.name}
                    onChangeText={(v) => handleUpdateField('name', v)}
                    placeholder="Enter full name"
                    placeholderTextColor="#B9A7F5"
                  />
                </View>

                {/* Username */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>
                    Username <Text style={styles.reqAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.username}
                    onChangeText={(v) => handleUpdateField('username', v)}
                    placeholder="Enter username"
                    placeholderTextColor="#B9A7F5"
                    autoCapitalize="none"
                  />
                </View>

                {/* Email */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.email}
                    onChangeText={(v) => handleUpdateField('email', v)}
                    placeholder="you@example.com"
                    placeholderTextColor="#B9A7F5"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Age */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.age}
                    onChangeText={(v) => handleUpdateField('age', v.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 13"
                    placeholderTextColor="#B9A7F5"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              {/* Bio / About */}
              <View style={styles.singleFieldWrap}>
                <Text style={styles.inputLabel}>Daily Mood Mantra / Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={profile.bio}
                  onChangeText={(v) => handleUpdateField('bio', v)}
                  placeholder="Share a thought or your favorite affirmation..."
                  placeholderTextColor="#B9A7F5"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.cardHeaderTitle}>Address & School 🏠</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Add your home location and school for local safety resources.
              </Text>

              <View style={styles.inputGrid}>
                {/* Full Address */}
                <View style={styles.fullWidthFieldWrap}>
                  <Text style={styles.inputLabel}>Residential Address / Society</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.address}
                    onChangeText={(v) => handleUpdateField('address', v)}
                    placeholder="e.g. Flat 402, Lotus Court, Hill Road"
                    placeholderTextColor="#B9A7F5"
                  />
                </View>

                {/* City */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>City / Town</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.city}
                    onChangeText={(v) => handleUpdateField('city', v)}
                    placeholder="e.g. Mumbai / Delhi / Bengaluru"
                    placeholderTextColor="#B9A7F5"
                  />
                </View>

                {/* School Name */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>School Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.school}
                    onChangeText={(v) => handleUpdateField('school', v)}
                    placeholder="e.g. Green Valley High School"
                    placeholderTextColor="#B9A7F5"
                  />
                </View>
              </View>
            </View>
          )}

          {/* SECTION 2: PASSWORD & SECURITY */}
          {activeSection === 'security' && (
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>Change Password 🔐</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Update your account password to keep your private diary and data protected.
              </Text>

              <View style={styles.passwordContainer}>
                {/* Current Password */}
                <View style={styles.singleFieldWrap}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={[styles.textInput, { paddingRight: 45 }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#B9A7F5"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.singleFieldWrap}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#B9A7F5"
                    secureTextEntry={!showPassword}
                  />
                </View>

                {/* Confirm New Password */}
                <View style={styles.singleFieldWrap}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-type new password"
                    placeholderTextColor="#B9A7F5"
                    secureTextEntry={!showPassword}
                  />
                </View>

                <View style={styles.securityTipBox}>
                  <Text style={styles.securityTipIcon}>💡</Text>
                  <Text style={styles.securityTipText}>
                    Tip: Use a combination of letters, numbers, and a favorite symbol to make your
                    password strong and memorable!
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* SECTION 3: GUARDIANS & PREFERENCES */}
          {activeSection === 'preferences' && (
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>Emergency & Guardian Contact 👨‍👩‍👧</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Trusted adult details in case you ever need immediate support.
              </Text>

              <View style={styles.inputGrid}>
                {/* Guardian Name */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>Parent / Guardian Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.guardianName}
                    onChangeText={(v) => handleUpdateField('guardianName', v)}
                    placeholder="e.g. Priya Patel"
                    placeholderTextColor="#B9A7F5"
                  />
                </View>

                {/* Guardian Phone */}
                <View style={styles.inputFieldWrap}>
                  <Text style={styles.inputLabel}>Emergency Contact Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profile.guardianPhone}
                    onChangeText={(v) => handleUpdateField('guardianPhone', v)}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor="#B9A7F5"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.cardHeaderTitle}>App Preferences 🔔</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Customize notifications and daily positive reminders.
              </Text>

              <View style={styles.prefRow}>
                <View style={styles.prefTextWrap}>
                  <Text style={styles.prefTitle}>Daily Positive Affirmation Alerts</Text>
                  <Text style={styles.prefDesc}>
                    Receive a gentle morning quote to brighten your day.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, profile.notifications && styles.toggleBtnActive]}
                  onPress={() => handleUpdateField('notifications', !profile.notifications)}
                >
                  <View
                    style={[
                      styles.toggleCircle,
                      profile.notifications && styles.toggleCircleActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Save Action */}
          <View style={styles.bottomActionRow}>
            <TouchableOpacity style={styles.saveMainBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveMainBtnText}>Save All Changes ✨</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    overflow: 'hidden',
  },

  // SIDEBAR (Matching ChildDashboard)
  sidebar: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  logoIcon: { fontSize: 32, marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  logoSubtext: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  navContainer: { paddingHorizontal: 15 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 14,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: '#F3E8FF',
  },
  navIcon: { fontSize: 18, marginRight: 12, opacity: 0.6 },
  navIconActive: { opacity: 1 },
  navText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  navTextActive: { color: '#7E22CE', fontWeight: '800' },
  sidebarBottom: { paddingHorizontal: 15, paddingTop: 10 },
  youAreAmazing: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  youAreAmazingText: { fontSize: 13, fontWeight: '800', color: '#6B21A8' },
  bottomDecor: { fontSize: 16, marginTop: 4 },

  // MAIN AREA
  mainArea: {
    flex: 1,
    backgroundColor: '#FAF5FF',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
    shadowColor: '#2B174F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  saveTopBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // SCROLL CONTENT
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 28,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },

  // STATUS BANNER
  statusBanner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusError: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSuccessText: { color: '#065F46' },
  statusErrorText: { color: '#9F1239' },

  // OVERVIEW CARD
  overviewCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(233, 213, 255, 0.8)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircleWrapper: {
    position: 'relative',
    marginRight: 20,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#C4B5FD',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  avatarEmoji: { fontSize: 44 },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#7C3AED',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cameraBadgeIcon: {
    fontSize: 14,
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  uploadPhotoBtn: {
    backgroundColor: '#EDE9FE',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  uploadPhotoBtnText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '800',
  },
  removePhotoBtn: {
    backgroundColor: '#FFF1F2',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  removePhotoBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '800',
  },
  overviewInfo: { flex: 1 },
  overviewName: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
  overviewHandle: { fontSize: 14, color: '#7C3AED', fontWeight: '700', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: { color: '#92400E', fontSize: 11, fontWeight: '800' },
  ageBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ageBadgeText: { color: '#6B21A8', fontSize: 11, fontWeight: '800' },

  // AVATAR PICKER
  avatarPickerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  avatarChoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarChoiceSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
    transform: [{ scale: 1.1 }],
  },
  avatarChoiceText: { fontSize: 22 },

  // SECTION TABS
  sectionTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  sectionTab: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTabActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // FORM CARD
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: '#2B174F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },

  // INPUTS
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  inputFieldWrap: {
    flex: 1,
    minWidth: 260,
  },
  fullWidthFieldWrap: {
    width: '100%',
  },
  singleFieldWrap: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  reqAsterisk: {
    color: '#EC4899',
  },
  textInput: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },

  // PASSWORD STYLES
  passwordContainer: {
    maxWidth: 500,
  },
  passwordInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
  },
  securityTipBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 10,
  },
  securityTipIcon: { fontSize: 20, marginRight: 10 },
  securityTipText: { fontSize: 12, color: '#166534', flex: 1, lineHeight: 18, fontWeight: '600' },

  // PREFERENCES
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  prefTextWrap: { flex: 1, marginRight: 16 },
  prefTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  prefDesc: { fontSize: 12, color: '#64748B' },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    padding: 3,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#7C3AED',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },

  // BOTTOM ACTIONS
  bottomActionRow: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  saveMainBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  saveMainBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
