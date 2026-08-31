/**
 * GroupSpace Input Sanitization & Validation Utilities
 */

/**
 * Validates email format.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Validates password strength (minimum 6 characters).
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Sanitizes input text to prevent simple script injection.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '');
}

/**
 * Generates an uppercase alphanumeric workspace join code (e.g. GS-7X9B2K).
 */
function generateJoinCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GS-';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates and formats join code.
 */
function formatJoinCode(code) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Validates positive monetary amount.
 */
function isValidAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
}

module.exports = {
  isValidEmail,
  isValidPassword,
  sanitizeText,
  generateJoinCode,
  formatJoinCode,
  isValidAmount
};
