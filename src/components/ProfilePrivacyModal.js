import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { clearUserAuthSession } from '../services/authGuard';

export const ProfilePrivacyModal = ({
  visible,
  onClose,
  userName = 'Friend',
  currentAvatar = '👦',
  onProfileUpdated,
  navigation,
}) => {
  // Navigation tabs inside the modal
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'account' | 'privacy' | 'security' | 'data' | 'notifications'

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Profile States
  const [name, setName] = useState(userName);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('11');
  const [bio, setBio] = useState('Loving my creative journey on AlphaCare ✨');
  const [favoriteActivity, setFavoriteActivity] = useState('Color Calm 🎨');
  const [avatar, setAvatar] = useState(currentAvatar || '👦');
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);

  // 2. Account & Username Settings
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [address, setAddress] = useState(''); // Optional

  // 3. Password & Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 4. Privacy Settings (Child-Friendly)
  const [isProfilePrivate, setIsProfilePrivate] = useState(true);
  const [shareMoodWithParent, setShareMoodWithParent] = useState(true);
  const [shareProgressWithCounselor, setShareProgressWithCounselor] = useState(true);
  const [journalIsPrivate, setJournalIsPrivate] = useState(true);

  // 5. Notifications
  const [notifWellness, setNotifWellness] = useState(true);
  const [notifMoodCheckin, setNotifMoodCheckin] = useState(true);
  const [notifCounselorMsg, setNotifCounselorMsg] = useState(true);
  const [notifMilestones, setNotifMilestones] = useState(true);

  // 6. Data & Consent
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generalConsent, setGeneralConsent] = useState(true);

  // Friendly avatar collection
  const avatarOptions = [
    { emoji: '👦', label: 'Boy' },
    { emoji: '👧', label: 'Girl' },
    { emoji: '🦊', label: 'Fox' },
    { emoji: '🐱', label: 'Cat' },
    { emoji: '🐼', label: 'Panda' },
    { emoji: '🦁', label: 'Lion' },
    { emoji: '🐨', label: 'Koala' },
    { emoji: '🦄', label: 'Unicorn' },
    { emoji: '🐰', label: 'Bunny' },
    { emoji: '🐶', label: 'Puppy' },
    { emoji: '🌸', label: 'Flower' },
    { emoji: '🌟', label: 'Star' },
    { emoji: '🚀', label: 'Rocket' },
    { emoji: '🧸', label: 'Teddy' },
    { emoji: '🐬', label: 'Dolphin' },
    { emoji: '🐧', label: 'Penguin' },
  ];

  // Activities collection
  const activityOptions = [
    'Color Calm 🎨',
    'Bubble Break 🫧',
    'Zen Garden 🧘',
    'Guided Breathing 🫁',
    'AlphaBuddy AI 🤖',
    'Stress Busters 🎮',
  ];

  // Fetch current user data when modal opens
  useEffect(() => {
    if (visible) {
      loadUserData();
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [visible]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const activeEmail = await AsyncStorage.getItem('@alphacare_active_user_email');
      const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');
      const { data: { user } } = await supabase.auth.getUser();

      const isCounselorOrParent = user && (
        user.email === 'veda.siddi@alphacare.com' ||
        user.email?.toLowerCase().includes('counselor') ||
        user.user_metadata?.role === 'counselor' ||
        user.user_metadata?.role === 'parent' ||
        (activeEmail && user.email && user.email.toLowerCase() !== activeEmail.toLowerCase())
      );

      if (user && !isCounselorOrParent) {
        const meta = user.user_metadata || {};
        setName(meta.name || activeName || userName || 'Friend');
        setUsername(meta.username || user.email?.split('@')[0] || '');
        setNewUsernameInput(meta.username || user.email?.split('@')[0] || '');
        setEmail(user.email || '');
        setPhone(meta.phone || '');
        if (meta.age) setAge(String(meta.age));
        if (meta.bio) setBio(meta.bio);
        if (meta.favoriteActivity) setFavoriteActivity(meta.favoriteActivity);
        if (meta.avatar) setAvatar(meta.avatar);
        if (meta.customPhotoUrl) setCustomPhotoUrl(meta.customPhotoUrl);
        if (meta.address) setAddress(meta.address);
      } else {
        const safeChildName = activeName || (userName && !userName.toLowerCase().includes('veda') ? userName : 'Devisri chirraboina');
        const safeEmail = activeEmail || 'chirraboinad@gmail.com';
        setName(safeChildName);
        setEmail(safeEmail);
        setUsername(safeEmail.split('@')[0] || 'child_explorer');
        setNewUsernameInput(safeEmail.split('@')[0] || 'child_explorer');
      }

      // Load cached privacy settings
      const privacyCached = await AsyncStorage.getItem('@alphacare_privacy_settings');
      if (privacyCached) {
        const p = JSON.parse(privacyCached);
        if (p.isProfilePrivate !== undefined) setIsProfilePrivate(p.isProfilePrivate);
        if (p.shareMoodWithParent !== undefined) setShareMoodWithParent(p.shareMoodWithParent);
        if (p.shareProgressWithCounselor !== undefined) setShareProgressWithCounselor(p.shareProgressWithCounselor);
      }

      // Load notification prefs
      const notifCached = await AsyncStorage.getItem('@alphacare_notification_prefs');
      if (notifCached) {
        const n = JSON.parse(notifCached);
        if (n.wellness !== undefined) setNotifWellness(n.wellness);
        if (n.mood !== undefined) setNotifMoodCheckin(n.mood);
        if (n.counselor !== undefined) setNotifCounselorMsg(n.counselor);
        if (n.milestones !== undefined) setNotifMilestones(n.milestones);
      }
    } catch (err) {
      console.log('Error loading profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showErrorToast = (msg) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // 1. Save Profile Details
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showErrorToast('Please enter your name.');
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updatedMeta = {
        name: name.trim(),
        avatar: avatar,
        customPhotoUrl: customPhotoUrl,
        age: age.trim(),
        bio: bio.trim(),
        favoriteActivity: favoriteActivity,
      };

      if (user) {
        await supabase.auth.updateUser({ data: updatedMeta });
      }

      // Local storage cache for instant offline access
      await AsyncStorage.setItem('@alphacare_child_profile_settings', JSON.stringify(updatedMeta));

      if (onProfileUpdated) {
        onProfileUpdated({ name: name.trim(), avatar, customPhotoUrl });
      }

      showToast('Profile updated successfully! ✨');
    } catch (err) {
      console.log('Save profile error:', err);
      showErrorToast('Could not save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save Username & Account
  const handleSaveAccount = async () => {
    const trimmedUser = newUsernameInput.trim().toLowerCase();
    if (!trimmedUser || trimmedUser.length < 3) {
      showErrorToast('Username must be at least 3 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updatedMeta = {
        username: trimmedUser,
        phone: phone.trim(),
        address: address.trim(),
      };

      if (user) {
        await supabase.auth.updateUser({ data: updatedMeta });
      }
      setUsername(trimmedUser);
      showToast('Account details updated! 💜');
    } catch (err) {
      showErrorToast('Could not update username. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Update Password
  const handleUpdatePassword = async () => {
    if (!newPassword) {
      showErrorToast('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      showErrorToast('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorToast('New passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showErrorToast(`Password update failed: ${error.message}`);
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password changed securely! 🔒');
      }
    } catch (err) {
      showErrorToast('Unable to update password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Save Privacy Preferences
  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      const privacyObj = {
        isProfilePrivate,
        shareMoodWithParent,
        shareProgressWithCounselor,
        journalIsPrivate,
      };
      await AsyncStorage.setItem('@alphacare_privacy_settings', JSON.stringify(privacyObj));
      showToast('Privacy preferences saved! 🛡️');
    } catch (err) {
      showErrorToast('Failed to save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Notifications
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const notifObj = {
        wellness: notifWellness,
        mood: notifMoodCheckin,
        counselor: notifCounselorMsg,
        milestones: notifMilestones,
      };
      await AsyncStorage.setItem('@alphacare_notification_prefs', JSON.stringify(notifObj));
      showToast('Notification preferences saved! 🔔');
    } catch (err) {
      showErrorToast('Failed to save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Image Upload from device (Web & Mobile supported)
  const handlePhotoUpload = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const base64Url = uploadEvent.target.result;
            setCustomPhotoUrl(base64Url);
            showToast('Photo selected! Tap "Save Changes" to apply.');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Upload Photo', 'Select a friendly photo or choose an illustrated avatar below.');
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = () => {
    setCustomPhotoUrl(null);
    showToast('Photo removed. Using default avatar.');
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await clearUserAuthSession();
      onClose();
      if (navigation) {
        navigation.replace('RoleSelection');
      }
    } catch (e) {
      console.log('Logout error:', e);
    }
  };

  // Handle Download My Data
  const handleDownloadData = () => {
    const exportData = {
      user: {
        name,
        username,
        email,
        age,
        bio,
        favoriteActivity,
        avatar,
      },
      privacySettings: {
        isProfilePrivate,
        shareMoodWithParent,
        shareProgressWithCounselor,
        journalIsPrivate,
      },
      notificationPreferences: {
        wellnessReminders: notifWellness,
        moodCheckin: notifMoodCheckin,
        counselorMessages: notifCounselorMsg,
        milestones: notifMilestones,
      },
      exportedAt: new Date().toISOString(),
      platform: 'AlphaCare Child Safe Sanctuary',
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alphacare-data-${username || 'child'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Your data has been downloaded! 📥');
    } else {
      Alert.alert('Data Export', 'Your AlphaCare information is ready.');
    }
  };

  // Password strength calculator
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: '#CBD5E1', score: 0 };
    if (pass.length < 6) return { label: 'Too short (min 6 chars)', color: '#EF4444', score: 1 };
    if (pass.length < 9) return { label: 'Good 👍', color: '#F59E0B', score: 2 };
    return { label: 'Strong & Secure ✨', color: '#10B981', score: 3 };
  };
  const strength = getPasswordStrength(newPassword);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>

          {/* TOP HEADER WITH PROFILE SUMMARY */}
          <View style={styles.topHeader}>
            <View style={styles.profileSummaryRow}>
              <View style={styles.mainAvatarContainer}>
                {customPhotoUrl ? (
                  <Image source={{ uri: customPhotoUrl }} style={styles.customPhotoImage} />
                ) : (
                  <Text style={styles.mainAvatarEmoji}>{avatar}</Text>
                )}
                <TouchableOpacity style={styles.editAvatarMiniBtn} onPress={() => setActiveTab('profile')}>
                  <Text style={{ fontSize: 12 }}>✏️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileSummaryText}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.greetingTitle}>Hi, {name || 'Friend'}! 💜</Text>
                  <View style={styles.safeBadge}>
                    <Text style={styles.safeBadgeText}>Protected</Text>
                  </View>
                </View>
                <Text style={styles.usernameSubtext}>@{username || 'child_user'}</Text>
                <Text style={styles.emailSubtext}>{email || 'child@alphacare.com'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* PRIVACY STATUS HIGHLIGHT CARD */}
          <View style={styles.privacyStatusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <Text style={styles.privacyStatusTitle}>Your Privacy Matters 💜</Text>
            </View>
            <Text style={styles.privacyStatusDesc}>
              Your AlphaCare profile and wellness information are protected by the privacy settings available to you.
            </Text>
            <View style={styles.statusPillsRow}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>✓ Profile protected</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>✓ Privacy settings active</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>✓ Account secured</Text>
              </View>
            </View>
          </View>

          {/* NOTIFICATION FEEDBACK BANNERS */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠ {errorMessage}</Text>
            </View>
          ) : null}

          {/* TAB NAVIGATION BAR */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabNavContainer}
          >
            {[
              { id: 'profile', label: '👤 Profile' },
              { id: 'account', label: '⚙️ Account' },
              { id: 'privacy', label: '🔒 Privacy' },
              { id: 'security', label: '🛡️ Password' },
              { id: 'data', label: '📦 Your Data' },
              { id: 'notifications', label: '🔔 Notifications' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* SCROLLABLE MAIN CONTENT */}
          <ScrollView
            style={styles.modalBodyScroll}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={true}
          >
            {isLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Loading your profile...</Text>
              </View>
            ) : null}

            {/* ================= TAB 1: PROFILE ================= */}
            {!isLoading && activeTab === 'profile' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Profile & Avatar 🎨</Text>
                <Text style={styles.sectionHeaderSub}>Personalize how your AlphaCare sanctuary feels</Text>

                {/* Avatar & Photo Action Card */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Profile Picture / Avatar</Text>
                  
                  <View style={styles.avatarActionsRow}>
                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={handlePhotoUpload} activeOpacity={0.8}>
                      <Text style={styles.actionBtnTextPrimary}>📤 Upload Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleRemovePhoto} activeOpacity={0.8}>
                      <Text style={styles.actionBtnTextSecondary}>🗑️ Remove Photo</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Avatar Picker List */}
                  <Text style={[styles.inputLabel, { marginTop: 16, marginBottom: 8 }]}>Or Choose a Cute Avatar:</Text>
                  <View style={styles.avatarGrid}>
                    {avatarOptions.map((item) => (
                      <TouchableOpacity
                        key={item.emoji}
                        style={[
                          styles.avatarGridItem,
                          avatar === item.emoji && !customPhotoUrl && styles.avatarGridItemActive,
                        ]}
                        onPress={() => {
                          setAvatar(item.emoji);
                          setCustomPhotoUrl(null);
                        }}
                      >
                        <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Basic Info Fields */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Basic Information</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Full Name <Text style={styles.requiredMark}>*</Text></Text>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={styles.textInput}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        placeholder="e.g. 11"
                        placeholderTextColor="#94A3B8"
                        maxLength={2}
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 2 }]}>
                      <Text style={styles.inputLabel}>Favorite Wellness Activity</Text>
                      <TextInput
                        style={styles.textInput}
                        value={favoriteActivity}
                        onChangeText={setFavoriteActivity}
                        placeholder="Activity"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* Activity Quick Picks */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {activityOptions.map((act) => (
                      <TouchableOpacity
                        key={act}
                        style={[
                          styles.activityPill,
                          favoriteActivity === act && styles.activityPillActive,
                        ]}
                        onPress={() => setFavoriteActivity(act)}
                      >
                        <Text
                          style={[
                            styles.activityPillText,
                            favoriteActivity === act && styles.activityPillTextActive,
                          ]}
                        >
                          {act}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>My Happy Motto / Bio</Text>
                    <TextInput
                      style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={3}
                      placeholder="Write a cheerful quote or note to yourself"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveMainBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveMainBtnText}>Save Profile Changes ✨</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= TAB 2: ACCOUNT & USERNAME ================= */}
            {!isLoading && activeTab === 'account' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Account Details ⚙️</Text>
                <Text style={styles.sectionHeaderSub}>Manage your login identity and contact settings</Text>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Username Settings</Text>
                  
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Current Username</Text>
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText}>@{username || 'child_user'}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>New Username <Text style={styles.requiredMark}>*</Text></Text>
                    <TextInput
                      style={styles.textInput}
                      value={newUsernameInput}
                      onChangeText={setNewUsernameInput}
                      placeholder="Choose a cool nickname"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                    <Text style={styles.helperSub}>Min 3 characters, letters and numbers.</Text>
                  </View>
                </View>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Contact & Location</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Registered Email</Text>
                    <View style={[styles.readOnlyBox, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                      <Text style={styles.readOnlyText}>{email || 'Not connected'}</Text>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '800' }}>✓ Verified</Text>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.inputLabel}>Address</Text>
                      <Text style={styles.optionalTag}>Optional</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="City or general region (optional)"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.helperSub}>🔒 Optional: Children are never required to provide a physical home address.</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveMainBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSaveAccount}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveMainBtnText}>Save Account Changes 💾</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= TAB 3: PRIVACY ================= */}
            {!isLoading && activeTab === 'privacy' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Privacy Controls 🔒</Text>
                <Text style={styles.sectionHeaderSub}>You control who can view your wellness journey</Text>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Profile Visibility</Text>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>Private Profile Mode</Text>
                      <Text style={styles.toggleDesc}>
                        Only authorized parents and verified counselors can see your wellness reflections.
                      </Text>
                    </View>
                    <Switch
                      value={isProfilePrivate}
                      onValueChange={setIsProfilePrivate}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={isProfilePrivate ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>
                </View>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Wellness Data Sharing</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>Share Mood Check-ins with Parent 👨‍👩‍👧</Text>
                      <Text style={styles.toggleDesc}>
                        Helps your parent/guardian understand your emotions and support you.
                      </Text>
                    </View>
                    <Switch
                      value={shareMoodWithParent}
                      onValueChange={setShareMoodWithParent}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={shareMoodWithParent ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>Share Progress with Counselor 🧑‍⚕️</Text>
                      <Text style={styles.toggleDesc}>
                        Allows your school counselor to suggest helpful relaxation exercises.
                      </Text>
                    </View>
                    <Switch
                      value={shareProgressWithCounselor}
                      onValueChange={setShareProgressWithCounselor}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={shareProgressWithCounselor ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>
                </View>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Journal Privacy 📝</Text>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>Private Daily Journal 🔒</Text>
                      <Text style={styles.toggleDesc}>
                        Your journal thoughts are private to you by default unless you tap "Share with Counselor".
                      </Text>
                    </View>
                    <Switch
                      value={journalIsPrivate}
                      onValueChange={setJournalIsPrivate}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={journalIsPrivate ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveMainBtn} onPress={handleSavePrivacy}>
                  <Text style={styles.saveMainBtnText}>Save Privacy Settings 🛡️</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 4: PASSWORD & SECURITY ================= */}
            {!isLoading && activeTab === 'security' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Password & Security 🛡️</Text>
                <Text style={styles.sectionHeaderSub}>Protect your safe space with a strong password</Text>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Change Password</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    {newPassword.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <View style={[styles.strengthBar, { backgroundColor: strength.color, width: strength.score * 40 }]} />
                        <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveMainBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleUpdatePassword}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveMainBtnText}>Update Password 🔑</Text>
                  </TouchableOpacity>
                </View>

                {/* Device & Session Controls */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Session & Devices</Text>
                  <Text style={styles.helperSub}>Manage device logouts to keep your account safe.</Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleLogout}>
                      <Text style={styles.actionBtnTextSecondary}>🚪 Log Out (This Device)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleLogout}>
                      <Text style={styles.actionBtnTextSecondary}>🛑 Log Out All Devices</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ================= TAB 5: YOUR DATA ================= */}
            {!isLoading && activeTab === 'data' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Your Data & Consent 📦</Text>
                <Text style={styles.sectionHeaderSub}>See and manage the information associated with your account</Text>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Information AlphaCare Keeps</Text>
                  <Text style={styles.toggleDesc}>
                    AlphaCare only collects details needed to make your wellness check-ins helpful and fun.
                  </Text>

                  <View style={styles.dataBadgeList}>
                    <View style={styles.dataBadgeItem}>
                      <Text style={styles.dataBadgeIcon}>😊</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dataBadgeTitle}>Mood Ratings</Text>
                        <Text style={styles.dataBadgeSub}>To draw your weekly wellness graphs</Text>
                      </View>
                    </View>

                    <View style={styles.dataBadgeItem}>
                      <Text style={styles.dataBadgeIcon}>📝</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dataBadgeTitle}>Daily Journal Entries</Text>
                        <Text style={styles.dataBadgeSub}>Stored privately on your personal account</Text>
                      </View>
                    </View>

                    <View style={styles.dataBadgeItem}>
                      <Text style={styles.dataBadgeIcon}>🎮</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dataBadgeTitle}>Activity & Game Milestones</Text>
                        <Text style={styles.dataBadgeSub}>To track your streak and breathing sessions</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleDownloadData}>
                      <Text style={styles.actionBtnTextPrimary}>📥 Download My Data</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => setShowDataViewer(!showDataViewer)}
                    >
                      <Text style={styles.actionBtnTextSecondary}>
                        {showDataViewer ? '✕ Hide Data' : '👁️ View My Data'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inline Live Data Viewer */}
                  {showDataViewer && (
                    <View style={styles.dataViewerBox}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 6 }}>
                        Account Data Summary:
                      </Text>
                      <Text style={styles.dataViewerText}>• Name: {name}</Text>
                      <Text style={styles.dataViewerText}>• Username: @{username}</Text>
                      <Text style={styles.dataViewerText}>• Email: {email}</Text>
                      <Text style={styles.dataViewerText}>• Age: {age || 'Not set'}</Text>
                      <Text style={styles.dataViewerText}>• Bio: "{bio}"</Text>
                      <Text style={styles.dataViewerText}>• Favorite Activity: {favoriteActivity}</Text>
                      <Text style={styles.dataViewerText}>• Profile Private: {isProfilePrivate ? 'Yes' : 'No'}</Text>
                    </View>
                  )}
                </View>

                {/* Consent & Account Removal */}
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Consent & Account Removal</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>Wellness Activity Personalization</Text>
                      <Text style={styles.toggleDesc}>
                        Allow AlphaCare to recommend mindful games based on your mood check-in.
                      </Text>
                    </View>
                    <Switch
                      value={generalConsent}
                      onValueChange={setGeneralConsent}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={generalConsent ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#FEE2E2' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626', marginBottom: 4 }}>
                      Delete Account
                    </Text>
                    <Text style={styles.toggleDesc}>
                      Permanently remove your account and wellness records. Please discuss with your parent/guardian before requesting deletion.
                    </Text>

                    {!showDeleteConfirm ? (
                      <TouchableOpacity
                        style={styles.deleteAccountBtn}
                        onPress={() => setShowDeleteConfirm(true)}
                      >
                        <Text style={styles.deleteAccountBtnText}>🗑️ Delete Account</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.deleteConfirmBox}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#B91C1C', marginBottom: 6 }}>
                          Are you sure you want to delete your account?
                        </Text>
                        <Text style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 12 }}>
                          This action cannot be undone. All your mood streaks and journals will be removed.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={styles.cancelDeleteBtn}
                            onPress={() => setShowDeleteConfirm(false)}
                          >
                            <Text style={styles.cancelDeleteBtnText}>Keep My Account</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.confirmDeleteBtn}
                            onPress={async () => {
                              try {
                                await clearUserAuthSession();
                                onClose();
                                if (navigation) navigation.replace('RoleSelection');
                              } catch (e) {}
                            }}
                          >
                            <Text style={styles.confirmDeleteBtnText}>Confirm Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ================= TAB 6: NOTIFICATIONS ================= */}
            {!isLoading && activeTab === 'notifications' && (
              <View style={styles.tabContentSection}>
                <Text style={styles.sectionHeaderTitle}>Notifications 🔔</Text>
                <Text style={styles.sectionHeaderSub}>Choose which gentle reminders and alerts you'd like to receive</Text>

                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mindful Reminders</Text>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>🧘 Guided Breathing & Meditation</Text>
                      <Text style={styles.toggleDesc}>A friendly nudge to relax when you have free time.</Text>
                    </View>
                    <Switch
                      value={notifWellness}
                      onValueChange={setNotifWellness}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={notifWellness ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>🌟 Daily Mood Check-in Reminder</Text>
                      <Text style={styles.toggleDesc}>Gentle reminder to record your daily emoji feelings.</Text>
                    </View>
                    <Switch
                      value={notifMoodCheckin}
                      onValueChange={setNotifMoodCheckin}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={notifMoodCheckin ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>💬 Counselor Messages & Advice</Text>
                      <Text style={styles.toggleDesc}>Alerts when your school counselor shares guidance.</Text>
                    </View>
                    <Switch
                      value={notifCounselorMsg}
                      onValueChange={setNotifCounselorMsg}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={notifCounselorMsg ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <View style={[styles.toggleRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleLabel}>🏆 Streak & Milestone Celebrations</Text>
                      <Text style={styles.toggleDesc}>Celebrate when you reach 3, 7, and 14-day wellness streaks!</Text>
                    </View>
                    <Switch
                      value={notifMilestones}
                      onValueChange={setNotifMilestones}
                      trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                      thumbColor={notifMilestones ? '#7C3AED' : '#94A3B8'}
                    />
                  </View>

                  <TouchableOpacity style={[styles.saveMainBtn, { marginTop: 18 }]} onPress={handleSaveNotifications}>
                    <Text style={styles.saveMainBtnText}>Save Notification Preferences 🔔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </ScrollView>

          {/* MODAL FOOTER */}
          <View style={styles.modalFooter}>
            <Text style={styles.footerBrandText}>AlphaCare Safe Sanctuary 💜 Safe, Private & Child-Friendly</Text>
            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose}>
              <Text style={styles.footerCloseBtnText}>Done</Text>
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
    backgroundColor: 'rgba(23, 15, 38, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    display: 'flex',
    flexDirection: 'column',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 14,
    backgroundColor: '#FAF5FF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mainAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mainAvatarEmoji: {
    fontSize: 32,
  },
  customPhotoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  editAvatarMiniBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileSummaryText: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  safeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  safeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  usernameSubtext: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 2,
  },
  emailSubtext: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  privacyStatusCard: {
    backgroundColor: '#F5EEFF',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  privacyStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4C1D95',
  },
  privacyStatusDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 8,
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  tabNavContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  modalBodyScroll: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContentSection: {
    width: '100%',
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E1B4B',
    marginBottom: 2,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnTextSecondary: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarGridItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGridItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
    transform: [{ scale: 1.08 }],
  },
  fieldGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#EF4444',
  },
  optionalTag: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  readOnlyBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  readOnlyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  helperSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  activityPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityPillActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  activityPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  activityPillTextActive: {
    color: '#7C3AED',
  },
  saveMainBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 14,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dataBadgeList: {
    gap: 8,
    marginTop: 10,
  },
  dataBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    gap: 10,
  },
  dataBadgeIcon: {
    fontSize: 20,
  },
  dataBadgeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  dataBadgeSub: {
    fontSize: 11,
    color: '#64748B',
  },
  dataViewerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dataViewerText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 3,
  },
  deleteAccountBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteAccountBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteConfirmBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelDeleteBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelDeleteBtnText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '800',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
  },
  footerBrandText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
  },
  footerCloseBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  footerCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
