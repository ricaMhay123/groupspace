/**
 * GroupSpace Authentication Middleware
 * Validates JWT tokens from Authorization header or HTTP cookies.
 */

const jwt = require('jsonwebtoken');
const sql = require('../config/db.config');
const { HTTP_STATUS, SYSTEM_MESSAGES } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'groupspace_default_jwt_secret_dev';

async function authMiddleware(req, res, next) {
  let token = null;

  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: SYSTEM_MESSAGES.AUTH_REQUIRED
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Look up user in Neon PostgreSQL database
    const [user] = await sql`
      SELECT id, full_name, email, avatar_initials, status, created_at
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User account no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
