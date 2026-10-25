/**
 * Personal Space Controller
 */

const personalService = require('./personal.service');
const { HTTP_STATUS } = require('../../config/constants');
const sql = require('../../config/db.config');

async function getItems(req, res) {
  try {
    const groupId = req.query.groupId || req.query.group_id;
    const items = await personalService.getPersonalItems(req.user.id, req.query.type, groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { type, title, content, amount, category, dueDate, groupId, group_id } = req.body;
    const item = await personalService.addPersonalItem({
      userId: req.user.id,
      groupId: groupId || group_id,
      type,
      title,
      content,
      amount,
      category,
      dueDate
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Added to your personal space.',
      data: item
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { title, content, status, amount, category } = req.body;
    const item = await personalService.updatePersonalItem({
      id: req.params.id,
      userId: req.user.id,
      title,
      content,
      status,
      amount,
      category
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Personal item updated.',
      data: item
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    await personalService.deletePersonalItem(req.params.id, req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Item removed from your personal space.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/personal/feed  (also aliased as /api/user/personal-feed)
 * Returns:
 *  - mentions: discussion_comments where content contains @username
 *  - pendingApprovals: tasks with status = 'PENDING_APPROVAL' for leaders
 *  - helpRequests: flagged tasks in groups where user is a member
 */
async function getPersonalFeed(req, res) {
  const userId = req.user.id;
  try {
    // Get all group IDs the user belongs to
    const memberships = await sql`
      SELECT gm.group_id, gm.role
      FROM group_members gm
      WHERE gm.user_id = ${userId}
    `;

    const userGroupIds = memberships.map(m => m.group_id);
    const userLeaderGroupIds = memberships.filter(m => m.role === 'leader').map(m => m.group_id);

    // If active workspace specified in query, scope strictly to it
    const requestedGroupId = req.query.groupId || req.query.group_id ? Number(req.query.groupId || req.query.group_id) : null;
    let targetGroupIds = userGroupIds;
    let targetLeaderGroupIds = userLeaderGroupIds;

    if (requestedGroupId) {
      if (!userGroupIds.includes(requestedGroupId)) {
        // User is not a member of the requested workspace
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          data: { pendingApprovals: [], helpRequests: [], mentions: [] }
        });
      }
      targetGroupIds = [requestedGroupId];
      targetLeaderGroupIds = userLeaderGroupIds.includes(requestedGroupId) ? [requestedGroupId] : [];
    }

    // Early return if user has no memberships or target is empty
    if (targetGroupIds.length === 0) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { pendingApprovals: [], helpRequests: [], mentions: [] }
      });
    }

    let pendingApprovals = [];
    let helpRequests = [];
    let mentions = [];

    // Pending approval tasks — only shown to leaders
    if (targetLeaderGroupIds.length > 0) {
      pendingApprovals = await sql`
        SELECT t.id, t.title, t.description, t.group_id,
               u.full_name AS creator_name, a.full_name AS assignee_name
        FROM tasks t
        LEFT JOIN users u ON t.created_by_user_id = u.id
        LEFT JOIN users a ON t.assigned_to_user_id = a.id
        WHERE t.status = 'PENDING_APPROVAL'
          AND t.group_id = ANY(${targetLeaderGroupIds}::int[])
        ORDER BY t.updated_at DESC
        LIMIT 20
      `;
    }

    // Flagged (help needed) tasks — shown to group members
    helpRequests = await sql`
      SELECT t.id, t.title, t.flagged_reason, t.group_id,
             a.full_name AS assignee_name
      FROM tasks t
      LEFT JOIN users a ON t.assigned_to_user_id = a.id
      WHERE t.is_flagged = TRUE
        AND t.group_id = ANY(${targetGroupIds}::int[])
        AND (t.assigned_to_user_id IS NULL OR t.assigned_to_user_id != ${userId})
      ORDER BY t.flagged_at DESC NULLS LAST
      LIMIT 20
    `;

    // @mentions in discussion comments (via discussion_mentions table or @username pattern)
    const fullName = (req.user.full_name || '').toLowerCase().trim();
    const handles = new Set([
      fullName.split(/\s+/)[0],
      fullName.replace(/\s+/g, ''),
      (req.user.email || '').split('@')[0].toLowerCase()
    ]);
    const patterns = [...handles].filter(Boolean).map(h => `%@${h}%`);

    mentions = await sql`
      SELECT dc.id, dc.content, dc.created_at,
             u.full_name AS author_name, d.group_id, d.title AS topic_title
      FROM discussion_comments dc
      JOIN discussions d ON dc.discussion_id = d.id
      JOIN users u ON dc.user_id = u.id
      WHERE d.group_id = ANY(${targetGroupIds}::int[])
        AND dc.user_id != ${userId}
        AND (
          EXISTS (
            SELECT 1 FROM discussion_mentions dm
            WHERE dm.comment_id = dc.id AND dm.mentioned_user_id = ${userId}
          )
          ${patterns.length > 0 ? sql`OR LOWER(dc.content) LIKE ANY(${patterns}::text[])` : sql``}
        )
      ORDER BY dc.created_at DESC
      LIMIT 20
    `;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        pendingApprovals,
        helpRequests,
        mentions
      }
    });
  } catch (error) {
    console.error('[PersonalFeed] Error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to load personal feed.'
    });
  }
}

module.exports = {
  getItems,
  create,
  update,
  remove,
  getPersonalFeed
};
