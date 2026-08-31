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
    const [member] = await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${userId}, ${role})
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
      ORDER BY gm.role DESC, u.full_name ASC
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
    return await sql`
      UPDATE group_members
      SET role = ${newRole}
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
  }
};

module.exports = GroupModel;
