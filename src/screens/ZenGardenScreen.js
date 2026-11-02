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

export const ZenGardenScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' ? width >= 600 : width >= 768;
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const elementTypes = [
    { id: 'flower1', emoji: '🌸', name: 'Pink Flower' },
    { id: 'flower2', emoji: '🌼', name: 'Yellow Flower' },
    { id: 'flower3', emoji: '🌺', name: 'Red Flower' },
    { id: 'leaf', emoji: '🍃', name: 'Leaf' },
    { id: 'stone', emoji: '🪨', name: 'Stone' },
    { id: 'butterfly', emoji: '🦋', name: 'Butterfly' },
  ];

  const gardenWidth = 300;
  const gardenHeight = 400;

  const handlePlaceElement = () => {
    if (!selectedElement) return;

    const randomX = Math.random() * (gardenWidth - 40);
    const randomY = Math.random() * (gardenHeight - 40);

    setElements([
      ...elements,
      {
        id: Date.now(),
        type: selectedElement,
        x: randomX,
        y: randomY,
      },
    ]);
  };

  const handleRemoveElement = (id) => {
    setElements(elements.filter((el) => el.id !== id));
  };

  const handleClearGarden = () => {
    setElements([]);
    setSelectedElement(null);
    setIsSaved(false);
  };

  const handleSaveGarden = () => {
    setIsSaved(true);
  };

  const getEmojiForType = (type) => {
    const element = elementTypes.find((el) => el.id === type);
    return element ? element.emoji : '🌸';
  };

  return (
    <View style={styles.appContainer}>
      {isDesktop && (
        <ChildSidebar
          activeTab="Zen Garden"
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
        <Text style={styles.title}>Zen Garden 🌿</Text>
        <Text style={styles.subtitle}>
          Create your own peaceful garden by placing flowers and stones.
        </Text>

        {/* Garden Canvas */}
        <View style={styles.gardenContainer}>
          <View style={styles.garden}>
            {/* Background */}
            <View style={styles.gardenBackground} />

            {/* Elements */}
            {elements.map((element) => (
              <TouchableOpacity
                key={element.id}
                style={[
                  styles.element,
                  {
                    left: element.x,
                    top: element.y,
                  },
                ]}
                onPress={() => handleRemoveElement(element.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.elementEmoji}>
                  {getEmojiForType(element.type)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Empty State */}
            {elements.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🌱</Text>
                <Text style={styles.emptyStateText}>
                  Start placing elements
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Element Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Choose an element:</Text>
          <View style={styles.elementGrid}>
            {elementTypes.map((element) => (
              <TouchableOpacity
                key={element.id}
                style={[
                  styles.elementButton,
                  selectedElement === element.id &&
                    styles.elementButtonSelected,
                ]}
                onPress={() => setSelectedElement(element.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.elementButtonEmoji}>
                  {element.emoji}
                </Text>
                <Text style={styles.elementButtonLabel}>
                  {element.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !selectedElement && styles.actionButtonDisabled,
            ]}
            onPress={handlePlaceElement}
            disabled={!selectedElement}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              Add {selectedElement ? '➕' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveGarden}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Save 💾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearGarden}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Clear 🗑️</Text>
          </TouchableOpacity>
        </View>

        {/* Completion Message */}
        {isSaved && (
          <View style={styles.completionMessage}>
            <Text style={styles.completionEmoji}>🌿</Text>
            <Text style={styles.completionTitle}>
              Your peaceful space is ready.
            </Text>
            <Text style={styles.completionText}>
              Take a slow breath and enjoy your garden.
            </Text>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Tips:</Text>
          <Text style={styles.tipItem}>
            • Tap an element to remove it from your garden
          </Text>
          <Text style={styles.tipItem}>
            • Arrange elements however feels peaceful to you
          </Text>
          <Text style={styles.tipItem}>
            • There's no right or wrong way to build
          </Text>
          <Text style={styles.tipItem}>
            • Tap "Save" when you're happy with your design
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
    marginBottom: 20,
    lineHeight: 20,
  },

  gardenContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  garden: {
    width: 300,
    height: 400,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#93C5FD',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gardenBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    backgroundImage:
      'linear-gradient(90deg, #E0F2FE 1px, transparent 1px), linear-gradient(#E0F2FE 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },

  element: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  elementEmoji: {
    fontSize: 28,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },

  selectorContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },

  selectorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17172A',
    marginBottom: 12,
  },

  elementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },

  elementButton: {
    width: '30%',
    minWidth: 80,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },

  elementButtonSelected: {
    backgroundColor: '#EDE7F6',
    borderColor: '#7C4DFF',
    borderWidth: 2,
  },

  elementButtonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },

  elementButtonLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  actionButton: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  actionButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },

  actionButtonText: {
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
    textAlign: 'center',
  },

  completionText: {
    fontSize: 13,
    color: '#6D28D9',
    textAlign: 'center',
    lineHeight: 18,
  },

  tipsBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },

  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17172A',
    marginBottom: 10,
  },

  tipItem: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },
});
