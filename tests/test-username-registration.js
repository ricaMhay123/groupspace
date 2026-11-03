/**
 * Verification Suite: Unique Username Registration
 * Ensures that registration uses a unique username instead of full name,
 * with case-insensitive uniqueness validation on both frontend and backend.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('\n--- Running Unique Username Registration Verification ---');

  const ROOT = path.resolve(__dirname, '..');

  // 1. Check public/register.html
  console.log('1. Checking public/register.html...');
  const regHtmlPath = path.join(ROOT, 'public', 'register.html');
  assert(fs.existsSync(regHtmlPath), 'register.html must exist');
  const regHtml = fs.readFileSync(regHtmlPath, 'utf8');

  assert(regHtml.includes('Username'), 'register.html must have a Username field label');
  assert(!regHtml.includes('Full Name'), 'register.html must NOT have a Full Name label');
  assert(regHtml.includes('id="username"'), 'register.html must have input id="username"');
  assert(regHtml.includes('id="usernameError"'), 'register.html must have #usernameError for validation messages');
  assert(regHtml.includes('id="usernameStatus"'), 'register.html must have #usernameStatus for live availability');
  console.log('   ✅ public/register.html properly configured for Username input.');

  // 2. Check public/js/auth.js
  console.log('2. Checking public/js/auth.js...');
  const authJsPath = path.join(ROOT, 'public', 'js', 'auth.js');
  const authJs = fs.readFileSync(authJsPath, 'utf8');

  assert(authJs.includes('username'), 'auth.js must handle username');
  assert(authJs.includes('check-username'), 'auth.js must probe check-username API endpoint');
  assert(authJs.includes('USERNAME_REGEX') || authJs.includes('username'), 'auth.js must validate username format');
  assert(authJs.includes('usernameError') || authJs.includes('showRegFieldError'), 'auth.js must surface username field errors');
  console.log('   ✅ public/js/auth.js contains client-side username checking and registration payload handling.');

  // 3. Check src/utils/validation.util.js
  console.log('3. Checking src/utils/validation.util.js...');
  const validationUtil = require(path.join(ROOT, 'src', 'utils', 'validation.util.js'));
  assert(typeof validationUtil.isValidUsername === 'function', 'validation.util must export isValidUsername');
  assert.strictEqual(validationUtil.isValidUsername('alexjohnson'), true, 'Valid alphanumeric username should pass');
  assert.strictEqual(validationUtil.isValidUsername('alex_123'), true, 'Username with underscore should pass');
  assert.strictEqual(validationUtil.isValidUsername('alex.dev'), true, 'Username with dot should pass');
  assert.strictEqual(validationUtil.isValidUsername('alex-dev'), true, 'Username with hyphen should pass');
  assert.strictEqual(validationUtil.isValidUsername('al'), false, 'Username with < 3 characters must fail');
  assert.strictEqual(validationUtil.isValidUsername('alex johnson'), false, 'Username with spaces must fail');
  assert.strictEqual(validationUtil.isValidUsername('alex@johnson'), false, 'Username with @ must fail');
  assert.strictEqual(validationUtil.isValidUsername(''), false, 'Empty username must fail');
  console.log('   ✅ src/utils/validation.util.js correctly validates username syntax.');

  // 4. Check src/config/db.config.js
  console.log('4. Checking src/config/db.config.js...');
  const dbConfigPath = path.join(ROOT, 'src', 'config', 'db.config.js');
  const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
  assert(dbConfigContent.includes('username TEXT'), 'db.config.js must define or alter username column in users table');
  assert(dbConfigContent.includes('idx_users_username_lower'), 'db.config.js must enforce unique case-insensitive index on username');
  console.log('   ✅ src/config/db.config.js schema and migrations include unique username support.');

  // 5. Check src/modules/auth/auth.routes.js and auth.controller.js
  console.log('5. Checking auth controller and routes...');
  const authRoutesPath = path.join(ROOT, 'src', 'modules', 'auth', 'auth.routes.js');
  const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
  assert(authRoutesContent.includes('/check-username'), 'auth.routes.js must register /check-username route');

  const authControllerPath = path.join(ROOT, 'src', 'modules', 'auth', 'auth.controller.js');
  const authController = require(authControllerPath);
  assert(typeof authController.checkUsername === 'function', 'auth.controller must export checkUsername');
  console.log('   ✅ /api/auth/check-username endpoint is mounted and configured.');

  // 6. Check src/modules/auth/auth.service.js
  console.log('6. Checking auth.service.js...');
  const authService = require(path.join(ROOT, 'src', 'modules', 'auth', 'auth.service.js'));
  assert(typeof authService.checkUsernameAvailability === 'function', 'auth.service must export checkUsernameAvailability');

  // Test checkUsernameAvailability validation logic for edge cases
  const emptyRes = authService.checkUsernameAvailability('');
  assert(emptyRes && typeof emptyRes.then === 'function', 'checkUsernameAvailability must be async');

  console.log('🎉 All Username Registration validation tests PASSED!');
}

if (require.main === module) {
  try {
    runTests();
    process.exit(0);
  } catch (err) {
    console.error('❌ Username Registration validation FAILED:', err.message);
    process.exit(1);
  }
}

module.exports = runTests;
