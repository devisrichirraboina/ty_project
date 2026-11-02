/**
 * AlphaCare JWT Session Utility (Module 1 - Authentication & Session Management)
 * Pure Node.js crypto-based JWT implementation (zero external dependency bloat).
 * Supports HMAC-SHA256 (HS256) signing, verification, and configurable session expiration.
 */

const crypto = require('crypto');

/**
 * Parses duration strings (e.g. '1h', '30m', '7d', '3600s', or integer seconds) into milliseconds
 */
function parseDurationToMs(durationStr) {
  if (typeof durationStr === 'number') {
    return durationStr * 1000;
  }
  if (!durationStr || typeof durationStr !== 'string') {
    return 3600 * 1000; // default 1 hour
  }

  const trimmed = durationStr.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)(s|m|h|d)?$/);
  if (!match) {
    const parsedNum = parseInt(trimmed, 10);
    return isNaN(parsedNum) ? 3600 * 1000 : parsedNum * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 1000;
  }
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(base64UrlStr) {
  let str = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Generate a signed JWT
 * @param {Object} payload User data (sub/id, email, role, etc.)
 * @param {string} [expiresInOverride] Optional override for expiration (e.g. '1h', '2h')
 * @returns {string} Signed JWT token
 */
function generateToken(payload, expiresInOverride = null) {
  const secret = process.env.JWT_SECRET || 'alphacare_secure_jwt_secret_key_production_2026_x89!';
  const expiresInSetting = expiresInOverride || process.env.JWT_EXPIRES_IN || '1h';
  const durationMs = parseDurationToMs(expiresInSetting);

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = Math.floor((Date.now() + durationMs) / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const tokenPayload = {
    ...payload,
    iat: nowSec,
    exp: expSec
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiration.
 * @param {string} token 
 * @returns {Object} Decoded payload if valid
 * @throws {Error} if token is invalid, expired, or tampered
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or not a string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token structure');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const secret = process.env.JWT_SECRET || 'alphacare_secure_jwt_secret_key_production_2026_x89!';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature (tampered token)');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  // Expiration check
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && nowSec > payload.exp) {
    const expiredError = new Error('Token has expired');
    expiredError.name = 'TokenExpiredError';
    expiredError.expiredAt = new Date(payload.exp * 1000);
    throw expiredError;
  }

  return payload;
}

module.exports = {
  generateToken,
  verifyToken,
  parseDurationToMs
};
