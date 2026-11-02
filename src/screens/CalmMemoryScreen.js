import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export const CalmMemoryScreen = ({ navigation }) => {
  const items = ['🌸', '🌸', '🌤️', '🌤️', '🦋', '🦋', '⭐', '⭐', '🍃', '🍃', '🌈', '🌈', '🧸', '🧸', '💜', '💜'];

  const [cards, setCards] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [matched, setMatched] = useState({});
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  // Initialize game
  useEffect(() => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setRevealed({});
    setMatched({});
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameComplete(false);
  }, []);

  // Track time
  useEffect(() => {
    if (!gameComplete && startTime) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      return () => clearInterval(timer);
    }
  }, [startTime, gameComplete]);

  // Check for completion
  useEffect(() => {
    if (cards.length > 0 && Object.keys(matched).length === cards.length) {
      setGameComplete(true);
    }
  }, [matched]);

  const handleCardPress = (index) => {
    if (revealed[index] || matched[index] || gameComplete) return;

    const newRevealed = { ...revealed, [index]: true };
    setRevealed(newRevealed);

    const revealedIndices = Object.keys(newRevealed)
      .filter((key) => newRevealed[key] && !matched[key])
      .map((key) => parseInt(key));

    if (revealedIndices.length === 2) {
      const [first, second] = revealedIndices;
      setMoves(moves + 1);

      if (cards[first] === cards[second]) {
        // Match found
        setMatched({ ...matched, [first]: true, [second]: true });
        setRevealed({});
      } else {
        // No match
        setTimeout(() => {
          setRevealed({});
        }, 800);
      }
    }
  };

  const resetGame = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setRevealed({});
    setMatched({});
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameComplete(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Calm Memory 🧠</Text>
        <Text style={styles.subtitle}>
          Flip cards and find matching pairs at your own pace.
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Moves</Text>
            <Text style={styles.statValue}>{moves}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Progress</Text>
            <Text style={styles.statValue}>
              {Object.keys(matched).length / 2}/{cards.length / 2}
            </Text>
          </View>
        </View>

        {/* Game Board */}
        <View style={styles.gameBoard}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.card,
                (revealed[index] || matched[index]) && styles.cardRevealed,
              ]}
              onPress={() => handleCardPress(index)}
              activeOpacity={0.8}
            >
              {(revealed[index] || matched[index]) ? (
                <Text style={styles.cardEmoji}>{card}</Text>
              ) : (
                <Text style={styles.cardBack}>?</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Completion Message */}
        {gameComplete && (
          <View style={styles.completionMessage}>
            <Text style={styles.completionEmoji}>🌸</Text>
            <Text style={styles.completionTitle}>
              Great focus!
            </Text>
            <Text style={styles.completionText}>
              You completed the activity in {moves} moves and {formatTime(elapsedTime)}.
            </Text>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={resetGame}
              activeOpacity={0.85}
            >
              <Text style={styles.playAgainButtonText}>Play Again 🎮</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reset Button */}
        {!gameComplete && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetGame}
            activeOpacity={0.85}
          >
            <Text style={styles.resetButtonText}>Reset Game 🔄</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Tip:</Text>
          <Text style={styles.tipText}>
            Try to remember where each card is. You don't need to rush—take your time!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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

  scrollView: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    minHeight: '110%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 140,
    alignItems: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#17172A',
    marginBottom: 6,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  stats: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    gap: 10,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7C4DFF',
  },

  gameBoard: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 24,
  },

  card: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#EDE7F6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#7C4DFF',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },

  cardRevealed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
  },

  cardBack: {
    fontSize: 24,
    fontWeight: '800',
    color: '#7C4DFF',
  },

  cardEmoji: {
    fontSize: 24,
  },

  completionMessage: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#F0EEFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9E5F4',
  },

  completionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  completionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 6,
  },

  completionText: {
    fontSize: 13,
    color: '#6D28D9',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },

  playAgainButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },

  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  resetButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 20,
  },

  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  tipBox: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },

  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#17172A',
    marginBottom: 6,
  },

  tipText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
