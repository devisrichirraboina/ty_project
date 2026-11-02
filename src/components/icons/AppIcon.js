import React from 'react';
import { View, Platform } from 'react-native';

// Fallback to react-native-svg for native iOS/Android, and HTML SVG for Web
let Svg, Path, Circle, Rect, Polyline, Line, G;
try {
  const RNSvg = require('react-native-svg');
  Svg = RNSvg.Svg;
  Path = RNSvg.Path;
  Circle = RNSvg.Circle;
  Rect = RNSvg.Rect;
  Polyline = RNSvg.Polyline;
  Line = RNSvg.Line;
  G = RNSvg.G;
} catch (e) {}

export const AppIcon = ({
  name,
  size = 20,
  color = '#6E56D6',
  strokeWidth = 2,
  fill = 'none',
  style,
}) => {
  const isWeb = Platform.OS === 'web' || typeof document !== 'undefined';

  const renderPaths = () => {
    switch (name) {
      // 1. Navigation & Core System Icons
      case 'home':
        return (
          <>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </>
        );

      case 'camera':
      case 'face-scan':
        return (
          <>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </>
        );

      case 'check-in':
      case 'clipboard':
        return (
          <>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <polyline points="9 14 11 16 15 11" />
          </>
        );

      case 'progress':
      case 'trending-up':
        return (
          <>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </>
        );

      case 'reports':
      case 'bar-chart':
        return (
          <>
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </>
        );

      case 'chat':
      case 'counselor':
        return (
          <>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill={color} />
            <circle cx="12" cy="10" r="1" fill={color} />
            <circle cx="15" cy="10" r="1" fill={color} />
          </>
        );

      case 'journal':
      case 'book':
        return (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="13" y2="11" />
          </>
        );

      case 'games':
      case 'gamepad':
        return (
          <>
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <line x1="15" y1="13" x2="15.01" y2="13" />
            <line x1="18" y1="11" x2="18.01" y2="11" />
            <rect x="2" y="6" width="20" height="12" rx="6" />
          </>
        );

      case 'bot':
      case 'ai':
        return (
          <>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth={strokeWidth + 1} />
            <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth={strokeWidth + 1} />
          </>
        );

      case 'bell':
      case 'notifications':
        return (
          <>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );

      case 'user':
      case 'profile':
        return (
          <>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        );

      case 'shield':
      case 'privacy':
        return (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </>
        );

      case 'logout':
        return (
          <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </>
        );

      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        );

      case 'edit':
      case 'pencil':
        return (
          <>
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </>
        );

      case 'fire':
      case 'streak':
        return (
          <>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </>
        );

      case 'sparkles':
        return (
          <>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </>
        );

      case 'moon':
        return (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        );

      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </>
        );

      case 'flower':
      case 'breathe':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2a4 4 0 0 0-4 4c0 3 4 5 4 5s4-2 4-5a4 4 0 0 0-4-4z" />
            <path d="M12 22a4 4 0 0 0 4-4c0-3-4-5-4-5s-4 2-4 5a4 4 0 0 0 4 4z" />
            <path d="M2 12a4 4 0 0 0 4 4c3 0 5-4 5-4s-2-4-5-4a4 4 0 0 0-4 4z" />
            <path d="M22 12a4 4 0 0 0-4-4c-3 0-5 4-5 4s2 4 5 4a4 4 0 0 0 4-4z" />
          </>
        );

      case 'heart':
        return (
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        );

      case 'leaf':
        return (
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        );

      case 'arrow-right':
        return (
          <>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </>
        );

      // 2. High-End Emotion Glyphs (Replacing Emojis)
      case 'mood-happy':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={strokeWidth + 1} />
            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={strokeWidth + 1} />
          </>
        );

      case 'mood-calm':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 10c.8.6 1.7.6 2.5 0" />
            <path d="M14 10c.8.6 1.7.6 2.5 0" />
            <path d="M9 14.5c1.8 1.2 4.2 1.2 6 0" />
          </>
        );

      case 'mood-neutral':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="15" x2="16" y2="15" />
            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={strokeWidth + 1} />
            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={strokeWidth + 1} />
          </>
        );

      case 'mood-sad':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={strokeWidth + 1} />
            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={strokeWidth + 1} />
          </>
        );

      case 'mood-angry':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 8.5L10 10" />
            <path d="M16.5 8.5L14 10" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <circle cx="9.5" cy="11.5" r=".75" fill={color} />
            <circle cx="14.5" cy="11.5" r=".75" fill={color} />
          </>
        );

      case 'mood-anxious':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15.5c1-.8 2-.8 3 0s2 .8 3 0 1.5-.5 2 0" />
            <circle cx="9" cy="9.5" r="1.5" />
            <circle cx="15" cy="9.5" r="1.5" />
          </>
        );

      
      case 'family':
      case 'parent':
      case 'users':
        return (
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        );

      case 'lightbulb':
      case 'tip':
      case 'idea':
        return (
          <>
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
          </>
        );

      case 'check':
        return (
          <polyline points="20 6 9 17 4 12" />
        );

      case 'close':
      case 'x':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );

      case 'mic':
        return (
          <>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </>
        );

      case 'paperclip':
      case 'attachment':
        return (
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        );

      case 'send':
        return (
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        );

      case 'calendar':
      case 'meeting':
        return (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </>
        );

      case 'verified':
        return (
          <>
            <path d="M12 2l2.4 2.4 3.4-.2 1.3 3.1 3.2 1.3-.2 3.4 2.4 2.4-2.4 2.4.2 3.4-3.2 1.3-1.3 3.1-3.4-.2L12 22l-2.4-2.4-3.4.2-1.3-3.1-3.2-1.3.2-3.4L0 12l2.4-2.4-.2-3.4 3.2-1.3 1.3-3.1 3.4.2z" />
            <polyline points="9 12 11 14 15 10" />
          </>
        );

      case 'brain':
        return (
          <>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
          </>
        );

      default:
        return (
          <circle cx="12" cy="12" r="10" />
        );
    }
  };

  if (isWeb) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      >
        {renderPaths()}
      </svg>
    );
  }

  // Native iOS / Android rendering using react-native-svg if available
  if (Svg) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        {renderPaths()}
      </Svg>
    );
  }

  return <View style={[{ width: size, height: size }, style]} />;
};
