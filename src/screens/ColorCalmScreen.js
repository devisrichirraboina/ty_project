import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { ChildSidebar } from '../components/ChildSidebar';

export const ColorCalmScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const colors = ['#D8B4FE', '#FBB6CE', '#93C5FD', '#A7F3D0', '#FBBF24', '#FED7AA'];
  const colorNames = ['Lavender', 'Pink', 'Blue', 'Mint', 'Yellow', 'Peach'];

  const [colorMap, setColorMap] = useState({
    1: '#D8B4FE',
    2: '#D8B4FE',
    3: '#D8B4FE',
    4: '#FBB6CE',
    5: '#93C5FD',
    6: '#A7F3D0',
    7: '#D8B4FE',
    8: '#FBBF24',
    9: '#FED7AA',
  });

  const [selectedColor, setSelectedColor] = useState('#D8B4FE');
  const [isComplete, setIsComplete] = useState(false);

  const handlePaint = (area) => {
    setColorMap({ ...colorMap, [area]: selectedColor });
  };

  const handleSave = () => {
    setIsComplete(true);
  };

  const handleClear = () => {
    setColorMap({
      1: '#D8B4FE',
      2: '#D8B4FE',
      3: '#D8B4FE',
      4: '#FBB6CE',
      5: '#93C5FD',
      6: '#A7F3D0',
      7: '#D8B4FE',
      8: '#FBBF24',
      9: '#FED7AA',
    });
  };

  const handleReset = () => {
    handleClear();
    setIsComplete(false);
  };

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="Color Calm"
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

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Color Calm 🎨</Text>
        <Text style={styles.subtitle}>
          Choose colors and create a peaceful artwork at your own pace.
        </Text>

        {/* Canvas Area */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvas}>
            {/* Simple flower pattern - 9 sections */}
            {/* Petals */}
            <TouchableOpacity
              style={[styles.petal, styles.petalTop, { backgroundColor: colorMap[1] }]}
              onPress={() => handlePaint(1)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalRight, { backgroundColor: colorMap[2] }]}
              onPress={() => handlePaint(2)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalBottom, { backgroundColor: colorMap[3] }]}
              onPress={() => handlePaint(3)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalLeft, { backgroundColor: colorMap[4] }]}
              onPress={() => handlePaint(4)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalTopRight, { backgroundColor: colorMap[5] }]}
              onPress={() => handlePaint(5)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalBottomRight, { backgroundColor: colorMap[6] }]}
              onPress={() => handlePaint(6)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalBottomLeft, { backgroundColor: colorMap[7] }]}
              onPress={() => handlePaint(7)}
              activeOpacity={0.9}
            />
            <TouchableOpacity
              style={[styles.petal, styles.petalTopLeft, { backgroundColor: colorMap[8] }]}
              onPress={() => handlePaint(8)}
              activeOpacity={0.9}
            />

            {/* Center */}
            <TouchableOpacity
              style={[styles.center, { backgroundColor: colorMap[9] }]}
              onPress={() => handlePaint(9)}
              activeOpacity={0.9}
            />
          </View>
        </View>

        {/* Color Palette */}
        <View style={styles.paletteContainer}>
          <Text style={styles.paletteTitle}>Choose a color:</Text>
          <View style={styles.palette}>
            {colors.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorButtonSelected,
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.8}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.controlButtonText}>Save 💾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleClear}
            activeOpacity={0.85}
          >
            <Text style={styles.controlButtonText}>Clear 🗑️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <Text style={styles.controlButtonText}>Reset 🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Completion Message */}
        {isComplete && (
          <View style={styles.completionMessage}>
            <Text style={styles.completionEmoji}>🎨</Text>
            <Text style={styles.completionTitle}>Lovely!</Text>
            <Text style={styles.completionText}>
              You created something peaceful. Great job!
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <Text style={styles.instructionItem}>
            1. Choose a color from the palette below
          </Text>
          <Text style={styles.instructionItem}>
            2. Tap on the sections to color them
          </Text>
          <Text style={styles.instructionItem}>
            3. Mix and match colors to create your design
          </Text>
          <Text style={styles.instructionItem}>
            4. Save when you're happy with it!
          </Text>
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
    marginBottom: 24,
    lineHeight: 20,
  },

  canvasContainer: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 1,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  canvas: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  petal: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  petalTop: {
    top: 10,
    left: '50%',
    marginLeft: -30,
  },

  petalRight: {
    right: 10,
    top: '50%',
    marginTop: -30,
  },

  petalBottom: {
    bottom: 10,
    left: '50%',
    marginLeft: -30,
  },

  petalLeft: {
    left: 10,
    top: '50%',
    marginTop: -30,
  },

  petalTopRight: {
    top: 30,
    right: 30,
  },

  petalBottomRight: {
    bottom: 30,
    right: 30,
  },

  petalBottomLeft: {
    bottom: 30,
    left: 30,
  },

  petalTopLeft: {
    top: 30,
    left: 30,
  },

  center: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },

  paletteContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },

  paletteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17172A',
    marginBottom: 10,
  },

  palette: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  colorButtonSelected: {
    borderColor: '#17172A',
    borderWidth: 3,
  },

  colorCheckmark: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  controls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  controlButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  completionMessage: {
    width: '100%',
    maxWidth: 400,
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
  },

  instructionsBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
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
});
