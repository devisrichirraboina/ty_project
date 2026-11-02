import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const RoleSelectionScreen = ({ navigation }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [hoveredId, setHoveredId] = useState(null);

  const isDesktop = windowWidth >= 960;
  const isTablet = windowWidth >= 640 && windowWidth < 960;

  const roles = [
    {
      id: 'child',
      title: 'Child',
      desc: 'Fun mood adventures, AI buddy & relaxing games',
      avatar: '🧒',
      woodTone: ['#FFF8F0', '#F8ECE0', '#EEDAC6'],
      woodBorder: '#E0C5A8',
      woodAccent: '#8B5A2B',
      accentColor: '#845EC2',
      badgeBg: '#F3E8FF',
      route: 'ChildRegistration',
      stagger: 0,
    },
    {
      id: 'parent',
      title: 'Parent',
      desc: 'Understand your child’s emotional growth & tips',
      avatar: '👨‍👩‍👧',
      woodTone: ['#FFF7F2', '#F9EBE5', '#EEDDD4'],
      woodBorder: '#E2C7B9',
      woodAccent: '#935F4C',
      accentColor: '#D65DB1',
      badgeBg: '#FFE4E6',
      route: 'ParentAuth',
      stagger: isDesktop ? 28 : 0,
    },
    {
      id: 'counselor',
      title: 'Counselor',
      desc: 'Clinical tools, safe chats & growth assessments',
      avatar: '🧑‍⚕️',
      woodTone: ['#F6FAF7', '#EBF4EE', '#DCECE1'],
      woodBorder: '#C1DAC9',
      woodAccent: '#4D7C5F',
      accentColor: '#008F7A',
      badgeBg: '#DCFCE7',
      route: 'CounselorAuth',
      stagger: isDesktop ? 56 : 0,
    },
  ];

  return (
    <LinearGradient
      colors={['#F5F3FF', '#EDE9FE', '#F3F4F6']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: Math.max(windowHeight, 720) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Main Card Container */}
        <View style={[styles.mainWrapper, isDesktop && styles.mainWrapperDesktop]}>
          {/* Header Text Group */}
          <View style={styles.headerSection}>
            <Text style={styles.mainHeading}>
              Choose Your Role <Text style={styles.heartEmoji}>💜</Text>
            </Text>
          </View>

          {/* Middle: Three Wooden Directional Route-Arrow Signboards */}
          <View
            style={[
              styles.signboardsContainer,
              isDesktop
                ? styles.signboardsDesktop
                : isTablet
                ? styles.signboardsTablet
                : styles.signboardsMobile,
            ]}
          >
            {roles.map((role) => {
              const isHovered = hoveredId === role.id;

              return (
                <View
                  key={role.id}
                  style={[
                    styles.signpostWrapper,
                    isDesktop && { marginTop: role.stagger },
                  ]}
                >
                  {/* The Wooden Directional Arrow Signboard */}
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => navigation.navigate(role.route, { role: role.id })}
                    {...(Platform.OS === 'web'
                      ? {
                          onMouseEnter: () => setHoveredId(role.id),
                          onMouseLeave: () => setHoveredId(null),
                        }
                      : {})}
                    style={[
                      styles.signboardTouchArea,
                      isHovered && styles.signboardHovered,
                    ]}
                  >
                    {/* Main Wooden Plank Body */}
                    <View style={styles.woodenPlankOuter}>
                      <LinearGradient
                        colors={role.woodTone}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.woodenPlankInner,
                          { borderColor: role.woodBorder },
                        ]}
                      >
                        {/* Wood Grain Lines overlay */}
                        <View style={styles.woodGrainOverlay}>
                          <View style={styles.woodGrainLineTop} />
                          <View style={styles.woodGrainLineMid} />
                          <View style={styles.woodGrainLineBtm} />
                        </View>

                        {/* Left Wooden Screws / Fasteners */}
                        <View style={styles.fastenerColumn}>
                          <View style={[styles.screwHead, { borderColor: role.woodAccent }]}>
                            <View style={styles.screwSlot} />
                          </View>
                          <View style={[styles.screwHead, { borderColor: role.woodAccent }]}>
                            <View style={[styles.screwSlot, { transform: [{ rotate: '45deg' }] }]} />
                          </View>
                        </View>

                        {/* Avatar Badge */}
                        <View
                          style={[
                            styles.avatarCircle,
                            { backgroundColor: role.badgeBg, borderColor: role.woodBorder },
                          ]}
                        >
                          <Text style={styles.avatarEmoji}>{role.avatar}</Text>
                        </View>

                        {/* Role Info / Text */}
                        <View style={styles.roleContentBlock}>
                          <Text style={styles.roleTitleText}>{role.title}</Text>
                          <Text style={styles.roleDescText} numberOfLines={2}>
                            {role.desc}
                          </Text>
                        </View>

                        {/* Right Directional Arrow Tip */}
                        <View style={styles.arrowEndSection}>
                          {/* Directional Chevron Pointer */}
                          <View
                            style={[
                              styles.woodenChevron,
                              {
                                borderLeftColor: role.woodBorder,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.woodenChevronInner,
                                {
                                  borderLeftColor: role.woodTone[1],
                                },
                              ]}
                            />
                          </View>

                          {/* Circular Action Arrow Icon */}
                          <View
                            style={[
                              styles.actionArrowBadge,
                              { backgroundColor: role.accentColor },
                              isHovered && styles.actionArrowBadgeHovered,
                            ]}
                          >
                            <Text style={styles.actionArrowSymbol}>➔</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>

                  {/* Small Wooden Post / Stand Underneath */}
                  <View style={styles.woodenPostContainer}>
                    {/* Left Bracket / Strut */}
                    <View style={[styles.postBracketLeft, { backgroundColor: '#B88A58' }]} />
                    {/* Main Vertical Post */}
                    <LinearGradient
                      colors={['#C29B70', '#8F633A']}
                      style={styles.woodenPostPole}
                    >
                      <View style={styles.postWoodGrain} />
                    </LinearGradient>
                    {/* Right Bracket / Strut */}
                    <View style={[styles.postBracketRight, { backgroundColor: '#B88A58' }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Bottom: Administrator Option */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.adminButton}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Login', { role: 'admin' })}
            >
              <Text style={styles.adminLockIcon}>🔒</Text>
              <Text style={styles.adminText}>Login as Administrator</Text>
              <Text style={styles.adminArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Main Wrapper */
  mainWrapper: {
    width: '100%',
    maxWidth: 1140,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#2D1B4E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  mainWrapperDesktop: {
    paddingHorizontal: 40,
    paddingVertical: 40,
  },

  /* Header Section */
  headerSection: {
    alignItems: 'center',
    marginBottom: 36,
    textAlign: 'center',
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#261B3F',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heartEmoji: {
    fontSize: 28,
  },

  /* Middle Signboards Container */
  signboardsContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  signboardsDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
  },
  signboardsTablet: {
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    maxWidth: 580,
  },
  signboardsMobile: {
    flexDirection: 'column',
    gap: 18,
    width: '100%',
  },

  /* Signpost Wrapper */
  signpostWrapper: {
    flex: 1,
    width: '100%',
    minWidth: 260,
    maxWidth: 340,
    alignItems: 'center',
  },

  /* Signboard Touch Area */
  signboardTouchArea: {
    width: '100%',
    borderRadius: 20,
    transitionDuration: '220ms',
    transitionProperty: 'transform, box-shadow',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },
  signboardHovered: {
    transform: [{ translateY: -6 }],
  },

  /* Wooden Plank Body */
  woodenPlankOuter: {
    width: '100%',
    borderRadius: 20,
    shadowColor: '#5C3818',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  woodenPlankInner: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 18,
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  /* Wood Grain Effect */
  woodGrainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    pointerEvents: 'none',
  },
  woodGrainLineTop: {
    width: '92%',
    height: 1,
    backgroundColor: 'rgba(160, 110, 60, 0.08)',
    marginLeft: 12,
  },
  woodGrainLineMid: {
    width: '84%',
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginLeft: 24,
  },
  woodGrainLineBtm: {
    width: '88%',
    height: 1,
    backgroundColor: 'rgba(140, 95, 50, 0.07)',
    marginLeft: 8,
  },

  /* Fastener Screws */
  fastenerColumn: {
    justifyContent: 'space-between',
    height: 52,
    marginRight: 10,
  },
  screwHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9B998',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screwSlot: {
    width: 4,
    height: 1,
    backgroundColor: '#8B6440',
  },

  /* Avatar Circle */
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarEmoji: {
    fontSize: 27,
  },

  /* Role Content Block */
  roleContentBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  roleTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#382513',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  roleDescText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6E5C4E',
    lineHeight: 16,
  },

  /* Arrow End Section with Directional Chevron & Circular Action Badge */
  arrowEndSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  woodenChevron: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 16,
    borderBottomWidth: 16,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'relative',
    marginRight: 6,
  },
  woodenChevronInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
    top: -14,
    left: -14,
  },
  actionArrowBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
    transitionDuration: '180ms',
    transitionProperty: 'transform',
  },
  actionArrowBadgeHovered: {
    transform: [{ translateX: 4 }],
  },
  actionArrowSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  /* Wooden Post Pole Underneath */
  woodenPostContainer: {
    width: 60,
    height: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    marginTop: -2,
    zIndex: -1,
  },
  woodenPostPole: {
    width: 18,
    height: 24,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: '#7A5229',
    position: 'relative',
    overflow: 'hidden',
  },
  postWoodGrain: {
    position: 'absolute',
    left: 4,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  postBracketLeft: {
    position: 'absolute',
    top: 0,
    left: 12,
    width: 10,
    height: 4,
    transform: [{ rotate: '-30deg' }],
    borderRadius: 2,
    opacity: 0.8,
  },
  postBracketRight: {
    position: 'absolute',
    top: 0,
    right: 12,
    width: 10,
    height: 4,
    transform: [{ rotate: '30deg' }],
    borderRadius: 2,
    opacity: 0.8,
  },

  /* Bottom Section */
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(243, 232, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.8)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminLockIcon: {
    fontSize: 14,
    marginRight: 7,
  },
  adminText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  adminArrow: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6B21A8',
    marginLeft: 6,
  },
});
