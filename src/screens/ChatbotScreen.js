import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { getApiHost } from '../services/apiConfig';
import { enforceScreenRole } from '../services/authGuard';
import { ChildSidebar } from '../components/ChildSidebar';
import { AppIcon } from '../components/icons/AppIcon';

// Master knowledge base using the exact 57 questionnaire questions
const QUESTIONNAIRE_QUESTIONS = [
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

export const ChatbotScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  // Strict helper: a child's name must NEVER be a counselor, parent, or placeholder
  const isInvalidChildName = (name) => {
    if (!name || typeof name !== 'string') return true;
    const n = name.trim().toLowerCase();
    return (
      n === 'friend' ||
      n === 'student' ||
      n === 'child' ||
      n === 'there' ||
      n.includes('veda') ||
      n.includes('siddi') ||
      n.includes('counselor') ||
      n.includes('parent') ||
      n.includes('dr.')
    );
  };

  const initialParamName = route.params?.childName;
  const initialValidName = !isInvalidChildName(initialParamName) ? initialParamName : 'Devisri';
  const [childName, setChildName] = useState(initialValidName);
  const initialMood = route.params?.initialMood || 'Sad';

  // Helper to generate warm opening line based on selected mood
  const getInitialGreeting = (mood, name) => {
    const validName = !isInvalidChildName(name) ? name : 'Devisri';
    switch (mood) {
      case 'Happy':
        return `Hey ${validName}! 🌟 I noticed you're feeling happy today! That's wonderful! What's something fun that happened?`;
      case 'Good':
        return `Hey ${validName}! 🌿 I see you're having a good day today! How are things going?`;
      case 'Okay':
        return `Hi ${validName} 💙 I noticed you're feeling okay today. I'm right here if you want to chat or share how your day is going!`;
      case 'Angry':
        return `Hey ${validName} 🌿 I noticed you're feeling a bit frustrated or angry today. I'm here to listen without judgment—want to tell me what happened?`;
      case 'Sad':
      default:
        return `Hey ${validName} 💜 I noticed you're feeling a little sad today. Want to tell me what's been going on? I'm always here to listen.`;
    }
  };

  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: getInitialGreeting(initialMood, initialValidName),
      time: 'Just now',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [askedQuestionIds, setAskedQuestionIds] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] = useState(false);
  const recognitionRef = useRef(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    const checkAccessAndInit = async () => {
      const isAllowed = await enforceScreenRole(navigation, ['child', 'admin']);
      if (!isAllowed) return;

      let resolvedName = route.params?.childName;
      if (isInvalidChildName(resolvedName)) {
        resolvedName = null;
      }

      // Check active user email & name stored at login
      try {
        const activeEmail = await AsyncStorage.getItem('@alphacare_active_user_email');
        const activeName = await AsyncStorage.getItem('@alphacare_active_user_name');

        // If stale counselor session leaked into active storage, purge it
        if (
          (activeEmail && (activeEmail.toLowerCase().includes('veda') || activeEmail.toLowerCase().includes('counselor'))) ||
          (activeName && (activeName.toLowerCase().includes('veda') || activeName.toLowerCase().includes('siddi')))
        ) {
          await AsyncStorage.removeItem('@alphacare_active_user_name');
          await AsyncStorage.removeItem('@alphacare_counselor_cached_profile');
          await AsyncStorage.removeItem('@alphacare_child_profile_settings');
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('@alphacare_active_user_name');
            window.localStorage.removeItem('@alphacare_counselor_cached_profile');
            window.localStorage.removeItem('@alphacare_child_profile_settings');
          }
        } else if (!resolvedName && activeName && !isInvalidChildName(activeName)) {
          resolvedName = activeName;
        }

        // Check web localStorage
        if (!resolvedName && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const webName = window.localStorage.getItem('@alphacare_active_user_name');
          if (webName && !isInvalidChildName(webName)) {
            resolvedName = webName;
          }
        }

        // Check child profile settings
        if (!resolvedName) {
          const childProfileRaw = await AsyncStorage.getItem('@alphacare_child_profile_settings');
          if (childProfileRaw) {
            const cp = JSON.parse(childProfileRaw);
            if (cp.name && !isInvalidChildName(cp.name)) {
              resolvedName = cp.name;
            }
          }
        }

        // Check last registered child profile
        if (!resolvedName) {
          const savedProfilesRaw = await AsyncStorage.getItem('@alphacare_saved_profiles_list');
          if (savedProfilesRaw) {
            const list = JSON.parse(savedProfilesRaw);
            if (Array.isArray(list) && list.length > 0) {
              const lastChild = [...list].reverse().find(p => p.name && !isInvalidChildName(p.name));
              if (lastChild) resolvedName = lastChild.name;
            }
          }
        }

        // Check last registered email
        if (!resolvedName) {
          const lastEmail = await AsyncStorage.getItem('@alphacare_last_registered_email');
          if (lastEmail && !lastEmail.toLowerCase().includes('counselor') && !lastEmail.toLowerCase().includes('veda')) {
            if (lastEmail.includes('chirraboinad') || lastEmail.includes('devisri')) {
              resolvedName = 'Devisri chirraboina';
            } else {
              const prefix = lastEmail.split('@')[0];
              resolvedName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            }
          }
        }
      } catch (e) {
        console.log('Error checking child storage:', e);
      }

      // Supabase user check (only if NOT a counselor account!)
      if (!resolvedName) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const isCounselor =
              user.email === 'veda.siddi@alphacare.com' ||
              user.email?.toLowerCase().includes('counselor') ||
              user.user_metadata?.role === 'counselor';

            if (!isCounselor) {
              const candidate =
                user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                user.user_metadata?.username ||
                user.email?.split('@')[0];
              if (candidate && !isInvalidChildName(candidate)) {
                resolvedName = candidate;
              }
            }
          }
        } catch (e) {
          console.log('Error resolving child name from supabase:', e);
        }
      }

      const finalName = resolvedName && !isInvalidChildName(resolvedName) ? resolvedName : 'Devisri';
      setChildName(finalName);
      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: getInitialGreeting(initialMood, finalName),
          time: 'Just now',
        }
      ]);
    };
    checkAccessAndInit();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  // Select an unasked question from the exact questionnaire
  const getUnaskedQuestion = (ids) => {
    const available = QUESTIONNAIRE_QUESTIONS.filter(
      (q) => ids.includes(q.id) && !askedQuestionIds.includes(q.id)
    );
    if (available.length > 0) {
      const selected = available[0];
      setAskedQuestionIds((prev) => [...prev, selected.id]);
      return selected.text;
    }
    return null;
  };

  const generateAIResponse = (userText) => {
    const lower = userText.toLowerCase();

    // Respect user boundaries
    if (
      lower.includes("don't want to talk") ||
      lower.includes("dont want to talk") ||
      lower.includes("nothing") ||
      lower.includes("leave me alone") ||
      lower.includes("no")
    ) {
      return "No worries 💜 You don't have to talk about it right now. I'm still here whenever you feel ready.";
    }

    // Safety / Emergency Escalation
    if (
      lower.includes("hate myself") ||
      lower.includes("hurt") ||
      lower.includes("unsafe") ||
      lower.includes("scared")
    ) {
      const question = getUnaskedQuestion([49, 50, 25]);
      return `I hear you, ${childName}, and I want you to know that you are safe here 💜 Feeling hurt or scared is never your fault. ${
        question ? question : "Would you feel comfortable talking to a counselor or a trusted adult about this?"
      }`;
    }

    // Bullying / School Environment
    if (
      lower.includes("bullied") ||
      lower.includes("teased") ||
      lower.includes("mean") ||
      lower.includes("left out")
    ) {
      const question = getUnaskedQuestion([29, 23, 27, 30]);
      return `I'm so sorry to hear that 💙 Nobody deserves to be treated that way. ${
        question ? question : "Do you feel accepted and supported by your classmates or teachers?"
      }`;
    }

    // Academic Stress / Homework / Exams
    if (
      lower.includes("school") ||
      lower.includes("exam") ||
      lower.includes("study") ||
      lower.includes("homework") ||
      lower.includes("test") ||
      lower.includes("grades")
    ) {
      const question = getUnaskedQuestion([1, 2, 3, 5, 6]);
      return `Yeah, school can feel really overwhelming sometimes 💜 ${
        question ? question : "Do homework or assignments make you feel pressured lately?"
      }`;
    }

    // Sleep & Physical Health
    if (
      lower.includes("sleep") ||
      lower.includes("tired") ||
      lower.includes("headache") ||
      lower.includes("exhausted")
    ) {
      const question = getUnaskedQuestion([15, 16, 17, 18]);
      return `Getting good rest is so important for how we feel 🌿 ${
        question ? question : "Do you have trouble falling asleep when you feel stressed?"
      }`;
    }

    // Emotional Well-being / Sadness / Anxiety
    if (
      lower.includes("sad") ||
      lower.includes("lonely") ||
      lower.includes("worried") ||
      lower.includes("anxious")
    ) {
      const question = getUnaskedQuestion([8, 9, 11, 12, 13]);
      return `Thank you for sharing that with me 💜 It's completely valid to feel that way. ${
        question ? question : "Do you find yourself thinking too much about small problems?"
      }`;
    }

    // Coping & Positive Affirmation
    if (
      lower.includes("relax") ||
      lower.includes("music") ||
      lower.includes("game") ||
      lower.includes("better") ||
      lower.includes("happy")
    ) {
      const question = getUnaskedQuestion([33, 34, 35, 43, 45]);
      return `That sounds really helpful! 🌟 Taking time for yourself is a great coping strategy. ${
        question ? question : "Do you listen to music or try relaxation exercises when you want to unwind?"
      }`;
    }

    // Default Empathetic Fallback with Question
    const fallbackQ = getUnaskedQuestion([14, 21, 36, 42, 51]);
    return `I'm listening 💜 I'm always here to support you. ${
      fallbackQ ? fallbackQ : "Is there someone you trust that you like talking to when things feel heavy?"
    }`;
  };

    // Voice-to-Text Speech Recognition Handler
  const handleToggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognizer = new SpeechRec();
          recognizer.continuous = false;
          recognizer.interimResults = true;
          recognizer.lang = 'en-US';

          recognizer.onstart = () => {
            setIsListening(true);
          };

          recognizer.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript) {
              setInputText(transcript);
            }
          };

          recognizer.onerror = (e) => {
            console.log('Voice recognition note:', e.error);
            setIsListening(false);
            if (e.error === 'not-allowed') {
              Alert.alert('Microphone Access', 'Please allow microphone access in your browser to talk with AlphaBuddy.');
            }
          };

          recognizer.onend = () => {
            setIsListening(false);
          };

          recognizer.start();
          recognitionRef.current = recognizer;
        } catch (err) {
          console.log('Speech recognition exception:', err);
          setIsListening(false);
        }
      } else {
        Alert.alert('Voice Note', 'Speech-to-text is available on Chrome, Edge, and Safari browsers. Type your message below!');
      }
    } else {
      Alert.alert('Voice Note', 'Voice recognition is ready. Speak clearly into your device microphone.');
    }
  };

  // Attachment Picker & Handlers
  const handleOpenAttachmentPicker = () => {
    setIsAttachmentModalVisible(true);
  };

  const handleSelectFeelingTopic = (item) => {
    setPendingAttachment({
      type: 'topic',
      label: item.label,
      color: item.color,
      icon: item.icon
    });
    setIsAttachmentModalVisible(false);
    if (!inputText.trim()) {
      setInputText(`I'd like to talk about ${item.label}`);
    }
  };

  const handleTriggerPhotoUpload = () => {
    setIsAttachmentModalVisible(false);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            setPendingAttachment({
              type: 'image',
              uri: loadEvent.target.result,
              fileName: file.name
            });
            if (!inputText.trim()) {
              setInputText("I wanted to share this picture with you.");
            }
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    } else {
      Alert.alert('Upload Photo', 'Select a picture or mandala artwork to share.');
    }
  };

  const API_BASE_URL = getApiHost();

  const handleSend = async (textOverride) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    // Append child's message with any active attachment
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      attachment: pendingAttachment,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setPendingAttachment(null);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textOverride) setInputText('');

    setIsTyping(true);

    try {
      let aiReplyText = generateAIResponse(textToSend);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          },
          body: JSON.stringify({
            message: textToSend,
            childName: childName || 'Devisri',
            history: newMessages.slice(0, -1).map(m => ({ role: m.sender, text: m.text }))
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.response) aiReplyText = data.response;
        }
      } catch (err) {
        console.log('Using local intelligent response generator:', err.message);
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const QUICK_CHIPS = [
    "I have exam stress 📚",
    "I feel overwhelmed 💭",
    "How do I calm down? 🌸",
    "Tell me a positive thought ☀️",
    "Can we do a breathing break? 🫁"
  ];

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="AI Assistant"
          navigation={navigation}
          userName={childName}
        />
      )}

      <View style={styles.mainArea}>
        <KeyboardAvoidingView
          style={styles.desktopShell}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.phoneCard, isDesktop && styles.desktopCard]}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circleIconBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Buddy</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
            <Text style={styles.safeSpaceTagline}>Your safe space to talk, anytime 💜</Text>
          </View>

          <TouchableOpacity
            style={styles.circleIconBtn}
            onPress={() => Alert.alert('AI Buddy Info', 'AI Buddy is your private, judgment-free mental health support assistant.')}
            activeOpacity={0.7}
          >
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Chat Area */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* AI Buddy Hero Welcome Card */}
          <View style={styles.welcomeHeroCard}>
            <View style={styles.heroAvatarContainer}>
              <Image
                source={require('../../assets/ai_buddy_avatar.jpg')}
                style={styles.heroAvatarImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.heroTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Text style={styles.heroGreeting}>Hi {childName}!</Text>
    <AppIcon name="sparkles" size={18} color="#7C3AED" strokeWidth={2.2} />
  </View>
              <Text style={styles.heroSubText}>
                I’m your AI Buddy. You can talk to me about your feelings, school, friends or anything on your mind. I’m here to listen, always.
              </Text>
            </View>
          </View>

          {/* Messages Sequence */}
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View
                key={m.id}
                style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow]}
              >
                {!isUser && (
                  <View style={styles.miniAvatar}>
                    <Image
                      source={require('../../assets/ai_buddy_avatar.jpg')}
                      style={styles.miniAvatarImg}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.bubbleCol}>
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    {m.attachment && m.attachment.type === 'image' && (
                      <View style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
                        <Image source={{ uri: m.attachment.uri }} style={{ width: 220, height: 140, borderRadius: 10 }} resizeMode="cover" />
                      </View>
                    )}
                    {m.attachment && m.attachment.type === 'topic' && (
                      <View style={[styles.msgAttachmentTag, { backgroundColor: m.attachment.color + '18', borderColor: m.attachment.color + '40' }]}>
                        <AppIcon name={m.attachment.icon || 'sparkles'} size={12} color={m.attachment.color} />
                        <Text style={[styles.msgAttachmentTagText, { color: m.attachment.color }]}>{m.attachment.label}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.msgText,
                        isUser ? styles.userMsgText : styles.aiMsgText,
                      ]}
                    >
                      {m.text}
                    </Text>
                  </View>
                  <View style={[styles.timeRow, isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                    <Text style={styles.timeText}>{m.time}</Text>
                    {isUser && <Text style={styles.checkmarks}> ✓✓</Text>}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Quick Action Category Cards (like Help me calm down, Study stress tips, I just want to talk) */}
          <View style={styles.quickCategoryRow}>
            <TouchableOpacity
              style={[styles.quickCategoryCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => handleSend("Help me calm down")}
              activeOpacity={0.8}
            >
              <View style={{ marginBottom: 6 }}><AppIcon name="leaf" size={24} color="#16A34A" strokeWidth={2.2} /></View>
              <Text style={[styles.quickCategoryTitle, { color: '#16A34A' }]}>Help me</Text>
              <Text style={[styles.quickCategoryTitle, { color: '#16A34A' }]}>calm down</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCategoryCard, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}
              onPress={() => handleSend("Study stress tips")}
              activeOpacity={0.8}
            >
              <View style={{ marginBottom: 6 }}><AppIcon name="journal" size={24} color="#E11D48" strokeWidth={2.2} /></View>
              <Text style={[styles.quickCategoryTitle, { color: '#E11D48' }]}>Study</Text>
              <Text style={[styles.quickCategoryTitle, { color: '#E11D48' }]}>stress tips</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCategoryCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              onPress={() => handleSend("I just want to talk")}
              activeOpacity={0.8}
            >
              <View style={{ marginBottom: 6 }}><AppIcon name="chat" size={24} color="#2563EB" strokeWidth={2.2} /></View>
              <Text style={[styles.quickCategoryTitle, { color: '#2563EB' }]}>I just</Text>
              <Text style={[styles.quickCategoryTitle, { color: '#2563EB' }]}>want to talk</Text>
            </TouchableOpacity>
          </View>

          {/* Typing Indicator Bubble */}
          {isTyping && (
            <View style={[styles.msgRow, styles.aiRow]}>
              <View style={styles.miniAvatar}>
                <Image
                  source={require('../../assets/ai_buddy_avatar.jpg')}
                  style={styles.miniAvatarImg}
                  resizeMode="contain"
                />
              </View>
              <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                <View style={styles.dotPulseRow}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}

          {/* Decorative Corner Watermark */}
          <View style={styles.cornerWatermark}>
            <Text style={styles.watermarkText}>You got this ♡</Text>
            <AppIcon name="leaf" size={24} color="#10B981" strokeWidth={2} />
          </View>
        </ScrollView>

        {/* Pending Attachment Banner */}
        {pendingAttachment && (
          <View style={styles.pendingAttachmentBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <AppIcon name="paperclip" size={14} color="#7C3AED" strokeWidth={2.2} />
              {pendingAttachment.type === 'image' ? (
                <>
                  <Image source={{ uri: pendingAttachment.uri }} style={{ width: 26, height: 26, borderRadius: 6 }} />
                  <Text style={styles.pendingAttachmentText} numberOfLines={1}>Attached: {pendingAttachment.fileName || 'Picture'}</Text>
                </>
              ) : (
                <Text style={[styles.pendingAttachmentText, { color: pendingAttachment.color || '#7C3AED', fontWeight: '800' }]} numberOfLines={1}>
                  Topic: {pendingAttachment.label}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setPendingAttachment(null)} style={{ padding: 4 }}>
              <AppIcon name="close" size={14} color="#94A3B8" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* Floating Capsule Input Bar */}
        <View style={[styles.inputContainer, isListening && styles.inputContainerListening]}>
          <TouchableOpacity
            style={styles.attachmentBtn}
            onPress={handleOpenAttachmentPicker}
            activeOpacity={0.7}
            title="Attach a feeling topic or drawing"
          >
            <AppIcon name="paperclip" size={18} color="#7C3AED" strokeWidth={2.2} />
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isListening ? "Listening... Speak now 🎙️" : "Type a message..."}
            placeholderTextColor={isListening ? "#EF4444" : "#94A3B8"}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnListening]}
            onPress={handleToggleVoiceInput}
            activeOpacity={0.7}
            title={isListening ? "Stop voice listening" : "Speak to AlphaBuddy"}
          >
            <AppIcon name="mic" size={18} color={isListening ? "#EF4444" : "#7C3AED"} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendCircleBtn, !inputText.trim() && styles.sendCircleBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() && !isTyping}
            activeOpacity={0.85}
          >
            <AppIcon name="send" size={15} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        </View>
        </KeyboardAvoidingView>
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
  desktopShell: {
    flex: 1,
    backgroundColor: '#F8F9FE',
    width: '100%',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 24 : 0,
  },
  phoneCard: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 36 : 0,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#EFF2F8',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    display: 'flex',
    flexDirection: 'column',
  },
  desktopCard: {
    maxWidth: 960,
    borderRadius: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#334155',
    fontWeight: '700',
  },
  moreIcon: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  safeSpaceTagline: {
    fontSize: 11.5,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 4,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  welcomeHeroCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  heroAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#EDE9FE',
  },
  heroAvatarImg: {
    width: 75,
    height: 75,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  heroSubText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  miniAvatarImg: {
    width: 34,
    height: 34,
  },
  bubbleCol: {
    maxWidth: '78%',
  },
  bubble: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#EDE9FE',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  msgText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  userMsgText: {
    color: '#2E1065',
    fontWeight: '600',
  },
  aiMsgText: {
    color: '#1E293B',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  checkmarks: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '700',
  },
  quickCategoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 16,
  },
  quickCategoryCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickCategoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dotPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
  },
  cornerWatermark: {
    alignItems: 'flex-end',
    marginTop: 10,
    paddingRight: 10,
    opacity: 0.75,
  },
  watermarkText: {
    fontSize: 11.5,
    color: '#8B5CF6',
    fontWeight: '700',
    marginBottom: -6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  attachmentBtn: {
    padding: 8,
  },
  attachmentIcon: {
    fontSize: 18,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
  },
  micBtn: {
    padding: 8,
  },
  micIcon: {
    fontSize: 18,
  },
  sendCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sendCircleBtnDisabled: {
    opacity: 0.5,
  },

  pendingAttachmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pendingAttachmentText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '700',
    flex: 1,
  },
  inputContainerListening: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  micBtnListening: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
  },
  msgAttachmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  msgAttachmentTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  modalSubText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  uploadCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  uploadOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B21A8',
  },
  uploadOptionSub: {
    fontSize: 11,
    color: '#7E22CE',
    marginTop: 2,
  },
  topicSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  topicsGrid: {
    gap: 8,
  },
  topicPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  topicIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicPillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  topicPillSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  sendArrowIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    transform: [{ rotate: '0deg' }],
  },
});