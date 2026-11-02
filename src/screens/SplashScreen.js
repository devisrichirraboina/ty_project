import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  ImageBackground,
  Text,
  useWindowDimensions,
  Platform,
} from 'react-native';

export const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    // Fade in background and branding
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 1100,
        delay: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Smooth loading progress
    Animated.timing(progress, {
      toValue: 1,
      duration: Platform.OS === 'web' ? 1200 : 2500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (finished) {
        navigation.replace('RoleSelection');
      }
    });
  }, [navigation, fadeAnim, progress, contentFade]);

  const loaderWidth = Math.min(width * 0.5, 320);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        <ImageBackground
          source={require('../../assets/splash-bg.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Subtle warm ambient overlay */}
          <View style={styles.overlay}>
            {/* Center Branded Card & Progress Bar */}
            <Animated.View
              style={[
                styles.centerContent,
                {
                  opacity: contentFade,
                  transform: [
                    {
                      translateY: contentFade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* App Brand Badge */}
              <View style={styles.brandCard}>
                <View style={styles.logoRow}>
                  <Text style={styles.logoSparkle}>✨</Text>
                  <Text style={styles.brandName}>AlphaCare</Text>
                </View>
                <Text style={styles.tagline}>
                  Smaller Worries, Brighter Tomorrows 💜
                </Text>
              </View>

              {/* Progress Bar Container */}
              <View style={[styles.progressWrapper, { width: loaderWidth }]}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.loadingText}>Opening safe space...</Text>
              </View>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3FC',
  },
  animatedContainer: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#2D1B4E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 24,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }
      : {}),
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoSparkle: {
    fontSize: 22,
    marginRight: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#342352',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#735F92',
    letterSpacing: 0.2,
  },
  progressWrapper: {
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(224, 214, 245, 0.8)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C4878',
    letterSpacing: 0.4,
  },
});
