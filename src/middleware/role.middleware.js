/**
 * GroupSpace Role Middleware
 * Validates group membership and leader permissions.
 */

const sql = require('../config/db.config');
const { ROLES, HTTP_STATUS, SYSTEM_MESSAGES } = require('../config/constants');

/**
 * Middleware ensuring user is a member of the group specified in req.params.groupId (or req.body.groupId)
 */
async function requireGroupMembership(req, res, next) {
  const groupId = req.params.groupId || req.params.id || req.body.groupId;
  const userId = req.user && req.user.id;

  if (!groupId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Workspace ID is required.'
    });
  }

  if (!userId) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: SYSTEM_MESSAGES.AUTH_REQUIRED
    });
  }

  try {
    // Fetch group
    const [group] = await sql`
      SELECT * FROM groups WHERE id = ${groupId}
    `;

    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: SYSTEM_MESSAGES.GROUP_NOT_FOUND
      });
    }

    // Fetch membership
    const [membership] = await sql`
      SELECT * FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    if (!membership) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: SYSTEM_MESSAGES.USER_NOT_IN_GROUP
      });
    }

    req.group = group;
    req.membership = membership;
    req.isLeader = membership.role === ROLES.LEADER;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error validating workspace permissions.'
    });
  }
}

/**
 * Middleware ensuring user is a workspace LEADER
 */
async function requireGroupLeader(req, res, next) {
  if (!req.membership) {
    return requireGroupMembership(req, res, () => {
      if (!req.isLeader) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: SYSTEM_MESSAGES.LEADER_REQUIRED
        });
      }
      next();
    });
  }

  if (!req.isLeader) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: SYSTEM_MESSAGES.LEADER_REQUIRED
    });
  }
  next();
}

module.exports = {
  requireGroupMembership,
  requireGroupLeader
};
