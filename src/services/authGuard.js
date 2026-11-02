import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabaseClient';

const ROLE_STORAGE_KEY = '@alphacare_user_role';

/**
 * Standard Role Dashboard Route Mapping
 */
export const ROLE_DASHBOARDS = {
  child: 'ChildDashboard',
  parent: 'ParentDashboard',
  counselor: 'CounselorDashboard',
  admin: 'AdminDashboard',
};

/**
 * Display user-friendly notification on Web or Mobile (silent console log instead of blocking alert)
 */
export const showAccessDeniedAlert = (message = 'You do not have permission to access this screen.') => {
  console.log('[AuthGuard] Access notification:', message);
};

/**
 * Set active user role in local storage
 */
export const storeUserRole = async (role) => {
  try {
    if (!role) return;
    const normalized = String(role).toLowerCase().trim();
    await AsyncStorage.setItem(ROLE_STORAGE_KEY, normalized);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ROLE_STORAGE_KEY, normalized);
    }
  } catch (err) {
    console.log('[AuthGuard] storeUserRole note:', err);
  }
};

/**
 * Retrieve current user role from storage or active Supabase session
 */
export const getActiveUserRole = async () => {
  try {
    // 1. Check AsyncStorage cache
    const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
    if (stored) return stored.toLowerCase();

    // 2. Web localStorage fallback
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const browserStored = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (browserStored) return browserStored.toLowerCase();
    }

    // 3. Fallback: retrieve from active Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (session.user.email === 'admin@alphacare.com') {
        await storeUserRole('admin');
        return 'admin';
      }
      const roleFromMeta = session.user.user_metadata?.role;
      if (roleFromMeta) {
        const norm = String(roleFromMeta).toLowerCase();
        await storeUserRole(norm);
        return norm;
      }

      // Check if user has a profile in parent_profiles
      try {
        const { data: pData } = await supabase
          .from('parent_profiles')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (pData?.user_id) {
          await storeUserRole('parent');
          return 'parent';
        }
      } catch (e) {}

      // Check if user has a profile in counselor_profiles
      try {
        const { data: cData } = await supabase
          .from('counselor_profiles')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (cData?.user_id) {
          await storeUserRole('counselor');
          return 'counselor';
        }
      } catch (e) {}

      return 'child';
    }

    return 'child';
  } catch (err) {
    console.log('[AuthGuard] getActiveUserRole error:', err);
    return 'child';
  }
};

/**
 * Clear stored user role and Supabase session on logout
 */
export const clearUserAuthSession = async () => {
  try {
    const sessionKeys = [
      ROLE_STORAGE_KEY,
      '@alphacare_child_profile_settings',
      '@alphacare_active_user_email',
      '@alphacare_active_user_name',
      '@alphacare_active_user_id',
      '@alphacare_active_user_role',
      '@alphacare_jwt_token',
      '@alphacare_parent_name',
      '@alphacare_user_full_name',
    ];
    for (const key of sessionKeys) {
      await AsyncStorage.removeItem(key);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    }
    await supabase.auth.signOut();
  } catch (err) {
    console.log('[AuthGuard] clearUserAuthSession notice:', err);
  }
};

/**
 * Guard Screen Access against unauthorized roles:
 * Seamlessly checks user role without popping up blocking alerts.
 * 
 * @param {Object} navigation - React Navigation object
 * @param {Array<string>} allowedRoles - e.g. ['child', 'admin'] or ['parent', 'admin']
 * @returns {Promise<boolean>} True if authorized
 */
export const enforceScreenRole = async (navigation, allowedRoles = []) => {
  try {
    const cachedRole = await getActiveUserRole();
    if (cachedRole === 'admin') {
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Determine Role
    let userRole = cachedRole;
    if (user?.email === 'admin@alphacare.com') {
      userRole = 'admin';
    } else if (!userRole) {
      if (user?.user_metadata?.role) {
        userRole = (user.user_metadata.role || '').toLowerCase();
      } else {
        userRole = 'child';
      }
    }

    // Sync to cache
    await storeUserRole(userRole);

    if (userRole === 'admin') {
      return true;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase().trim());
      const isAuthorized =
        normalizedAllowed.includes(userRole) ||
        normalizedAllowed.includes('all') ||
        (normalizedAllowed.includes('child') && (userRole === 'child' || userRole === 'student' || userRole === 'parent')) ||
        (normalizedAllowed.includes('admin') && userRole === 'admin');

      if (!isAuthorized) {
        const userDashboard = ROLE_DASHBOARDS[userRole] || 'ChildDashboard';
        if (navigation && navigation.replace) {
          navigation.replace(userDashboard);
        }
        return false;
      }
    }

    return true;
  } catch (err) {
    console.log('[AuthGuard] enforceScreenRole exception:', err);
    return true; // fail open to prevent blocking screen
  }
};
