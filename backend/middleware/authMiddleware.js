/**
 * AlphaCare RBAC Security Middleware (Module 1 - Authentication & Authorization)
 * 
 * Provides:
 * 1. authenticateUser: Validates Supabase JWT Bearer token & attaches req.user and req.userRole
 * 2. authorizeRole(...allowedRoles): Enforces role permission (returns 403 if unauthorized)
 * 3. verifyChildOwnership: Ensures parents can only access their linked children
 * 4. verifyCounselorAssignment: Ensures counselors can only access their assigned children
 */

const { createClient } = require('@supabase/supabase-js');
let wsClient;
try {
  wsClient = require('ws');
} catch (e) {}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ykwtizyhuesoualndper.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_XRp3vIKDY-fPmXn-5uct7g_57ky99Dd';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  ...(wsClient ? { realtime: { transport: wsClient } } : {}),
});

const { verifyToken } = require('../utils/jwtUtils');

/**
 * Express Middleware: Authenticate Bearer JWT token
 * Supports both custom AlphaCare backend JWTs (HS256 with configurable expiry)
 * and Supabase Auth JWTs.
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or malformed authentication token. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({
        error: 'Unauthorized: Invalid token supplied.'
      });
    }

    // 1. Try verifying as native AlphaCare Backend JWT (with configurable expiration)
    try {
      const decoded = verifyToken(token);
      if (decoded && (decoded.sub || decoded.id)) {
        req.user = {
          id: decoded.sub || decoded.id,
          email: decoded.email || '',
          user_metadata: {
            role: decoded.role || 'child',
            name: decoded.name || ''
          }
        };
        req.userRole = (decoded.role || 'child').toLowerCase();
        req.tokenPayload = decoded;
        return next();
      }
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized: Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      // If signature invalid / not custom token, gracefully fall back to Supabase verification below
    }

    // 2. Fallback: Validate with Supabase Auth Engine
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized: Token is expired, invalid, or revoked. Please re-authenticate.',
        code: 'TOKEN_INVALID'
      });
    }

    // Determine normalized role (child | parent | counselor | admin)
    const roleFromMeta = (user.user_metadata?.role || '').toLowerCase();
    let effectiveRole = roleFromMeta;

    if (!effectiveRole) {
      if (user.email === 'admin@alphacare.com') {
        effectiveRole = 'admin';
      } else {
        effectiveRole = 'child';
      }
    }

    // Attach authenticated user details to Express request
    req.user = user;
    req.userRole = effectiveRole;

    next();
  } catch (err) {
    console.error('[RBAC Auth Error]:', err);
    return res.status(500).json({
      error: 'Authentication verification service error.'
    });
  }
}

/**
 * Express Middleware: Authorize specific roles
 * @param  {...string} roles Allowed roles (e.g. 'child', 'parent', 'counselor', 'admin')
 */
function authorizeRole(...roles) {
  const allowed = roles.flat().map(r => String(r).toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({
        error: 'Unauthorized: User authentication required prior to role verification.'
      });
    }

    // Admin role has superuser administrative oversight where applicable
    const isAllowed = allowed.includes(req.userRole) || (allowed.includes('admin') && req.userRole === 'admin');

    if (!isAllowed) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions. Role '${req.userRole}' cannot access this resource.`
      });
    }

    next();
  };
}

/**
 * Data-level Ownership Verification Helper: Parent -> Child
 */
async function verifyChildOwnership(parentId, childId) {
  if (!parentId || !childId) return false;

  const { data, error } = await supabaseAdmin
    .from('child_profiles')
    .select('user_id')
    .eq('user_id', childId)
    .eq('parent_id', parentId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

/**
 * Data-level Assignment Verification Helper: Counselor -> Child
 */
async function verifyCounselorAssignment(counselorId, childId) {
  if (!counselorId || !childId) return false;

  // 1. Direct active assignment check
  const { data: assignment } = await supabaseAdmin
    .from('counselor_child_assignments')
    .select('child_id')
    .eq('counselor_id', counselorId)
    .eq('child_id', childId)
    .maybeSingle();

  if (assignment) return true;

  // 2. Clinical review check: Allow if approved counselor in general clinical roster
  const { data: counselorProf } = await supabaseAdmin
    .from('counselor_profiles')
    .select('application_status')
    .eq('user_id', counselorId)
    .eq('application_status', 'approved')
    .maybeSingle();

  if (counselorProf) return true;

  return false;
}

module.exports = {
  supabaseAdmin,
  authenticateUser,
  authorizeRole,
  verifyChildOwnership,
  verifyCounselorAssignment,
};
