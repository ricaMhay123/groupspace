/**
 * GroupSpace Authentication Service with Email Verification & Notifications
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('../../config/db.config');
const { JWT_SECRET } = require('../../middleware/auth.middleware');
const { isValidEmail, isValidPassword, isValidUsername, sanitizeText } = require('../../utils/validation.util');
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
async function requestVerificationCode(email, type = 'SIGNUP', username = null) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  if (type === 'SIGNUP') {
    // If username is provided, check if it's already taken
    if (username) {
      const cleanUsername = String(username).trim().toLowerCase();
      const [existingUserByUsername] = await sql`
        SELECT id FROM users 
        WHERE LOWER(username) = ${cleanUsername} 
           OR LOWER(full_name) = ${cleanUsername}
        LIMIT 1
      `;
      if (existingUserByUsername) {
        const err = new Error('This username is already taken. Please choose another username.');
        err.field = 'username';
        throw err;
      }
    }

    // Check if user already exists
    const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
    if (existing) {
      const err = new Error('This Gmail is already registered. Please login instead.');
      err.field = 'email';
      throw err;
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

  // Await email delivery
  let emailError = null;
  try {
    await sendOtpEmail({ to: cleanEmail, otpCode: code, type });
  } catch (err) {
    emailError = err.message;
    console.error(`⚠️ [Email Error] Could not deliver to ${cleanEmail}: ${err.message}`);
  }

  return {
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    devCode: code,
    emailError   // null on success, error string on failure
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
 * Registers a new user with a unique username. Validates code if verification code is provided.
 */
async function registerUser({ username, fullName, email, password, verificationCode, otpCode }) {
  const chosenName = (username || fullName || '').trim();
  const cleanUsername = sanitizeText(username || (fullName ? fullName.trim().replace(/\s+/g, '_').toLowerCase() : ''));
  const cleanFullName = sanitizeText(fullName || username);
  const cleanEmail = (email || '').trim().toLowerCase();
  const codeToVerify = verificationCode || otpCode;

  if (!cleanUsername || cleanUsername.length < 2) {
    const err = new Error('Username must be at least 2 characters.');
    err.field = 'username';
    throw err;
  }
  if (!isValidUsername(cleanUsername) && cleanUsername.length < 3) {
    const err = new Error('Username must be at least 3 characters.');
    err.field = 'username';
    throw err;
  }
  if (!isValidEmail(cleanEmail)) {
    const err = new Error('Please provide a valid email address.');
    err.field = 'email';
    throw err;
  }
  if (!isValidPassword(password)) {
    const err = new Error('Password must be at least 6 characters.');
    err.field = 'password';
    throw err;
  }

  // Verification code is REQUIRED — never allow skipping email verification
  if (!codeToVerify) {
    throw new Error('Email verification code is required. Please complete the verification step first.');
  }
  await verifyCode(cleanEmail, codeToVerify, 'SIGNUP');

  // Check if username already exists across all users (case-insensitive)
  const [existingUserByUsername] = await sql`
    SELECT id FROM users 
    WHERE LOWER(username) = ${cleanUsername.toLowerCase()} 
       OR LOWER(full_name) = ${cleanUsername.toLowerCase()}
    LIMIT 1
  `;
  if (existingUserByUsername) {
    const err = new Error('This username is already taken. Please choose another username.');
    err.field = 'username';
    throw err;
  }

  // Check if user already exists
  const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
  if (existing) {
    const err = new Error('This Gmail is already registered. Please login instead.');
    err.field = 'email';
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const initials = getInitials(cleanFullName || cleanUsername);

  const [newUser] = await sql`
    INSERT INTO users (username, full_name, email, password_hash, avatar_initials, status)
    VALUES (${cleanUsername}, ${cleanFullName}, ${cleanEmail}, ${passwordHash}, ${initials}, 'online')
    RETURNING id, username, full_name, email, avatar_initials, status, created_at
  `;

  const userId = Number(newUser.id);

  // Clean up used verification codes
  await sql`DELETE FROM email_verifications WHERE email = ${cleanEmail} AND type = 'SIGNUP'`;

  // Send Welcome confirmation email asynchronously
  sendWelcomeEmail({ to: cleanEmail, fullName: cleanFullName, username: cleanUsername }).catch(err => console.error('Welcome email error:', err));

  const token = jwt.sign({ userId: Number(userId), email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

  return {
    user: {
      id: userId,
      username: newUser.username || cleanUsername,
      fullName: newUser.full_name || cleanFullName,
      email: newUser.email,
      avatarInitials: newUser.avatar_initials,
      status: 'online'
    },
    token
  };
}

async function loginUser({ email, username, password }) {
  const identifier = (email || username || '').trim();
  const cleanEmail = identifier.toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Email/username and password are required.');
  }

  const [user] = await sql`
    SELECT * FROM users 
    WHERE email = ${cleanEmail} 
       OR LOWER(username) = ${cleanEmail}
    LIMIT 1
  `;
  if (!user) {
    const err = new Error('No account found with these credentials.');
    err.field = 'email';
    err.status = 401;
    throw err;
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
      err.field = 'password';
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
      err.field = 'password';
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
      username: user.username || user.full_name,
      fullName: user.full_name || user.username,
      email: user.email,
      avatarInitials: user.avatar_initials,
      avatarColor: user.avatar_color || '#4f46e5',
      statusMessage: user.status_message || '',
      avatarUrl: user.avatar_url || '',
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
    SELECT id, username, full_name, email, avatar_initials, status, avatar_color, status_message, avatar_url, created_at
    FROM users
    WHERE id = ${userId}
  `;
  if (!user) {
    throw new Error('User not found.');
  }
  const displayName = user.username || user.full_name;
  return {
    id: Number(user.id),
    username: displayName,
    fullName: user.full_name || displayName,
    email: user.email,
    avatarInitials: user.avatar_initials,
    status: user.status,
    avatarColor: user.avatar_color || '#4f46e5',
    statusMessage: user.status_message || '',
    avatarUrl: user.avatar_url || '',
    createdAt: user.created_at
  };
}

async function updateUserProfile(userId, { username, fullName, avatarColor, statusMessage, avatarUrl }) {
  const rawName = (username || fullName || '').trim();
  if (!rawName) {
    throw new Error('Username / display name cannot be blank.');
  }
  const cleanName = sanitizeText(rawName);

  // If changing username/name, ensure it is unique among all other users
  const [existingUser] = await sql`
    SELECT id FROM users 
    WHERE (LOWER(username) = ${cleanName.toLowerCase()} OR LOWER(full_name) = ${cleanName.toLowerCase()})
      AND id != ${userId}
    LIMIT 1
  `;
  if (existingUser) {
    const err = new Error('This username is already taken by another user.');
    err.field = 'username';
    throw err;
  }

  const initials = getInitials(cleanName);
  const cleanColor = (avatarColor || '#4f46e5').trim();
  const cleanStatus = statusMessage !== undefined ? statusMessage.trim() : '';
  const cleanAvatarUrl = avatarUrl !== undefined ? (typeof avatarUrl === 'string' ? avatarUrl.trim() : '') : null;

  let updated;
  if (cleanAvatarUrl !== null) {
    [updated] = await sql`
      UPDATE users
      SET username = ${cleanName},
          full_name = ${cleanName},
          avatar_initials = ${initials},
          avatar_color = ${cleanColor},
          status_message = ${cleanStatus},
          avatar_url = ${cleanAvatarUrl}
      WHERE id = ${userId}
      RETURNING id, username, full_name, email, avatar_initials, status, avatar_color, status_message, avatar_url, created_at
    `;
  } else {
    [updated] = await sql`
      UPDATE users
      SET username = ${cleanName},
          full_name = ${cleanName},
          avatar_initials = ${initials},
          avatar_color = ${cleanColor},
          status_message = ${cleanStatus}
      WHERE id = ${userId}
      RETURNING id, username, full_name, email, avatar_initials, status, avatar_color, status_message, avatar_url, created_at
    `;
  }

  if (!updated) {
    throw new Error('User account not found.');
  }

  const displayName = updated.username || updated.full_name;
  return {
    id: Number(updated.id),
    username: displayName,
    fullName: updated.full_name || displayName,
    email: updated.email,
    avatarInitials: updated.avatar_initials,
    status: updated.status,
    avatarColor: updated.avatar_color || '#4f46e5',
    statusMessage: updated.status_message || '',
    avatarUrl: updated.avatar_url || '',
    createdAt: updated.created_at
  };
}

async function updateStatus(userId, status) {
  await sql`UPDATE users SET status = ${status} WHERE id = ${userId}`;
  return { success: true, status };
}

/**
 * Checks if a username meets format requirements and is not already taken.
 * Case-insensitive query against the users table.
 */
async function checkUsernameAvailability(username) {
  const cleanUsername = (username || '').trim();

  if (!cleanUsername) {
    return { available: false, status: 'empty', message: '' };
  }
  if (!isValidUsername(cleanUsername)) {
    return {
      available: false,
      status: 'invalid',
      message: 'Username must be 3-30 characters with letters, numbers, underscores, hyphens, or periods (no spaces).'
    };
  }

  const [existing] = await sql`
    SELECT id FROM users 
    WHERE LOWER(username) = ${cleanUsername.toLowerCase()} 
       OR LOWER(full_name) = ${cleanUsername.toLowerCase()}
    LIMIT 1
  `;
  if (existing) {
    return {
      available: false,
      status: 'taken',
      message: 'This username is already taken. Please choose another username.'
    };
  }

  return {
    available: true,
    status: 'available',
    message: 'Username is available.'
  };
}

/**
 * Checks if a Gmail address is valid format and whether it is already registered.
 * Lightweight — no OTP generation, no side effects.
 */
async function checkEmailAvailability(email) {
  const GMAIL_RE = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return { available: false, status: 'empty', message: '' };
  }
  if (!GMAIL_RE.test(cleanEmail)) {
    return { available: false, status: 'invalid', message: 'Only @gmail.com email addresses are accepted.' };
  }

  const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
  if (existing) {
    return { available: false, status: 'taken', message: 'This Gmail is already registered. Please login instead.' };
  }
  return { available: true, status: 'available', message: 'Email is available.' };
}

/**
 * Permanently deletes the authenticated user's account after a double
 * password confirmation. Related rows are handled by the schema's FKs
 * (ON DELETE CASCADE for memberships/personal items, SET NULL for authorship
 * on tasks, groups, activity logs, etc.).
 */
async function deleteAccount({ userId, password, confirmPassword }) {
  const fail = (message, status) => {
    const err = new Error(message);
    err.status = status;
    return err;
  };

  if (!password || !confirmPassword) {
    throw fail('Password and confirmation are required.', 400);
  }
  if (password !== confirmPassword) {
    throw fail('Passwords do not match.', 400);
  }

  const [user] = await sql`SELECT id, password_hash FROM users WHERE id = ${userId}`;
  if (!user) throw fail('User account no longer exists.', 404);

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw fail('Incorrect password', 401);

  // Never leave a workspace without a leader: promote the longest-standing member.
  const ledGroups = await sql`
    SELECT group_id FROM group_members WHERE user_id = ${userId} AND role = 'leader'
  `;
  for (const { group_id } of ledGroups) {
    const [otherLeader] = await sql`
      SELECT id FROM group_members
      WHERE group_id = ${group_id} AND role = 'leader' AND user_id <> ${userId}
      LIMIT 1
    `;
    if (otherLeader) continue;
    const [heir] = await sql`
      SELECT user_id FROM group_members
      WHERE group_id = ${group_id} AND user_id <> ${userId}
      ORDER BY joined_at ASC LIMIT 1
    `;
    if (heir) {
      await sql`
        UPDATE group_members SET role = 'leader'
        WHERE group_id = ${group_id} AND user_id = ${heir.user_id}
      `;
    }
  }

  await sql`DELETE FROM users WHERE id = ${userId}`;
  return { success: true };
}

module.exports = {
  requestVerificationCode,
  verifyCode,
  registerUser,
  loginUser,
  resetPasswordWithOtp,
  getUserProfile,
  updateUserProfile,
  updateStatus,
  checkUsernameAvailability,
  checkEmailAvailability,
  deleteAccount
};
