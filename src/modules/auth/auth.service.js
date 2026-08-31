/**
 * GroupSpace Authentication Service with Email Verification & Notifications
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('../../config/db.config');
const { JWT_SECRET } = require('../../middleware/auth.middleware');
const { isValidEmail, isValidPassword, sanitizeText } = require('../../utils/validation.util');
const { sendOtpEmail, sendWelcomeEmail } = require('../../utils/email.util');

function getInitials(name) {
  if (!name) return 'GS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates and emails a 6-digit verification code before registration.
 */
async function requestVerificationCode(email, type = 'SIGNUP') {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  if (type === 'SIGNUP') {
    // Check if user already exists
    const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
    if (existing) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
  } else if (type === 'RESET_PASSWORD') {
    // Check if user exists for password reset
    const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
    if (!existing) {
      throw new Error('No account found with this email address.');
    }
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Expire in 10 minutes (ISO string)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Remove previous codes for this email and type
  await sql`DELETE FROM email_verifications WHERE email = ${cleanEmail} AND type = ${type}`;

  // Store code in Neon PostgreSQL
  await sql`
    INSERT INTO email_verifications (email, otp_code, type, expires_at)
    VALUES (${cleanEmail}, ${code}, ${type}, ${expiresAt})
  `;

  // Send verification email via Nodemailer / Dev Simulator
  await sendOtpEmail({ to: cleanEmail, otpCode: code, type });

  return {
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    devCode: process.env.NODE_ENV === 'development' ? code : undefined
  };
}

/**
 * Validates a verification code.
 */
async function verifyCode(email, code, type = 'SIGNUP') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!cleanCode) {
    throw new Error('Verification code is required.');
  }

  const [record] = await sql`
    SELECT * FROM email_verifications
    WHERE email = ${cleanEmail} AND otp_code = ${cleanCode} AND type = ${type}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!record) {
    throw new Error('Invalid verification code. Please check your email or request a new code.');
  }

  const now = new Date();
  const expiry = new Date(record.expires_at);
  if (now > expiry) {
    throw new Error('Verification code has expired. Please request a new code.');
  }

  return true;
}

/**
 * Registers a new user. Validates code if verification code is provided.
 */
async function registerUser({ fullName, email, password, verificationCode, otpCode }) {
  const cleanName = sanitizeText(fullName);
  const cleanEmail = (email || '').trim().toLowerCase();
  const codeToVerify = verificationCode || otpCode;

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 6 characters.');
  }

  // If verification code is provided, verify it
  if (codeToVerify) {
    await verifyCode(cleanEmail, codeToVerify, 'SIGNUP');
  }

  // Check if user already exists
  const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const initials = getInitials(cleanName);

  const [newUser] = await sql`
    INSERT INTO users (full_name, email, password_hash, avatar_initials, status)
    VALUES (${cleanName}, ${cleanEmail}, ${passwordHash}, ${initials}, 'online')
    RETURNING id, full_name, email, avatar_initials, status, created_at
  `;

  const userId = Number(newUser.id);

  // Clean up used verification codes
  await sql`DELETE FROM email_verifications WHERE email = ${cleanEmail} AND type = 'SIGNUP'`;

  // Send Welcome confirmation email asynchronously
  sendWelcomeEmail({ to: cleanEmail, fullName: cleanName }).catch(err => console.error('Welcome email error:', err));

  const token = jwt.sign({ userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

  return {
    user: {
      id: userId,
      fullName: newUser.full_name,
      email: newUser.email,
      avatarInitials: newUser.avatar_initials,
      status: 'online'
    },
    token
  };
}

async function loginUser({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const [user] = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  // 1. Check if user account is currently locked out
  if (user.lockout_until) {
    const lockoutExpiry = new Date(user.lockout_until);
    const now = new Date();
    if (lockoutExpiry > now) {
      const remainingMs = lockoutExpiry.getTime() - now.getTime();
      const remainingSecs = Math.max(1, Math.ceil(remainingMs / 1000));
      const remainingMins = Math.ceil(remainingSecs / 60);
      const timeDisplay = remainingMins > 1 ? `${remainingMins} minutes` : `${remainingSecs} seconds`;

      const err = new Error(`Too many failed login attempts. Your account is temporarily locked for 10 minutes. Please try again in ${timeDisplay}.`);
      err.status = 429;
      err.isLocked = true;
      err.remainingSeconds = remainingSecs;
      throw err;
    } else {
      // Lockout window has elapsed, reset attempts
      await sql`UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ${user.id}`;
      user.failed_login_attempts = 0;
      user.lockout_until = null;
    }
  }

  // 2. Validate password against hashed password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const currentAttempts = (user.failed_login_attempts || 0) + 1;

    if (currentAttempts >= 3) {
      const lockoutUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await sql`
        UPDATE users
        SET failed_login_attempts = ${currentAttempts},
            lockout_until = ${lockoutUntil.toISOString()},
            last_failed_login = NOW()
        WHERE id = ${user.id}
      `;
      const err = new Error('Incorrect password. You have reached 3 failed attempts. Your account has been locked for 10 minutes. Please wait 10 minutes before trying again.');
      err.status = 429;
      err.isLocked = true;
      err.remainingSeconds = 600;
      throw err;
    } else {
      const attemptsLeft = 3 - currentAttempts;
      await sql`
        UPDATE users
        SET failed_login_attempts = ${currentAttempts},
            last_failed_login = NOW()
        WHERE id = ${user.id}
      `;
      const err = new Error(`Incorrect password. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before a 10-minute lockout.`);
      err.status = 401;
      err.attemptsLeft = attemptsLeft;
      throw err;
    }
  }

  // 3. On successful login: Reset failed attempts & clear lockout
  await sql`
    UPDATE users 
    SET failed_login_attempts = 0, 
        lockout_until = NULL, 
        last_failed_login = NULL, 
        status = 'online' 
    WHERE id = ${user.id}
  `;

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  return {
    user: {
      id: Number(user.id),
      fullName: user.full_name,
      email: user.email,
      avatarInitials: user.avatar_initials,
      status: 'online'
    },
    token
  };
}

/**
 * Resets user password using verified OTP code
 */
async function resetPasswordWithOtp({ email, otpCode, newPassword }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (otpCode || '').trim();

  if (!isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!isValidPassword(newPassword)) {
    throw new Error('New password must be at least 6 characters.');
  }

  await verifyCode(cleanEmail, cleanCode, 'RESET_PASSWORD');

  const [user] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
  if (!user) {
    throw new Error('User not found.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
  await sql`DELETE FROM email_verifications WHERE email = ${cleanEmail} AND type = 'RESET_PASSWORD'`;

  return { success: true, message: 'Password reset successfully. You can now log in.' };
}

async function getUserProfile(userId) {
  const [user] = await sql`
    SELECT id, full_name, email, avatar_initials, status, created_at
    FROM users
    WHERE id = ${userId}
  `;
  if (!user) {
    throw new Error('User not found.');
  }
  return {
    id: Number(user.id),
    fullName: user.full_name,
    email: user.email,
    avatarInitials: user.avatar_initials,
    status: user.status,
    createdAt: user.created_at
  };
}

async function updateStatus(userId, status) {
  await sql`UPDATE users SET status = ${status} WHERE id = ${userId}`;
  return { success: true, status };
}

module.exports = {
  requestVerificationCode,
  verifyCode,
  registerUser,
  loginUser,
  resetPasswordWithOtp,
  getUserProfile,
  updateStatus
};
