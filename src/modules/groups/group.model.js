/**
 * Group / Workspace Data Model
 */

const sql = require('../../config/db.config');

const GroupModel = {
  async create({ name, description, joinCode, category, privacy, theme, createdByUserId }) {
    const [result] = await sql`
      INSERT INTO groups (name, description, join_code, category, privacy, theme, created_by_user_id)
      VALUES (${name}, ${description}, ${joinCode}, ${category || 'School Project'}, ${privacy || 'public'}, ${theme || 'green'}, ${createdByUserId})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findById(id) {
    const [group] = await sql`SELECT * FROM groups WHERE id = ${id}`;
    return group || null;
  },

  async findByJoinCode(code) {
    const [group] = await sql`SELECT * FROM groups WHERE LOWER(join_code) = LOWER(${code})`;
    return group || null;
  },

  async addMember({ groupId, userId, role }) {
    const normalizedRole = String(role || 'member').toLowerCase();
    const [member] = await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${userId}, ${normalizedRole})
      RETURNING *
    `;
    return member;
  },

  async findMember(groupId, userId) {
    const [member] = await sql`
      SELECT * FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    return member || null;
  },

  async findMembersByGroup(groupId) {
    return await sql`
      SELECT gm.id as membership_id, gm.role, gm.joined_at, u.id as user_id, u.full_name, u.email, u.avatar_initials, u.status
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId}
      ORDER BY (gm.role = 'leader') DESC, (gm.role = 'co_leader') DESC, u.full_name ASC
    `;
  },

  async findGroupsByUser(userId) {
    return await sql`
      SELECT g.*, gm.role, gm.joined_at,
        (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT COUNT(*)::int FROM tasks WHERE group_id = g.id AND status != 'DONE') as pending_task_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ${userId}
      ORDER BY g.created_at DESC
    `;
  },

  async updateMemberRole(groupId, userId, newRole) {
    const normalizedRole = String(newRole).toLowerCase();
    return await sql`
      UPDATE group_members
      SET role = ${normalizedRole}
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
  },

  async removeMember(groupId, userId) {
    return await sql`
      DELETE FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
  },

  async logActivity({ groupId, userId, actionType, description }) {
    return await sql`
      INSERT INTO activity_logs (group_id, user_id, action_type, description)
      VALUES (${groupId}, ${userId}, ${actionType}, ${description})
    `;
  },

  async getActivity(groupId, limit = 20) {
    return await sql`
      SELECT al.*, u.full_name, u.avatar_initials
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.group_id = ${groupId}
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;
  },

  async updateWorkspace(groupId, { name, settings }) {
    if (name && settings !== undefined) {
      const [updated] = await sql`
        UPDATE groups
        SET name = ${name}, settings = ${JSON.stringify(settings)}
        WHERE id = ${groupId}
        RETURNING *
      `;
      return updated;
    } else if (name) {
      const [updated] = await sql`
        UPDATE groups
        SET name = ${name}
        WHERE id = ${groupId}
        RETURNING *
      `;
      return updated;
    } else if (settings !== undefined) {
      const [updated] = await sql`
        UPDATE groups
        SET settings = ${JSON.stringify(settings)}
        WHERE id = ${groupId}
        RETURNING *
      `;
      return updated;
    }
    return await this.findById(groupId);
  },

  async updateJoinCode(groupId, joinCode) {
    const [updated] = await sql`
      UPDATE groups
      SET join_code = ${joinCode}
      WHERE id = ${groupId}
      RETURNING *
    `;
    return updated;
  },

  async createLeadershipRequest({ groupId, userId, message }) {
    const [row] = await sql`
      INSERT INTO leadership_requests (group_id, user_id, message, status)
      VALUES (${groupId}, ${userId}, ${message}, 'pending_leader_request')
      RETURNING *
    `;
    return row;
  },

  async findPendingLeadershipRequest(groupId, userId) {
    const [row] = await sql`
      SELECT * FROM leadership_requests
      WHERE group_id = ${groupId} AND user_id = ${userId} AND status = 'pending_leader_request'
    `;
    return row || null;
  },

  async findLeadershipRequest(groupId, requestId) {
    const [row] = await sql`
      SELECT * FROM leadership_requests WHERE id = ${requestId} AND group_id = ${groupId}
    `;
    return row || null;
  },

  async resolveLeadershipRequest(requestId, status, resolvedByUserId) {
    return await sql`
      UPDATE leadership_requests
      SET status = ${status}, resolved_by_user_id = ${resolvedByUserId}, resolved_at = NOW()
      WHERE id = ${requestId}
    `;
  },

  async createPersonalFeedNotification({ userId, groupId, authorUserId, content, type }) {
    try {
      await sql`
        INSERT INTO personal_feed (user_id, group_id, author_user_id, content, type)
        VALUES (${userId}, ${groupId}, ${authorUserId}, ${content}, ${type || 'leadership_decision'})
      `;
    } catch (e) {
      // gracefully ignore if personal_feed is unavailable
    }
  },

  async deleteWorkspace(groupId) {
    return await sql`DELETE FROM groups WHERE id = ${groupId}`;
  }
};

module.exports = GroupModel;
