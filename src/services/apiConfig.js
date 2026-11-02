import { Platform } from 'react-native';

/**
 * Returns the resolved backend API host for production or development.
 * Supports environment override via EXPO_PUBLIC_BACKEND_URL.
 */
export const getApiHost = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
};
