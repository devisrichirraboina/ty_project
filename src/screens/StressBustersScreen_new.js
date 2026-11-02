import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

// Game Card Component
const GameCard = ({ game, navigation, columnCount, containerWidth }) => {
  const colorConfig = {
    purple: { bg: '#FBFAFF', icon: '#EAE5FF' },
    pink: { bg: '#FFF9FC', icon: '#FFE6F0' },
    yellow: { bg: '#FFFDF5', icon: '#FFF1BF' },
    mint: { bg: '#F7FFFB', icon: '#DDF7EA' },
  };

  const colors = colorConfig[game.color] || colorConfig.purple;

  return (
    <TouchableOpacity
      style={[
        styles.gameCard,
        { backgroundColor: colors.bg, width: containerWidth },
      ]}
      onPress={() => navigation.navigate(game.screen)}
      activeOpacity={0.85}
    >
      {/* Card Header - Icon & Arrow */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: colors.icon }]}>
          <Text style={styles.cardEmoji}>{game.emoji}</Text>
        </View>
        <View style={styles.cardArrowCircle}>
          <Text style={styles.cardArrow}>→</Text>
        </View>
      </View>

      {/* Card Title */}
      <Text style={styles.cardTitle}>{game.name}</Text>

      {/* Card Description */}
      <Text style={styles.cardDescription}>{game.description}</Text>

      {/* Duration Badge */}
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>⏱️ {game.duration}</Text>
      </View>

      {/* Spacer for flex */}
      <View style={{ flex: 1 }} />

      {/* Play Button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => navigation.navigate(game.screen)}
        activeOpacity={0.85}
      >
        <Text style={styles.playButtonText}>Play Now</Text>
        <Text style={styles.playButtonArrow}>→</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const StressBustersScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();

  // Calculate layout based on screen width
  const getLayout = () => {
    if (width >= 1024) {
      const containerWidth = Math.min(width - 56, 1200); // maxWidth 1200, padding 28*2
      const cardWidth = (containerWidth - 36) / 3; // 3 columns, 2 gaps of 18
      return { columns: 3, gap: 18, cardWidth };
    }
    if (width >= 768) {
      const containerWidth = Math.min(width - 56, 1200);
      const cardWidth = (containerWidth - 16) / 2; // 2 columns, 1 gap of 16
      return { columns: 2, gap: 16, cardWidth };
    }
    // Mobile
    const containerWidth = width - 56; // 28 padding each side
    return { columns: 1, gap: 14, cardWidth: containerWidth };
  };

  const layout = getLayout();

  const games = [
    {
      id: 1,
      name: 'Breathe With Me',
      emoji: '🌸',
      description: 'Take a guided breathing break and calm your mind.',
      duration: '1–2 min',
      screen: 'BreatheWithMe',
      color: 'purple',
    },
    {
      id: 2,
      name: 'Calm Memory',
      emoji: '🧠',
      description: 'Flip cards and find matching pairs in a peaceful game.',
      duration: '3–5 min',
      screen: 'CalmMemory',
      color: 'pink',
    },
    {
      id: 3,
      name: 'Color Calm',
      emoji: '🎨',
      description: 'Relax with a soothing coloring and creative activity.',
      duration: '5–10 min',
      screen: 'ColorCalm',
      color: 'yellow',
    },
    {
      id: 4,
      name: 'Bubble Break',
      emoji: '🫧',
      description: 'Pop gentle bubbles in a calm, pressure-free space.',
      duration: '1–2 min',
      screen: 'BubbleBreak',
      color: 'mint',
    },
    {
      id: 5,
      name: 'Zen Garden',
      emoji: '🌿',
      description: 'Create your own peaceful garden with simple touches.',
      duration: '5–7 min',
      screen: 'ZenGarden',
      color: 'purple',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChildDashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerSmall}>WELLNESS ACTIVITIES</Text>
          <Text style={styles.headerTitle}>Stress Busters 💜</Text>
          <Text style={styles.headerSub}>
            Pick an activity that feels right for you today
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Supportive Banner */}
        <View style={styles.supportCard}>
          <Text style={styles.supportIcon}>🌸</Text>
          <Text style={styles.supportTitle}>Give yourself a peaceful break</Text>
          <Text style={styles.supportText}>
            Choose a calming activity and take time to relax. You deserve it! 💜
          </Text>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stress Buster Activities</Text>
          <Text style={styles.sectionSubtitle}>
            Choose an activity to relax and recharge
          </Text>
        </View>

        {/* Games Grid - Responsive */}
        <View style={[styles.gamesGrid, { gap: layout.gap }]}>
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              navigation={navigation}
              columnCount={layout.columns}
              containerWidth={layout.cardWidth}
            />
          ))}
        </View>

        {/* Footer Message */}
        <View style={styles.footerMessage}>
          <Text style={styles.footerIcon}>✨</Text>
          <Text style={styles.footerText}>
            Remember: There's no pressure. These activities are just for you to
            relax and have fun. 💜
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
    backgroundColor: '#F7F5FF',
  },

  header: {
    height: 78,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E5F4',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    color: '#5B50D8',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 24,
  },

  headerSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9288D5',
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#202038',
    marginBottom: 3,
  },

  headerSub: {
    fontSize: 11,
    color: '#8B91A7',
  },

  scrollView: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    minHeight: '110%',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 140,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  /* ================= SUPPORTIVE BANNER ================= */

  supportCard: {
    width: '100%',
    backgroundColor: '#EDE9FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD5FF',
    padding: 28,
    marginBottom: 32,
    alignItems: 'center',
  },

  supportIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  supportTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#292545',
    marginBottom: 8,
    textAlign: 'center',
  },

  supportText: {
    fontSize: 13,
    color: '#756F96',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ================= SECTION HEADING ================= */

  sectionHeader: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#29283E',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#8B91A7',
    lineHeight: 16,
  },

  /* ================= GAMES GRID ================= */

  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },

  gameCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    backgroundColor: '#FFFFFF',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 280,
    justifyContent: 'space-between',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardEmoji: {
    fontSize: 26,
  },

  cardArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8F5',
  },

  cardArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6558DF',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#29283E',
    marginBottom: 8,
  },

  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#858BA0',
    marginBottom: 14,
  },

  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE8F5',
    marginBottom: 14,
  },

  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A7FA0',
  },

  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5548E8',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },

  playButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  playButtonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },

  /* ================= FOOTER ================= */

  footerMessage: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E2F2',
    padding: 20,
    alignItems: 'center',
  },

  footerIcon: {
    fontSize: 26,
    marginBottom: 10,
  },

  footerText: {
    fontSize: 12,
    color: '#756F96',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
});
