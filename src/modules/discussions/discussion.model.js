/**
 * Discussion & Activity Feed Data Model
 */

const sql = require('../../config/db.config');

const DiscussionModel = {
  async createTopic({ groupId, title, category, authorUserId }) {
    const [result] = await sql`
      INSERT INTO discussions (group_id, title, category, author_user_id)
      VALUES (${groupId}, ${title}, ${category || 'General'}, ${authorUserId})
      RETURNING id
    `;
    return Number(result.id);
  },

  async findById(id) {
    const [topic] = await sql`
      SELECT d.*, u.full_name as author_name, u.avatar_initials as author_initials
      FROM discussions d
      JOIN users u ON d.author_user_id = u.id
      WHERE d.id = ${id}
    `;
    return topic || null;
  },

  async findByGroup(groupId) {
    return await sql`
      SELECT d.*, u.full_name as author_name, u.avatar_initials as author_initials,
        (SELECT COUNT(*)::int FROM discussion_comments WHERE discussion_id = d.id) as comment_count,
        (SELECT MAX(created_at) FROM discussion_comments WHERE discussion_id = d.id) as last_activity_at
      FROM discussions d
      JOIN users u ON d.author_user_id = u.id
      WHERE d.group_id = ${groupId}
      ORDER BY COALESCE((SELECT MAX(created_at) FROM discussion_comments WHERE discussion_id = d.id), d.created_at) DESC
    `;
  },

  async addComment({ discussionId, userId, content }) {
    const [result] = await sql`
      INSERT INTO discussion_comments (discussion_id, user_id, content)
      VALUES (${discussionId}, ${userId}, ${content})
      RETURNING id
    `;
    return Number(result.id);
  },

  async getComments(discussionId) {
    return await sql`
      SELECT c.*, u.full_name as user_name, u.avatar_initials as user_initials
      FROM discussion_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.discussion_id = ${discussionId}
      ORDER BY c.created_at ASC
    `;
  },

  async deleteTopic(id) {
    return await sql`DELETE FROM discussions WHERE id = ${id}`;
  },

  async deleteComment(id) {
    return await sql`DELETE FROM discussion_comments WHERE id = ${id}`;
  },

  async getActivityFeed(groupId, limit = 25) {
    return await sql`
      SELECT al.*, u.full_name as user_name, u.avatar_initials as user_initials
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.group_id = ${groupId}
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;
  }
};

module.exports = DiscussionModel;
