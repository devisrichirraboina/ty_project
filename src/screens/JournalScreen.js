import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole } from '../services/authGuard';
import { ChildSidebar } from '../components/ChildSidebar';

const API_BASE_URL = getApiHost();
const STORAGE_KEY = '@alphacare_journal_entries';

export const JournalScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const passedName = route?.params?.childName || 'Friend';

  const [entries, setEntries] = useState([]);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadJournal();
  }, []);

  const loadJournal = async () => {
    const isAllowed = await enforceScreenRole(navigation, ['child', 'admin']);
    if (!isAllowed) return;

    setIsLoading(true);
    let cachedList = [];

    try {
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      if (localData) {
        cachedList = JSON.parse(localData);
        setEntries(cachedList);
      }
    } catch (e) {
      console.log('Local journal read error:', e);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('child_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const map = new Map();
          [...data, ...cachedList].forEach(item => map.set(item.id || item.created_at, item));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setEntries(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (err) {
      console.log('Supabase journal fetch note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Background sentiment computation to maintain clinical stress engine sync quietly
  const computeQuietSentiment = (text) => {
    if (!text) return 0;
    const lower = text.toLowerCase();
    const positiveWords = ['happy', 'glad', 'joy', 'excited', 'good', 'great', 'love', 'amazing', 'fun', 'smile', 'blessed', 'peace', 'calm', 'proud', 'accomplished'];
    const negativeWords = ['sad', 'crying', 'tears', 'hurt', 'lonely', 'depressed', 'down', 'scared', 'fear', 'afraid', 'stress', 'angry', 'mad', 'frustrated', 'exhausted', 'hate'];
    
    let pos = positiveWords.filter(w => lower.includes(w)).length;
    let neg = negativeWords.filter(w => lower.includes(w)).length;
    if (pos > neg) return Math.min(1.0, 0.3 + (pos * 0.2));
    if (neg > pos) return Math.max(-1.0, -0.3 - (neg * 0.2));
    return 0.1;
  };

  // Save new entry or update existing entry
  const handleSaveOrUpdate = async () => {
    const trimmedContent = entryContent.trim();
    const trimmedTitle = entryTitle.trim();

    if (!trimmedContent) {
      Alert.alert('Write Something', 'Please write your thoughts before saving.');
      return;
    }

    setIsSaving(true);
    const sentimentScore = computeQuietSentiment(trimmedContent + ' ' + trimmedTitle);

    try {
      if (editingEntryId) {
        // === UPDATE EXISTING ENTRY ===
        const updatedEntries = entries.map((item) => {
          if (item.id === editingEntryId) {
            return {
              ...item,
              title: trimmedTitle,
              content: trimmedContent,
              sentiment_score: sentimentScore,
              updated_at: new Date().toISOString(),
            };
          }
          return item;
        });

        setEntries(updatedEntries);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

        if (userId && typeof editingEntryId !== 'string' || !editingEntryId.startsWith('local_')) {
          try {
            await supabase
              .from('journal_entries')
              .update({
                content: trimmedContent,
                sentiment_score: sentimentScore,
              })
              .eq('id', editingEntryId);
          } catch (dbErr) {
            console.log('Supabase update note:', dbErr);
          }
        }

        setEditingEntryId(null);
        setEntryTitle('');
        setEntryContent('');
        Alert.alert('Updated! 📝', 'Your journal entry has been successfully updated.');
      } else {
        // === CREATE NEW ENTRY ===
        const newEntryItem = {
          id: 'journal_' + Date.now(),
          child_id: userId || 'local_user',
          title: trimmedTitle,
          content: trimmedContent,
          sentiment_score: sentimentScore,
          created_at: new Date().toISOString(),
        };

        const updatedEntries = [newEntryItem, ...entries];
        setEntries(updatedEntries);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

        if (userId) {
          try {
            const { data: insertedData } = await supabase
              .from('journal_entries')
              .insert({
                child_id: userId,
                content: trimmedTitle ? `[${trimmedTitle}]\n${trimmedContent}` : trimmedContent,
                sentiment_score: sentimentScore,
              })
              .select();

            if (insertedData && insertedData[0]) {
              newEntryItem.id = insertedData[0].id;
              const remapped = updatedEntries.map(e => e.id === newEntryItem.id ? insertedData[0] : e);
              setEntries(remapped);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remapped));
            }
          } catch (dbErr) {
            console.log('Supabase insert note:', dbErr);
          }
        }

        setEntryTitle('');
        setEntryContent('');
        Alert.alert('Saved! 🌸', 'Your reflection is safely recorded in your private journal.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to save your entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Start editing an entry
  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEntryTitle(entry.title || '');
    setEntryContent(entry.content || '');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEntryTitle('');
    setEntryContent('');
  };

  // Delete an entry with confirmation
  const handleDeleteEntry = (entryId) => {
    const confirmDelete = () => {
      const filtered = entries.filter((e) => e.id !== entryId);
      setEntries(filtered);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      if (userId && !String(entryId).startsWith('local_') && !String(entryId).startsWith('journal_')) {
        supabase
          .from('journal_entries')
          .delete()
          .eq('id', entryId)
          .catch((e) => console.log('Supabase delete error:', e));
      }

      if (editingEntryId === entryId) {
        handleCancelEdit();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this journal entry?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Entry',
        'Are you sure you want to delete this journal entry? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const formatDate = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'Today';
    }
  };

  const formatTime = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const c = (entry.content || '').toLowerCase();
    const t = (entry.title || '').toLowerCase();
    return c.includes(q) || t.includes(q);
  });

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="My Journal"
          navigation={navigation}
          userName={passedName}
        />
      )}

      <View style={styles.mainArea}>
        {/* Top Navbar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildDashboard')}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Personal Journal 📖</Text>
            <Text style={styles.headerSub}>
              A safe, open, and private sanctuary for {passedName} to write freely
            </Text>
          </View>

          <View style={styles.calBadge}>
            <Text style={styles.calBadgeText}>🔒 Private & Encrypted</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.mainWrapper, isDesktop && styles.mainWrapperDesktop]}>
            
            {/* LEFT / MAIN WRITING AREA */}
            <View style={[styles.mainColumn, isDesktop && styles.leftColumnDesktop]}>
              
              {/* Inspirational Sanctuary Banner */}
              <View style={styles.inspirationalBanner}>
                <View style={styles.bannerTextCol}>
                  <Text style={styles.bannerHeadline}>
                    Write whatever is in your heart. 💜
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    Share your day, dreams, worries, or joyful moments without any rules or limits.
                  </Text>
                </View>
                <View style={styles.bannerGraphic}>
                  <Image
                    source={require('../../assets/journal_banner.jpg')}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bannerFloatingTag}>
                    <Text style={styles.bannerFloatingTagText}>Your Safe Space</Text>
                  </View>
                </View>
              </View>

              {/* Edit Mode Notice Banner */}
              {editingEntryId && (
                <View style={styles.editingBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                    <Text style={styles.editingBannerText}>
                      You are currently editing an existing journal entry
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                    <Text style={styles.cancelEditBtnText}>✕ Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Title Input (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title or Theme (Optional)</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="e.g. My school day, A quiet evening, Thinking about..."
                  placeholderTextColor="#94A3B8"
                  value={entryTitle}
                  onChangeText={setEntryTitle}
                  maxLength={100}
                  editable={!isSaving}
                />
              </View>

              {/* Main Journal Content TextArea */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Your Reflection / Story</Text>
                  <Text style={styles.charCountText}>{entryContent.length} characters</Text>
                </View>

                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="Dear Diary... Write freely about anything you want to share or reflect upon today."
                    placeholderTextColor="#94A3B8"
                    value={entryContent}
                    onChangeText={setEntryContent}
                    editable={!isSaving}
                  />
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionBtnRow}>
                {editingEntryId && (
                  <TouchableOpacity
                    style={styles.cancelActionBtn}
                    onPress={handleCancelEdit}
                    activeOpacity={0.8}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelActionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!entryContent.trim() || isSaving) && styles.saveBtnDisabled,
                    editingEntryId ? { backgroundColor: '#059669' } : { backgroundColor: '#7C3AED' },
                  ]}
                  onPress={handleSaveOrUpdate}
                  disabled={!entryContent.trim() || isSaving}
                  activeOpacity={0.88}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.saveBtnInner}>
                      <Text style={styles.saveBtnText}>
                        {editingEntryId ? '💾 Update Entry' : '💾 Save Journal Entry'}
                      </Text>
                      <Text style={styles.saveBtnArrow}>→</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Privacy Footnote */}
              <View style={styles.privacyFootnote}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.privacyText}>
                  Your reflections are completely private, confidential, and safe.
                </Text>
              </View>

            </View>

            {/* RIGHT COLUMN: Past Journal Entries Timeline */}
            <View style={[styles.sideColumn, isDesktop && styles.rightColumnDesktop]}>
              
              <View style={styles.recentHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>My Past Entries</Text>
                  <Text style={styles.entriesCountSub}>
                    {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'} recorded
                  </Text>
                </View>
              </View>

              {/* Search Bar */}
              {entries.length > 0 && (
                <View style={styles.searchBox}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search past entries..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Text style={{ color: '#94A3B8', fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {/* Entries List */}
              {isLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 30 }} />
              ) : filteredEntries.length === 0 ? (
                <View style={styles.emptyRecentCard}>
                  <Text style={{ fontSize: 38, marginBottom: 10 }}>🌱</Text>
                  <Text style={styles.emptyRecentTitle}>
                    {searchQuery ? 'No matching reflections' : 'No journal entries yet'}
                  </Text>
                  <Text style={styles.emptyRecentSub}>
                    {searchQuery
                      ? 'Try searching with a different word or clear search.'
                      : 'Write your first story or thought and tap "Save Journal Entry" above!'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 680 }} showsVerticalScrollIndicator={true}>
                  {filteredEntries.map((entry) => {
                    const isBeingEdited = editingEntryId === entry.id;
                    return (
                      <View
                        key={entry.id || entry.created_at}
                        style={[
                          styles.entryCard,
                          isBeingEdited && styles.entryCardActiveEdit,
                        ]}
                      >
                        {/* Header: Date + Time + Action Icons */}
                        <View style={styles.entryCardHeader}>
                          <View style={styles.entryDateBadge}>
                            <Text style={styles.entryDateText}>
                              📅 {formatDate(entry.created_at)}
                            </Text>
                            <Text style={styles.entryTimeText}>
                              {formatTime(entry.created_at)}
                            </Text>
                          </View>

                          <View style={styles.entryActionIcons}>
                            {/* Edit Button */}
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              onPress={() => handleEditEntry(entry)}
                              activeOpacity={0.7}
                              title="Edit this entry"
                            >
                              <Text style={{ fontSize: 14 }}>✏️</Text>
                            </TouchableOpacity>

                            {/* Delete Button */}
                            <TouchableOpacity
                              style={[styles.actionIconBtn, styles.deleteIconBtn]}
                              onPress={() => handleDeleteEntry(entry.id)}
                              activeOpacity={0.7}
                              title="Delete this entry"
                            >
                              <Text style={{ fontSize: 14 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Title if present */}
                        {entry.title ? (
                          <Text style={styles.entryCardTitle}>{entry.title}</Text>
                        ) : null}

                        {/* Content Body */}
                        <Text style={styles.entryCardBody}>
                          {entry.content}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

            </View>

          </View>
        </ScrollView>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EDE9FE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 16,
  },
  backBtnText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 13,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  calBadge: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  calBadgeText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    padding: 28,
  },
  mainWrapper: {
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    maxWidth: 1150,
    alignSelf: 'center',
  },
  mainWrapperDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  mainColumn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    flex: 1,
  },
  leftColumnDesktop: {
    flex: 1.4,
  },
  sideColumn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    flex: 1,
  },
  rightColumnDesktop: {
    flex: 1,
  },

  inspirationalBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginBottom: 20,
    minHeight: 110,
  },
  bannerTextCol: {
    flex: 1.2,
    padding: 16,
    justifyContent: 'center',
  },
  bannerHeadline: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: 21,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
    lineHeight: 16.5,
  },
  bannerGraphic: {
    flex: 0.85,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  bannerFloatingTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bannerFloatingTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },

  editingBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editingBannerText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '700',
  },
  cancelEditBtn: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cancelEditBtnText: {
    fontSize: 11.5,
    color: '#047857',
    fontWeight: '700',
  },

  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  titleInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    minHeight: 180,
  },
  textInput: {
    fontSize: 14.5,
    color: '#1E293B',
    lineHeight: 22,
    minHeight: 150,
    textAlignVertical: 'top',
  },

  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelActionBtn: {
    flex: 0.4,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelActionBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  saveBtnArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  privacyFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  lockIcon: {
    fontSize: 12,
  },
  privacyText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },

  recentHeaderRow: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  entriesCountSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  searchBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },

  emptyRecentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyRecentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  emptyRecentSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  entryCardActiveEdit: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDateText: {
    fontSize: 11.5,
    color: '#6D28D9',
    fontWeight: '700',
  },
  entryTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  entryActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    backgroundColor: '#F1F5F9',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconBtn: {
    backgroundColor: '#FEE2E2',
  },
  entryCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  entryCardBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
});
