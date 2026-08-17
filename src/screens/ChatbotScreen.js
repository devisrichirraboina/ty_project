import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

const KIDCARE_QUESTIONS = [
  // Academic Stress
  { id: 1, category: 'Academic Stress', text: 'How have you been feeling about your schoolwork lately?' },
  { id: 2, category: 'Academic Stress', text: 'Do you often worry about your exams or your grades?' },
  { id: 3, category: 'Academic Stress', text: 'Is it hard for you to concentrate when you are studying?' },
  { id: 4, category: 'Academic Stress', text: 'Do you ever feel pressured to do really well in school?' },
  { id: 5, category: 'Academic Stress', text: 'Do homework or assignments sometimes make you feel overwhelmed?' },
  { id: 6, category: 'Academic Stress', text: 'Do you feel nervous before a test or presentation?' },
  { id: 7, category: 'Academic Stress', text: 'Have you ever avoided studying because it made you feel stressed?' },
  // Emotional Well-being
  { id: 8, category: 'Emotional Well-being', text: 'Do you sometimes feel sad without knowing why?' },
  { id: 9, category: 'Emotional Well-being', text: 'Have you been feeling nervous or anxious lately?' },
  { id: 10, category: 'Emotional Well-being', text: 'Do little things make you feel angry or irritated easily?' },
  { id: 11, category: 'Emotional Well-being', text: 'Do you ever feel lonely, even when other people are around?' },
  { id: 12, category: 'Emotional Well-being', text: 'Have you been feeling emotionally tired or drained?' },
  { id: 13, category: 'Emotional Well-being', text: 'Do you find yourself thinking too much about small problems?' },
  { id: 14, category: 'Emotional Well-being', text: 'Do you feel confident that you can handle your emotions?' },
  // Sleep & Physical Health
  { id: 15, category: 'Sleep & Physical Health', text: 'Do you have trouble falling asleep at night?' },
  { id: 16, category: 'Sleep & Physical Health', text: 'Do you wake up feeling tired most mornings?' },
  { id: 17, category: 'Sleep & Physical Health', text: 'Does stress make it difficult for you to sleep well?' },
  { id: 18, category: 'Sleep & Physical Health', text: 'When you are stressed, do you get headaches or stomach aches?' },
  { id: 19, category: 'Sleep & Physical Health', text: 'Do you usually feel energetic during the day?' },
  // Family & Friends
  { id: 20, category: 'Family & Friends', text: 'Can you easily talk to your parents or guardians when something is bothering you?' },
  { id: 21, category: 'Family & Friends', text: 'Do you feel supported by your family?' },
  { id: 22, category: 'Family & Friends', text: 'Do you enjoy spending time with your friends?' },
  { id: 23, category: 'Family & Friends', text: 'Have you ever felt left out by your classmates or friends?' },
  { id: 24, category: 'Family & Friends', text: 'Do you feel safe and comfortable at home?' },
  { id: 25, category: 'Family & Friends', text: 'Is there someone you trust when you need help?' },
  // School Environment
  { id: 26, category: 'School Environment', text: 'Do you feel comfortable and happy when you are at school?' },
  { id: 27, category: 'School Environment', text: 'Do you feel accepted by your classmates?' },
  { id: 28, category: 'School Environment', text: 'Do you ever worry about what other people think of you?' },
  { id: 29, category: 'School Environment', text: 'Has anyone at school ever bullied you, teased you, or made you feel bad?' },
  { id: 30, category: 'School Environment', text: 'If you are having a problem, do your teachers try to help and support you?' },
  // Coping Strategies
  { id: 31, category: 'Coping Strategies', text: 'When you are feeling stressed, do you spend a lot of time on your phone or social media?' },
  { id: 32, category: 'Coping Strategies', text: 'Do you like playing games to help you forget your worries?' },
  { id: 33, category: 'Coping Strategies', text: 'Do you listen to music when you want to relax?' },
  { id: 34, category: 'Coping Strategies', text: 'Do you play sports or exercise to help yourself feel better?' },
  { id: 35, category: 'Coping Strategies', text: 'Have you ever tried taking deep breaths or doing simple relaxation exercises when you are stressed?' },
  { id: 36, category: 'Coping Strategies', text: 'When you are upset, do you talk to someone you trust?' },
  { id: 37, category: 'Coping Strategies', text: 'Do you usually keep your feelings to yourself instead of telling someone?' },
  // Life Events
  { id: 38, category: 'Life Events', text: 'Has something really stressful happened to you in the last few months?' },
  { id: 39, category: 'Life Events', text: 'Has stress changed your daily routine or the things you usually do?' },
  { id: 40, category: 'Life Events', text: 'After something upsetting happens, do you find it hard to get back to your normal routine?' },
  { id: 41, category: 'Life Events', text: 'Do you avoid doing important things because you are feeling stressed?' },
  // Self-Esteem & Resilience
  { id: 42, category: 'Self-Esteem & Resilience', text: 'Do you believe you can solve difficult problems?' },
  { id: 43, category: 'Self-Esteem & Resilience', text: 'Are you proud of yourself and the things you do?' },
  { id: 44, category: 'Self-Esteem & Resilience', text: 'When something does not go your way, do you recover and move on quickly?' },
  { id: 45, category: 'Self-Esteem & Resilience', text: 'Do you feel hopeful and excited about your future?' },
  { id: 46, category: 'Self-Esteem & Resilience', text: 'Do you believe you can achieve your dreams and goals?' },
  { id: 47, category: 'Self-Esteem & Resilience', text: 'When things become difficult, do you ever feel like giving up?' },
  // Help-Seeking
  { id: 48, category: 'Help-Seeking', text: 'If you feel stressed or worried, do you know where you can get help?' },
  { id: 49, category: 'Help-Seeking', text: 'If you needed help, would you feel comfortable talking to a counselor or another trusted adult?' },
  { id: 50, category: 'Help-Seeking', text: 'Do you feel comfortable asking adults for support when you need it?' },
  { id: 51, category: 'Help-Seeking', text: 'Do you think taking care of your mental health is important?' },
  // AI Project Questions
  { id: 52, category: 'AI Project Questions', text: 'Would you like an app that lets you track your mood every day?' },
  { id: 53, category: 'AI Project Questions', text: 'Would you try simple breathing exercises if an app suggested them?' },
  { id: 54, category: 'AI Project Questions', text: 'Would you like gentle reminders to help you take care of your mental well-being?' },
  { id: 55, category: 'AI Project Questions', text: 'Would you feel comfortable answering questions about your mood honestly in an app?' },
  { id: 56, category: 'AI Project Questions', text: 'Do you think AI can help notice stress early and support children?' },
  { id: 57, category: 'AI Project Questions', text: 'If this app helped you feel better, would you recommend it to your friends?' },
];

export const ChatbotScreen = ({ route }) => {
  const childName = route.params?.childName || 'Mansi';

  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: `Hi ${childName}! I am Buddy, your friendly AI companion. 🧸\n\nI would like to ask you a few simple questions to understand how you have been feeling lately. There are no right or wrong answers—just tell me what feels true for you!\n\nWould you like to start the KidCare Stress Check-in or just chat freely?`,
      time: 'Just now',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const addMessage = (sender, text, isAlert = false) => {
    const newMsg = {
      id: Date.now().toString(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAlert,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleSend = (overrideText) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    addMessage('user', textToSend);
    if (!overrideText) setInputText('');

    if (quizMode) {
      setTimeout(() => {
        const nextIndex = quizIndex + 1;
        if (nextIndex < KIDCARE_QUESTIONS.length) {
          setQuizIndex(nextIndex);
          const nextQ = KIDCARE_QUESTIONS[nextIndex];
          addMessage('ai', `[Question ${nextQ.id} of ${KIDCARE_QUESTIONS.length} • ${nextQ.category}]\n\n${nextQ.text}`);
        } else {
          setQuizMode(false);
          addMessage('ai', 'Thank you so much for answering my questions! You did a great job. Your answers will help me understand how you are feeling so I can support you better. Remember, it is always okay to ask for help, and you are never alone. ❤️');
        }
      }, 600);
      return;
    }

    const lower = textToSend.toLowerCase();
    if (lower.includes('start quiz') || lower.includes('stress check') || lower.includes('questionnaire')) {
      setQuizMode(true);
      setQuizIndex(0);
      setTimeout(() => {
        const firstQ = KIDCARE_QUESTIONS[0];
        addMessage('ai', `Awesome! Let us begin the KidCare Assessment. You can answer with options like "Never", "Sometimes", "Often", or "Always", or type freely!\n\n[Question 1 of ${KIDCARE_QUESTIONS.length} • ${firstQ.category}]\n\n${firstQ.text}`);
      }, 600);
      return;
    }

    setTimeout(() => {
      let isCritical = lower.includes('bullied') || lower.includes('hate') || lower.includes('hurt');
      if (isCritical) {
        addMessage('ai', `⚠️ I hear you, ${childName}, and I want you to know that you are safe here. Please know that feeling hurt is never your fault. Would you like me to connect you with a trusted parent or counselor?`, true);
      } else {
        addMessage('ai', `I am always here for you, ${childName}! Talking about your feelings is a great step. Is there anything specific on your mind today, or would you like to take our KidCare Wellness Quiz?`);
      }
    }, 600);
  };

  return (
    <KeyboardAvoidingView style={styles.outerContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.chatCard}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Buddy — AI Companion</Text>
            <Text style={styles.headerStatus}>🟢 Active • Always here to support you</Text>
          </View>
          {quizMode && (
            <View style={styles.quizProgressBadge}>
              <Text style={styles.quizProgressText}>Q {quizIndex + 1}/{KIDCARE_QUESTIONS.length}</Text>
            </View>
          )}
        </View>

        {/* Message Area */}
        <ScrollView ref={scrollViewRef} style={styles.chatArea} contentContainerStyle={styles.chatAreaContent}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.userMessageWrapper : styles.aiMessageWrapper]}>
                {!isUser && (
                  <View style={styles.miniAvatar}>
                    <Text style={{ fontSize: 16 }}>🤖</Text>
                  </View>
                )}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble, msg.isAlert && styles.alertBubble]}>
                  <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText, msg.isAlert && styles.alertMessageText]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.timeText, isUser && { color: '#E0E7FF' }]}>{msg.time}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsContainer}>
          {!quizMode ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSend('Start Quiz')}>
                <Text style={styles.chipText}>📝 Start KidCare Assessment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSend('I feel worried about my exams')}>
                <Text style={styles.chipText}>📚 Exam Stress</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSend('Someone was mean to me online')}>
                <Text style={styles.chipText}>🚨 Online Bullying</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <TouchableOpacity style={styles.quizChoiceBtn} onPress={() => handleSend('Never')}>
                <Text style={styles.quizChoiceText}>Never</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quizChoiceBtn} onPress={() => handleSend('Sometimes')}>
                <Text style={styles.quizChoiceText}>Sometimes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quizChoiceBtn} onPress={() => handleSend('Often')}>
                <Text style={styles.quizChoiceText}>Often</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quizChoiceBtn} onPress={() => handleSend('Always')}>
                <Text style={styles.quizChoiceText}>Always</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Input Controls */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={quizMode ? "Type your answer..." : "Type a message..."}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
            <Text style={styles.sendButtonText}>Send ➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chatCard: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarEmoji: { fontSize: 28 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerStatus: { fontSize: 13, color: '#059669', fontWeight: '700', marginTop: 2 },
  quizProgressBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  quizProgressText: { color: '#6D28D9', fontWeight: '800', fontSize: 13 },
  chatArea: { flex: 1, backgroundColor: '#F8FAFC' },
  chatAreaContent: { padding: 24 },
  messageWrapper: { flexDirection: 'row', marginBottom: 18, width: '100%' },
  userMessageWrapper: { justifyContent: 'flex-end' },
  aiMessageWrapper: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 4,
  },
  bubble: { padding: 18, borderRadius: 22, maxWidth: '80%' },
  userBubble: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  alertBubble: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FCA5A5', maxWidth: '85%' },
  messageText: { fontSize: 17, lineHeight: 26 },
  userMessageText: { color: '#FFFFFF', fontWeight: '600' },
  aiMessageText: { color: '#0F172A', fontWeight: '500' },
  alertMessageText: { color: '#991B1B', fontWeight: '700' },
  timeText: { fontSize: 11, color: '#94A3B8', marginTop: 8, alignSelf: 'flex-end', fontWeight: '600' },
  chipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chipBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: { color: '#3730A3', fontWeight: '800', fontSize: 14 },
  quizChoiceBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  quizChoiceText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  sendButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 24 },
  sendButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});