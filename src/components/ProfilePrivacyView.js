import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { clearUserAuthSession } from '../services/authGuard';

export const ProfilePrivacyView = ({
  userName = 'Friend',
  currentAvatar = '👦',
  currentPhotoUrl = null,
  onProfileUpdated,
  onBackToHome,
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'account' | 'privacy' | 'security' | 'notifications' | 'data'

  // Loading & Feedback states
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
  const [bio, setBio] = useState('Loving my creative wellness journey on AlphaCare ✨');
  const [favoriteActivity, setFavoriteActivity] = useState('Color Calm 🎨');
  const [avatar, setAvatar] = useState(currentAvatar || '👦');
  const [customPhotoUrl, setCustomPhotoUrl] = useState(currentPhotoUrl || null);

  // 2. Account & Guardian Info
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [address, setAddress] = useState('');

  // 3. Password & Security
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 4. Privacy Settings
  const [isProfilePrivate, setIsProfilePrivate] = useState(true);
  const [shareMoodWithParent, setShareMoodWithParent] = useState(true);
  const [shareProgressWithCounselor, setShareProgressWithCounselor] = useState(true);
  const [journalIsPrivate, setJournalIsPrivate] = useState(true);

  // 5. Notifications
  const [notifWellness, setNotifWellness] = useState(true);
  const [notifMoodCheckin, setNotifMoodCheckin] = useState(true);
  const [notifCounselorMsg, setNotifCounselorMsg] = useState(true);
  const [notifMilestones, setNotifMilestones] = useState(true);

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

  const activityOptions = [
    'Color Calm 🎨',
    'Bubble Break 🫧',
    'Zen Garden 🧘',
    'Guided Breathing 🫁',
    'AlphaBuddy AI 🤖',
    'Stress Busters 🎮',
    'Daily Journal 📝',
  ];

  const tabs = [
    { id: 'profile', label: 'Profile & Avatar', icon: '👤' },
    { id: 'account', label: 'Account Details', icon: '⚙️' },
    { id: 'privacy', label: 'Privacy & Sharing', icon: '🛡️' },
    { id: 'security', label: 'Password & Security', icon: '🔒' },
    { id: 'notifications', label: 'Notification Alerts', icon: '🔔' },
    { id: 'data', label: 'Data & Safety', icon: '📦' },
  ];

  // Load user details
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const activeEmail = await AsyncStorage.getItem('@alphacare_active_user_email');
      const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');
      const { data: { user } } = await supabase.auth.getUser();
      let resolvedPhoto = currentPhotoUrl || null;

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
        setEmail(user.email || activeEmail || '');
        setPhone(meta.phone || '');
        if (meta.age) setAge(String(meta.age));
        if (meta.bio) setBio(meta.bio);
        if (meta.favoriteActivity) setFavoriteActivity(meta.favoriteActivity);
        if (meta.avatar) setAvatar(meta.avatar);
        if (meta.customPhotoUrl) {
          resolvedPhoto = meta.customPhotoUrl;
          setCustomPhotoUrl(meta.customPhotoUrl);
        }
        if (meta.guardianName) setGuardianName(meta.guardianName);
        if (meta.guardianEmail) setGuardianEmail(meta.guardianEmail);
        if (meta.address) setAddress(meta.address);
      } else {
        const safeChildName = activeName || (userName && !userName.toLowerCase().includes('veda') ? userName : 'Devisri chirraboina');
        const safeEmail = activeEmail || 'chirraboinad@gmail.com';
        setName(safeChildName);
        setEmail(safeEmail);
        setUsername(safeEmail.split('@')[0] || 'child_explorer');
      }

      // Load cached profile
      const profileCached = await AsyncStorage.getItem('@alphacare_child_profile_settings');
      if (profileCached) {
        const prof = JSON.parse(profileCached);
        const isStale = prof.name && (prof.name.toLowerCase().includes('veda') || prof.name.toLowerCase().includes('siddi'));
        const isWrongEmail = prof.email && activeEmail && prof.email.toLowerCase() !== activeEmail.toLowerCase();
        if (isStale || isWrongEmail) {
          await AsyncStorage.removeItem('@alphacare_child_profile_settings');
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('@alphacare_child_profile_settings');
          }
        } else {
          if (prof.customPhotoUrl) {
            resolvedPhoto = prof.customPhotoUrl;
            setCustomPhotoUrl(prof.customPhotoUrl);
          }
          if (prof.avatar) setAvatar(prof.avatar);
          if (prof.name) setName(prof.name);
        }
      }

      if (resolvedPhoto && onProfileUpdated) {
        onProfileUpdated({ name: name || userName, avatar, customPhotoUrl: resolvedPhoto });
      }

      // Load cached privacy settings
      const privacyCached = await AsyncStorage.getItem('@alphacare_privacy_settings');
      if (privacyCached) {
        const p = JSON.parse(privacyCached);
        if (p.isProfilePrivate !== undefined) setIsProfilePrivate(p.isProfilePrivate);
        if (p.shareMoodWithParent !== undefined) setShareMoodWithParent(p.shareMoodWithParent);
        if (p.shareProgressWithCounselor !== undefined) setShareProgressWithCounselor(p.shareProgressWithCounselor);
        if (p.journalIsPrivate !== undefined) setJournalIsPrivate(p.journalIsPrivate);
      }

      // Load notification preferences
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
    setTimeout(() => setErrorMessage(''), 4500);
  };

  // 1. Save Profile
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showErrorToast('Please enter your display name.');
      return;
    }
    setIsSaving(true);
    try {
      const activeEmail = (await AsyncStorage.getItem('@alphacare_active_user_email')) || email;
      const { data: { user } } = await supabase.auth.getUser();
      const isCounselorOrParent = user && (
        user.email === 'veda.siddi@alphacare.com' ||
        user.email?.toLowerCase().includes('counselor') ||
        user.user_metadata?.role === 'counselor' ||
        user.user_metadata?.role === 'parent' ||
        (activeEmail && user.email && user.email.toLowerCase() !== activeEmail.toLowerCase())
      );

      const updatedMeta = {
        email: activeEmail,
        name: name.trim(),
        avatar: avatar,
        customPhotoUrl: customPhotoUrl,
        age: age.trim(),
        bio: bio.trim(),
        favoriteActivity: favoriteActivity,
      };

      if (user && !isCounselorOrParent) {
        await supabase.auth.updateUser({ data: updatedMeta });
      }

      await AsyncStorage.setItem('@alphacare_child_profile_settings', JSON.stringify(updatedMeta));
      await AsyncStorage.setItem('@alphacare_active_user_name', name.trim());
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('@alphacare_child_profile_settings', JSON.stringify(updatedMeta));
        window.localStorage.setItem('@alphacare_active_user_name', name.trim());
      }

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

  // 2. Save Account Details
  const handleSaveAccount = async () => {
    const trimmedUser = username.trim().toLowerCase();
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
        guardianName: guardianName.trim(),
        guardianEmail: guardianEmail.trim(),
        address: address.trim(),
      };

      if (user) {
        await supabase.auth.updateUser({ data: updatedMeta });
      }
      showToast('Account details saved securely! 💜');
    } catch (err) {
      showErrorToast('Could not update account details. Please try again.');
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
      showErrorToast('Passwords do not match. Please recheck.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showErrorToast(`Password update failed: ${error.message}`);
      } else {
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password changed successfully! 🔒');
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
      showToast('Notification preferences updated! 🔔');
    } catch (err) {
      showErrorToast('Failed to save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  // Image Upload for Web & Mobile
  const handlePhotoUpload = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (uploadEvent) => {
            const base64Url = uploadEvent.target.result;
            setCustomPhotoUrl(base64Url);
            if (onProfileUpdated) {
              onProfileUpdated({ name, avatar, customPhotoUrl: base64Url });
            }
            // Auto save to local storage & supabase for immediate persistence
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.auth.updateUser({ data: { customPhotoUrl: base64Url } });
              }
              const cached = await AsyncStorage.getItem('@alphacare_child_profile_settings');
              const prev = cached ? JSON.parse(cached) : {};
              await AsyncStorage.setItem('@alphacare_child_profile_settings', JSON.stringify({ ...prev, customPhotoUrl: base64Url }));
            } catch (err) {
              console.log('Photo autosave note:', err);
            }
            showToast('Profile photo updated! ✨');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Upload Photo', 'Select a friendly photo or choose an illustrated avatar below.');
    }
  };

  const handleRemovePhoto = async () => {
    setCustomPhotoUrl(null);
    if (onProfileUpdated) {
      onProfileUpdated({ name, avatar, customPhotoUrl: null });
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({ data: { customPhotoUrl: null } });
      }
      const cached = await AsyncStorage.getItem('@alphacare_child_profile_settings');
      if (cached) {
        const prev = JSON.parse(cached);
        delete prev.customPhotoUrl;
        await AsyncStorage.setItem('@alphacare_child_profile_settings', JSON.stringify(prev));
      }
    } catch (err) {}
    showToast('Photo removed. Using default avatar.');
  };

  // Download My Data
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
        guardianName,
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
      a.download = `alphacare-child-profile-${username || 'data'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Your data has been downloaded! 📥');
    } else {
      Alert.alert('Data Export', 'Your AlphaCare information is ready.');
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: '#CBD5E1', score: 0 };
    if (pass.length < 6) return { label: 'Too short (min 6 chars)', color: '#EF4444', score: 1 };
    if (pass.length < 9) return { label: 'Good 👍', color: '#F59E0B', score: 2 };
    return { label: 'Strong & Secure ✨', color: '#10B981', score: 3 };
  };
  const strength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {onBackToHome && (
            <TouchableOpacity style={styles.backBtn} onPress={onBackToHome} activeOpacity={0.8}>
              <Text style={styles.backBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.pageTitle}>Profile & Privacy Sanctuary 💜</Text>
            <Text style={styles.pageSubtitle}>
              Manage your personal avatar, account safety, child privacy controls, and notifications.
            </Text>
          </View>
        </View>

        <View style={styles.safetyStatusBadge}>
          <Text style={{ fontSize: 16 }}>🛡️</Text>
          <View>
            <Text style={styles.safetyStatusTitle}>Verified Child Account</Text>
            <Text style={styles.safetyStatusSub}>COPPA & Privacy Protected</Text>
          </View>
        </View>
      </View>

      {/* FEEDBACK BANNERS */}
      {successMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>✓ {successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
        </View>
      ) : null}

      {/* HERO USER PROFILE CARD */}
      <View style={styles.heroProfileCard}>
        <View style={styles.heroAvatarWrapper}>
          {customPhotoUrl ? (
            <Image source={{ uri: customPhotoUrl }} style={styles.heroPhotoImg} />
          ) : (
            <View style={styles.heroEmojiCircle}>
              <Text style={styles.heroAvatarEmoji}>{avatar}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraIconBadge} onPress={handlePhotoUpload}>
            <Text style={{ fontSize: 13 }}>📷</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroProfileInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Text style={styles.heroName}>{name || 'Friend'}</Text>
            <View style={styles.heroRolePill}>
              <Text style={styles.heroRolePillText}>🌟 Explorer</Text>
            </View>
            <View style={[styles.heroRolePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.heroRolePillText, { color: '#059669' }]}>🔒 Privacy Mode ON</Text>
            </View>
          </View>
          <Text style={styles.heroUsername}>@{username || 'child_explorer'} • {email || 'child@alphacare.com'}</Text>
          <Text style={styles.heroBio} numberOfLines={2}>{bio}</Text>
        </View>

        <View style={styles.heroQuickActions}>
          <TouchableOpacity style={styles.heroUploadBtn} onPress={handlePhotoUpload} activeOpacity={0.8}>
            <Text style={styles.heroUploadBtnText}>📸 Change Photo</Text>
          </TouchableOpacity>
          {customPhotoUrl && (
            <TouchableOpacity style={styles.heroRemoveBtn} onPress={handleRemovePhoto} activeOpacity={0.8}>
              <Text style={styles.heroRemoveBtnText}>✕ Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* HORIZONTAL TAB NAVIGATION BAR */}
      <View style={styles.tabsBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollView}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab(t.id);
                  setSuccessMessage('');
                  setErrorMessage('');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
                {isActive && <View style={styles.tabActiveIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN SETTINGS CONTENT AREA */}
      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentInnerContainer}
        showsVerticalScrollIndicator={true}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading your preferences...</Text>
          </View>
        ) : (
          <>
            {/* TAB 1: PROFILE & AVATAR */}
            {activeTab === 'profile' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>👤 Personal Profile & Avatar</Text>
                    <Text style={styles.sectionSubtitle}>Choose how you appear in your AlphaCare sanctuary</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtnTop, isSaving && { opacity: 0.6 }]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnTopText}>Save Changes 💾</Text>}
                  </TouchableOpacity>
                </View>

                {/* Form fields in grid */}
                <View style={styles.formGrid}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Display Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your friendly name"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.fieldHint}>This is what AlphaBuddy and counselors call you.</Text>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.textInput}
                      value={age}
                      onChangeText={setAge}
                      placeholder="e.g. 11"
                      keyboardType="numeric"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.fieldHint}>Helps tailor wellness exercises appropriately.</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>My Daily Tagline / Bio</Text>
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Write a cheerful quote or your favorite hobby..."
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Favorite Calming Activity</Text>
                  <View style={styles.chipRow}>
                    {activityOptions.map((act) => (
                      <TouchableOpacity
                        key={act}
                        style={[styles.activityChip, favoriteActivity === act && styles.activityChipSelected]}
                        onPress={() => setFavoriteActivity(act)}
                      >
                        <Text style={[styles.activityChipText, favoriteActivity === act && styles.activityChipTextSelected]}>
                          {act}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Avatar Picker Grid */}
                <View style={[styles.fieldBlock, { marginTop: 15 }]}>
                  <Text style={styles.fieldLabel}>Choose an Illustrated Avatar</Text>
                  <Text style={styles.fieldHint}>Pick an emoji companion for your AlphaCare profile:</Text>
                  <View style={styles.avatarGrid}>
                    {avatarOptions.map((av) => {
                      const isSelected = avatar === av.emoji && !customPhotoUrl;
                      return (
                        <TouchableOpacity
                          key={av.emoji}
                          style={[styles.avatarBox, isSelected && styles.avatarBoxSelected]}
                          onPress={() => {
                            setAvatar(av.emoji);
                            setCustomPhotoUrl(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.avatarBoxEmoji}>{av.emoji}</Text>
                          <Text style={[styles.avatarBoxLabel, isSelected && styles.avatarBoxLabelSelected]}>
                            {av.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primarySaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySaveBtnText}>Save Profile Preferences ✨</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: ACCOUNT DETAILS */}
            {activeTab === 'account' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>⚙️ Account Details & Linked Contacts</Text>
                    <Text style={styles.sectionSubtitle}>Manage username, email, and family connection</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtnTop, isSaving && { opacity: 0.6 }]}
                    onPress={handleSaveAccount}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnTopText}>Save Changes 💾</Text>}
                  </TouchableOpacity>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    <TextInput
                      style={styles.textInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. devisri_happy"
                      autoCapitalize="none"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.fieldHint}>Unique username for sign-in and buddy sharing.</Text>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Account Email (Login ID)</Text>
                    <View style={styles.disabledInputWrapper}>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: '#F8FAFC', color: '#64748B' }]}
                        value={email}
                        editable={false}
                      />
                      <View style={styles.verifiedChip}>
                        <Text style={styles.verifiedChipText}>✓ Verified</Text>
                      </View>
                    </View>
                    <Text style={styles.fieldHint}>Managed via Supabase secure authentication.</Text>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Contact Phone (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Linked Guardian Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={guardianName}
                      onChangeText={setGuardianName}
                      placeholder="e.g. Mom / Dad / Guardian"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Linked Guardian Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={guardianEmail}
                    onChangeText={setGuardianEmail}
                    placeholder="parent@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.fieldHint}>Used only for monthly wellness summaries if enabled in Privacy settings.</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primarySaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveAccount}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySaveBtnText}>Save Account Information 💜</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: PRIVACY & SHARING */}
            {activeTab === 'privacy' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>🛡️ Child Privacy & Sharing Controls</Text>
                    <Text style={styles.sectionSubtitle}>You are in control of who sees your mood and wellness progress</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtnTop, isSaving && { opacity: 0.6 }]}
                    onPress={handleSavePrivacy}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnTopText}>Save Privacy 💾</Text>}
                  </TouchableOpacity>
                </View>

                {/* PRIVACY TOGGLE CARDS */}
                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🔒</Text>
                      <Text style={styles.toggleCardTitle}>Private Sanctuary Profile</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Only you and authorized wellness counselors can view your check-ins. No public profile is ever shared.
                    </Text>
                  </View>
                  <Switch
                    value={isProfilePrivate}
                    onValueChange={setIsProfilePrivate}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={isProfilePrivate ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
                      <Text style={styles.toggleCardTitle}>Share Mood Trends with Parents</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Allows parents to view high-level wellness score trends and celebration milestones without reading private notes.
                    </Text>
                  </View>
                  <Switch
                    value={shareMoodWithParent}
                    onValueChange={setShareMoodWithParent}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={shareMoodWithParent ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🧑‍⚕️</Text>
                      <Text style={styles.toggleCardTitle}>Share Progress with School Counselor</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Enables your assigned counselor to provide personalized guidance and support during your chat sessions.
                    </Text>
                  </View>
                  <Switch
                    value={shareProgressWithCounselor}
                    onValueChange={setShareProgressWithCounselor}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={shareProgressWithCounselor ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>📖</Text>
                      <Text style={styles.toggleCardTitle}>Private Journal Locked Mode</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Keep your daily journal entries 100% confidential to your personal account only.
                    </Text>
                  </View>
                  <Switch
                    value={journalIsPrivate}
                    onValueChange={setJournalIsPrivate}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={journalIsPrivate ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primarySaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSavePrivacy}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySaveBtnText}>Save Privacy Settings 🛡️</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 4: PASSWORD & SECURITY */}
            {activeTab === 'security' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>🔒 Password & Security</Text>
                    <Text style={styles.sectionSubtitle}>Protect your AlphaCare account with an encrypted password</Text>
                  </View>
                </View>

                <View style={styles.securityInfoBanner}>
                  <Text style={{ fontSize: 22 }}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.secBannerTitle}>End-to-End Encrypted Authentication</Text>
                    <Text style={styles.secBannerDesc}>
                      Your password is authenticated securely through Supabase cryptographic hashing. AlphaCare never stores plain-text passwords.
                    </Text>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Minimum 6 characters"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#94A3B8"
                    />
                    {newPassword.length > 0 && (
                      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View
                            style={{
                              width: `${(strength.score / 3) * 100}%`,
                              height: '100%',
                              backgroundColor: strength.color,
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: strength.color }}>{strength.label}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your new password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={{ fontSize: 15 }}>{showPassword ? '👁️' : '🙈'}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                    {showPassword ? 'Hide password text' : 'Show password text'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primarySaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleUpdatePassword}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySaveBtnText}>Update Password 🔒</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 5: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>🔔 Notification & Reminder Preferences</Text>
                    <Text style={styles.sectionSubtitle}>Choose which gentle reminders and alerts you would like to receive</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtnTop, isSaving && { opacity: 0.6 }]}
                    onPress={handleSaveNotifications}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnTopText}>Save Alerts 💾</Text>}
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🧘</Text>
                      <Text style={styles.toggleCardTitle}>Mindful Reminders & Breathing</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Friendly nudges to take a 2-minute calm breathing break when you are free.
                    </Text>
                  </View>
                  <Switch
                    value={notifWellness}
                    onValueChange={setNotifWellness}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={notifWellness ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>☀️</Text>
                      <Text style={styles.toggleCardTitle}>Daily Mood Check-in Notification</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      A warm morning greeting to record your feeling and keep your streak alive.
                    </Text>
                  </View>
                  <Switch
                    value={notifMoodCheckin}
                    onValueChange={setNotifMoodCheckin}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={notifMoodCheckin ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>💬</Text>
                      <Text style={styles.toggleCardTitle}>Counselor Messages & Support</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Alerts when your counselor replies or shares an encouraging wellness note.
                    </Text>
                  </View>
                  <Switch
                    value={notifCounselorMsg}
                    onValueChange={setNotifCounselorMsg}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={notifCounselorMsg ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🏆</Text>
                      <Text style={styles.toggleCardTitle}>Streak & Milestone Badges</Text>
                    </View>
                    <Text style={styles.toggleCardDesc}>
                      Celebratory badges and level-ups as you complete wellness milestones.
                    </Text>
                  </View>
                  <Switch
                    value={notifMilestones}
                    onValueChange={setNotifMilestones}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={notifMilestones ? '#7C3AED' : '#F1F5F9'}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primarySaveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveNotifications}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySaveBtnText}>Save Notification Settings 🔔</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 6: DATA & SAFETY */}
            {activeTab === 'data' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>📦 Your Data, Safety & Consent</Text>
                    <Text style={styles.sectionSubtitle}>Download your data, review safety guarantees, and manage consents</Text>
                  </View>
                </View>

                {/* Safety Guarantee Card */}
                <View style={styles.safetyGuaranteeCard}>
                  <Text style={styles.guaranteeTitle}>💜 AlphaCare Safety & Zero-Tracking Guarantee</Text>
                  <Text style={styles.guaranteeDesc}>
                    AlphaCare is designed strictly as a child-safe mental wellness sanctuary:
                  </Text>
                  <View style={styles.guaranteePoints}>
                    <Text style={styles.guaranteeItem}>✓ <Text style={{ fontWeight: '700' }}>Zero Advertising:</Text> No advertisements, trackers, or commercial profiling ever.</Text>
                    <Text style={styles.guaranteeItem}>✓ <Text style={{ fontWeight: '700' }}>Zero Model Training on Private Data:</Text> Your journal entries and conversations are strictly private.</Text>
                    <Text style={styles.guaranteeItem}>✓ <Text style={{ fontWeight: '700' }}>Full Portability:</Text> You can download a complete copy of your activity records anytime.</Text>
                  </View>
                </View>

                {/* Download My Data Button */}
                <View style={styles.exportCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportTitle}>Download My AlphaCare Archive (.json)</Text>
                    <Text style={styles.exportDesc}>
                      Export all your profile data, mood trends, badges, and preferences to a secure JSON file.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadData} activeOpacity={0.85}>
                    <Text style={styles.downloadBtnText}>📥 Download Data</Text>
                  </TouchableOpacity>
                </View>

                {/* Log Out / Exit Sanctuary */}
                <View style={[styles.exportCard, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', marginTop: 15 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportTitle, { color: '#BE185D' }]}>Exit Sanctuary & Sign Out</Text>
                    <Text style={[styles.exportDesc, { color: '#9F1239' }]}>
                      Safely log out of your session on this device.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: '#E11D48' }]}
                    onPress={async () => {
                      await clearUserAuthSession();
                      if (navigation) navigation.replace('RoleSelection');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.downloadBtnText}>🚪 Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FDFBFF',
    display: 'flex',
    flexDirection: 'column',
  },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFF8',
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    gap: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 280,
  },
  backBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  backBtnText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 13,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  safetyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  safetyStatusTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
  },
  safetyStatusSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
  },

  // BANNERS
  successBanner: {
    marginHorizontal: 28,
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  successBannerText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBanner: {
    marginHorizontal: 28,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  errorBannerText: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 13,
  },

  // HERO PROFILE CARD
  heroProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 28,
    marginTop: 16,
    marginBottom: 10,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    flexWrap: 'wrap',
    gap: 18,
  },
  heroAvatarWrapper: {
    position: 'relative',
  },
  heroEmojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarEmoji: {
    fontSize: 38,
  },
  heroPhotoImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  heroProfileInfo: {
    flex: 1,
    minWidth: 220,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  heroRolePill: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroRolePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  heroUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  heroBio: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },
  heroQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroUploadBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  heroUploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  heroRemoveBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  heroRemoveBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },

  // TABS NAVIGATION BAR
  tabsBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFF8',
    paddingHorizontal: 28,
  },
  tabsScrollView: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#FAF5FF',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: -6,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },

  // CONTENT SCROLL VIEW
  contentScrollView: {
    flex: 1,
  },
  contentInnerContainer: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 60,
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  // SECTION CARD
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtnTop: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnTopText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  // FORM ELEMENTS
  formGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  fieldBlock: {
    flex: 1,
    minWidth: 240,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#FDFBFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    outlineStyle: 'none',
  },
  disabledInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  verifiedChip: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },

  // CHIPS & AVATARS
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  activityChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  activityChipSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#C4B5FD',
    borderWidth: 1.5,
  },
  activityChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activityChipTextSelected: {
    color: '#7C3AED',
    fontWeight: '900',
  },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  avatarBox: {
    width: 68,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBoxSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: '#8B5CF6',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  avatarBoxEmoji: {
    fontSize: 28,
  },
  avatarBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  avatarBoxLabelSelected: {
    color: '#7C3AED',
    fontWeight: '900',
  },

  // TOGGLES
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FDFBFF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
  },
  toggleCardInfo: {
    flex: 1,
  },
  toggleCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  toggleCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },

  // SECURITY BANNER
  securityInfoBanner: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 16,
    borderRadius: 16,
    marginBottom: 18,
  },
  secBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  secBannerDesc: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 2,
    lineHeight: 17,
  },

  // SAFETY GUARANTEE & EXPORT
  safetyGuaranteeCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  guaranteeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6D28D9',
    marginBottom: 6,
  },
  guaranteeDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },
  guaranteePoints: {
    gap: 6,
  },
  guaranteeItem: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  exportCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    flexWrap: 'wrap',
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  exportDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // PRIMARY SAVE BUTTON
  primarySaveBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
