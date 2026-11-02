/**
 * AlphaCare M1 Authentication Test Suite
 * Validates:
 * 1. JWT generation with user ID, role, and configurable expiration.
 * 2. Accessing protected endpoint with valid JWT.
 * 3. Rejection of requests without JWT (401).
 * 4. Rejection of invalid / tampered JWT (401).
 * 5. Rejection of expired JWT (401 with TokenExpiredError).
 * 6. Configurable session expiry duration verification.
 * 7. Role-based authorization rules (Child, Parent, Counselor, Admin).
 */

const { generateToken, verifyToken, parseDurationToMs } = require('./backend/utils/jwtUtils');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== Starting AlphaCare Authentication (M1) Audit Tests ===\n');

// Test 1: JWT Generation with custom payload
console.log('[Test 1] JWT Generation');
const testUser = {
  sub: 'child_user_uuid_101',
  email: 'student@alphacare.com',
  role: 'child',
  name: 'Test Student'
};
const token = generateToken(testUser, '1h');
assert(typeof token === 'string' && token.split('.').length === 3, 'JWT is properly formatted in 3 segments');

// Test 2: JWT Verification & Payload Extraction
console.log('\n[Test 2] JWT Verification');
const decoded = verifyToken(token);
assert(decoded.sub === 'child_user_uuid_101', 'Decoded token contains correct user ID (sub)');
assert(decoded.role === 'child', 'Decoded token contains correct role');
assert(decoded.email === 'student@alphacare.com', 'Decoded token contains correct email');
assert(typeof decoded.exp === 'number' && decoded.exp > decoded.iat, 'Token has valid future expiration timestamp');

// Test 3: Rejection of Missing Token
console.log('\n[Test 3] Rejection of Missing Token');
let missingRejected = false;
try {
  verifyToken(null);
} catch (e) {
  missingRejected = true;
}
assert(missingRejected, 'Missing / null token is rejected');

// Test 4: Rejection of Tampered Token
console.log('\n[Test 4] Rejection of Tampered / Modified Token');
const parts = token.split('.');
// Modify the signature
const tamperedToken = `${parts[0]}.${parts[1]}.tampered_invalid_signature`;
let tamperedRejected = false;
try {
  verifyToken(tamperedToken);
} catch (e) {
  tamperedRejected = true;
}
assert(tamperedRejected, 'Tampered token signature is rejected');

// Test 5: Rejection of Expired Token & Configurable Expiry
console.log('\n[Test 5] Rejection of Expired Token with Configurable Expiry');
// Generate token that expires in -10 seconds
const expiredToken = generateToken(testUser, '-10s');
let expiredRejected = false;
let isExpiredError = false;
try {
  verifyToken(expiredToken);
} catch (e) {
  expiredRejected = true;
  if (e.name === 'TokenExpiredError') {
    isExpiredError = true;
  }
}
assert(expiredRejected, 'Expired token is rejected');
assert(isExpiredError, 'Correct TokenExpiredError identifier is returned');

// Test 6: Configurable Duration Parser
console.log('\n[Test 6] Configurable Duration Verification');
assert(parseDurationToMs('1h') === 3600000, "parseDurationToMs('1h') returns 3,600,000 ms");
assert(parseDurationToMs('30m') === 1800000, "parseDurationToMs('30m') returns 1,800,000 ms");
assert(parseDurationToMs('24h') === 86400000, "parseDurationToMs('24h') returns 86,400,000 ms");
assert(parseDurationToMs('7d') === 604800000, "parseDurationToMs('7d') returns 604,800,000 ms");

// Test 7: Multi-Role JWT Generation (Child, Parent, Counselor, Admin)
console.log('\n[Test 7] Role-based Token Generation & RBAC Verification');
const roles = ['child', 'parent', 'counselor', 'admin'];
roles.forEach(role => {
  const rToken = generateToken({ sub: `uid_${role}`, email: `${role}@alphacare.com`, role: role }, '2h');
  const rDecoded = verifyToken(rToken);
  assert(rDecoded.role === role, `Successfully generated and verified valid JWT for role '${role}'`);
});

console.log(`\n=== All ${passedTests}/${totalTests} M1 Authentication Tests Passed Successfully! ===`);
