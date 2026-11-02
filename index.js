import 'react-native-gesture-handler';
import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, View, Platform } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';

// ─── WEB-ONLY: Fix React Native Web's default overflow:hidden & Scrollbars ──
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const applyStyles = () => {
    if (!document.head || document.getElementById('alphacare-scroll-fix')) return;
    const style = document.createElement('style');
    style.id = 'alphacare-scroll-fix';
  style.innerHTML = `
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }
    #root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    /* Universal visible scrollbar for all scrollable views */
    * {
      scrollbar-width: thin !important;
      scrollbar-color: #8B5CF6 #F3E8FF !important;
    }
    ::-webkit-scrollbar {
      width: 10px !important;
      height: 10px !important;
      display: block !important;
    }
    ::-webkit-scrollbar-track {
      background: #F3E8FF !important;
      border-radius: 8px !important;
    }
    ::-webkit-scrollbar-thumb {
      background-color: #8B5CF6 !important;
      border-radius: 8px !important;
      border: 2px solid #F3E8FF !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: #6D28D9 !important;
    }
  `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStyles);
  } else {
    applyStyles();
  }
}
// ──────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <View style={styles.root}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // On web, explicit height is REQUIRED for ScrollView to work.
    // Without this, React Native Web's ScrollView has no bounded height to scroll within.
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
});

registerRootComponent(App);