import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { ChildSidebar } from '../components/ChildSidebar';

export const BubbleBreakScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const [bubbles, setBubbles] = useState([]);
  const [popped, setPopped] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Generate bubbles
  const generateBubble = (id) => {
    return {
      id,
      x: Math.random() * 80 + 10, // 10-90% width
      y: Math.random() * 60 + 20, // 20-80% height
      size: Math.random() * 30 + 40, // 40-70px
      color: ['#D8B4FE', '#FBB6CE', '#93C5FD', '#A7F3D0', '#FBBF24'][Math.floor(Math.random() * 5)],
      opacity: new Animated.Value(0),
    };
  };

  // Start session
  const startSession = () => {
    setIsActive(true);
    setPopped(0);
    setSecondsLeft(90);
    setSessionComplete(false);
    setBubbles([]);
  };

  // Stop session
  const stopSession = () => {
    setIsActive(false);
    setSessionComplete(true);
  };

  // Bubble spawn timer
  useEffect(() => {
    if (!isActive) return;

    const spawnTimer = setInterval(() => {
      setBubbles((prev) => {
        const newBubbles = [...prev];
        if (newBubbles.length < 8) {
          newBubbles.push(generateBubble(Date.now() + Math.random()));
        }
        return newBubbles;
      });
    }, 400);

    return () => clearInterval(spawnTimer);
  }, [isActive]);

  // Count down timer
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const handleBubblePress = (id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    setPopped((prev) => prev + 1);
  };

  const resetSession = () => {
    setIsActive(false);
    setBubbles([]);
    setPopped(0);
    setSecondsLeft(90);
    setSessionComplete(false);
  };

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="Bubble Break"
          navigation={navigation}
        />
      )}

      <View style={styles.mainArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ChildDashboard');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButton}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

      {/* Play Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.playAreaContainer}
        showsVerticalScrollIndicator={true}
      >
        {!isActive && !sessionComplete && (
          <View style={styles.startScreen}>
            <Text style={styles.startTitle}>Bubble Break 🫧</Text>
            <Text style={styles.startSubtitle}>
              Pop gentle bubbles to relax. No pressure, just fun!
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={startSession}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start ▶️ (90s)</Text>
            </TouchableOpacity>
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>How it works:</Text>
              <Text style={styles.instructionItem}>
                • Tap bubbles as they float by
              </Text>
              <Text style={styles.instructionItem}>
                • No game over or scoring pressure
              </Text>
              <Text style={styles.instructionItem}>
                • Enjoy the calm experience
              </Text>
              <Text style={styles.instructionItem}>
                • Session lasts 90 seconds
              </Text>
            </View>
          </View>
        )}

        {isActive && (
          <View style={styles.playArea}>
            {/* Top Stats Bar */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Bubbles Popped</Text>
                <Text style={styles.statNumber}>{popped}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Time Left</Text>
                <Text style={styles.statNumber}>{secondsLeft}s</Text>
              </View>
            </View>

            {/* Bubbles */}
            <View style={styles.bubbleContainer}>
              {bubbles.map((bubble) => (
                <TouchableOpacity
                  key={bubble.id}
                  style={[
                    styles.bubble,
                    {
                      left: `${bubble.x}%`,
                      top: `${bubble.y}%`,
                      width: bubble.size,
                      height: bubble.size,
                      backgroundColor: bubble.color,
                    },
                  ]}
                  onPress={() => handleBubblePress(bubble.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bubbleGloss} />
                  <Text style={styles.bubbleText}>✨</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pause Button */}
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={stopSession}
              activeOpacity={0.85}
            >
              <Text style={styles.pauseButtonText}>Finish ⏹️</Text>
            </TouchableOpacity>
          </View>
        )}

        {sessionComplete && (
          <View style={styles.completionScreen}>
            <Text style={styles.completionEmoji}>💜</Text>
            <Text style={styles.completionTitle}>
              Nice little break!
            </Text>
            <Text style={styles.completionStat}>
              You popped {popped} bubbles
            </Text>
            <Text style={styles.completionText}>
              You made time to relax and have fun. That's great!
            </Text>

            <View style={styles.completionButtons}>
              <TouchableOpacity
                style={styles.completionButton}
                onPress={startSession}
                activeOpacity={0.85}
              >
                <Text style={styles.completionButtonText}>Play Again 🎮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.completionButton, styles.backHomeButton]}
                onPress={() => navigation.navigate('StressBusters')}
                activeOpacity={0.85}
              >
                <Text style={styles.completionButtonText}>Back 🏠</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    backgroundColor: '#F5F3FF',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#F5F3FF',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    color: '#7C4DFF',
    fontSize: 14,
    fontWeight: '700',
  },

  playAreaContainer: {
    flexGrow: 1,
    minHeight: '110%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
    minHeight: 0,
  },

  startScreen: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  startTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#17172A',
    marginBottom: 8,
    textAlign: 'center',
  },

  startSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  startButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  instructionsBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  instructionsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17172A',
    marginBottom: 10,
  },

  instructionItem: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },

  playArea: {
    width: '100%',
    height: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },

  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  statItem: {
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7C4DFF',
  },

  bubbleContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FAFAFA',
  },

  bubble: {
    position: 'absolute',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },

  bubbleGloss: {
    position: 'absolute',
    top: '15%',
    left: '20%',
    width: '28%',
    height: '28%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },

  bubbleText: {
    fontSize: 18,
  },

  pauseButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  completionScreen: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  completionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },

  completionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#17172A',
    marginBottom: 8,
    textAlign: 'center',
  },

  completionStat: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C4DFF',
    marginBottom: 8,
  },

  completionText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },

  completionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  completionButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backHomeButton: {
    backgroundColor: '#E2E8F0',
  },

  completionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
