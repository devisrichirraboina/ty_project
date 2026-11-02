import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

export const FloatingScrollIndicator = ({
  scrollViewRef,
  scrollPosition = 0,
  contentHeight = 0,
  scrollViewHeight = 600,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [floatAnim] = useState(new Animated.Value(0));

  const SCROLL_THRESHOLD = 300; // Show after scrolling 300px
  const BOTTOM_HIDE_THRESHOLD = 200; // Hide when within 200px of bottom

  useEffect(() => {
    // Determine if scroll indicator should be visible
    const canScroll = contentHeight > scrollViewHeight;
    const scrollPercentage = (scrollPosition / (contentHeight - scrollViewHeight)) * 100;
    
    // Show if we can scroll, we've scrolled past threshold, and we're not near the bottom
    const shouldShow =
      canScroll &&
      scrollPosition > SCROLL_THRESHOLD &&
      scrollPercentage < 85; // Hide when 85% scrolled

    setIsVisible(shouldShow);
  }, [scrollPosition, contentHeight, scrollViewHeight]);

  // Floating animation
  useEffect(() => {
    if (isVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isVisible, floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const handleScroll = () => {
    if (scrollViewRef && scrollViewRef.current) {
      const nextScrollPosition = scrollPosition + scrollViewHeight * 0.75;
      scrollViewRef.current.scrollTo({
        y: Math.min(nextScrollPosition, contentHeight - scrollViewHeight),
        animated: true,
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.indicator}
        onPress={handleScroll}
        activeOpacity={0.8}
      >
        {/* Teddy Bear Emoji */}
        <View style={styles.content}>
          <View style={styles.bearWrapper}>
            <Animated.Text
              style={[
                styles.bearEmoji,
                {
                  transform: [{ translateY: Animated.multiply(floatAnim, -6) }],
                },
              ]}
            >
              🧸
            </Animated.Text>
          </View>

          {/* Scroll Arrow */}
          <Animated.Text
            style={[
              styles.arrow,
              {
                opacity: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          >
            ↓
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 99,
    pointerEvents: 'box-none',
  },

  indicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E6E2F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  bearWrapper: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bearEmoji: {
    fontSize: 24,
  },

  arrow: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5B50D8',
    marginTop: -2,
  },
});
