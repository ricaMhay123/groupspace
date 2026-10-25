/**
 * Discussion & Activity Feed Data Model
 */

const sql = require('../../config/db.config');

const DiscussionModel = {
  async createTopic({ groupId, title, category, authorUserId, attachments = [] }) {
    const jsonAttachments = JSON.stringify(Array.isArray(attachments) ? attachments : []);
    const [result] = await sql`
      INSERT INTO discussions (group_id, title, category, author_user_id, attachments)
      VALUES (${groupId}, ${title}, ${category || 'General'}, ${authorUserId}, ${jsonAttachments}::jsonb)
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

  /** Topic lookup that is scoped to a workspace in SQL (never returns another group's topic). */
  async findByIdInGroup(id, groupId) {
    const [topic] = await sql`
      SELECT d.*, u.full_name as author_name, u.avatar_initials as author_initials
      FROM discussions d
      JOIN users u ON d.author_user_id = u.id
      WHERE d.id = ${id} AND d.group_id = ${groupId}
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

  async addComment({ discussionId, userId, content, attachments = [] }) {
    const jsonAttachments = JSON.stringify(Array.isArray(attachments) ? attachments : []);
    const [result] = await sql`
      INSERT INTO discussion_comments (discussion_id, user_id, content, attachments)
      VALUES (${discussionId}, ${userId}, ${content}, ${jsonAttachments}::jsonb)
      RETURNING id
    `;
    return Number(result.id);
  },

  async getComments(discussionId, groupId) {
    return await sql`
      SELECT c.*, u.full_name as user_name, u.avatar_initials as user_initials
      FROM discussion_comments c
      JOIN discussions d ON d.id = c.discussion_id
      JOIN users u ON c.user_id = u.id
      WHERE c.discussion_id = ${discussionId} AND d.group_id = ${groupId}
      ORDER BY c.created_at ASC
    `;
  },

  // ─── Workspace-limited mention helpers ────────────────────────────────────

  /** Users enrolled in the workspace (group_members), optionally filtered by name. */
  async findMentionableUsers(groupId, q = '') {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    return await sql`
      SELECT u.id, u.full_name AS name, u.avatar_initials
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
        AND LOWER(u.full_name) LIKE ${pattern}
      ORDER BY u.full_name ASC
      LIMIT 8
    `;
  },

  /** Active (not DONE) board tasks of the workspace, optionally filtered by title. */
  async findMentionableTasks(groupId, q = '') {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    return await sql`
      SELECT id, title
      FROM tasks
      WHERE group_id = ${groupId}
        AND status <> 'DONE'
        AND LOWER(title) LIKE ${pattern}
      ORDER BY updated_at DESC
      LIMIT 8
    `;
  },

  /** Discussion topics of the workspace, optionally filtered by title. */
  async findMentionableTopics(groupId, q = '') {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    return await sql`
      SELECT d.id, d.title, d.category, d.author_user_id, u.full_name as author_name
      FROM discussions d
      LEFT JOIN users u ON d.author_user_id = u.id
      WHERE d.group_id = ${groupId}
        AND LOWER(d.title) LIKE ${pattern}
      ORDER BY d.created_at DESC
      LIMIT 8
    `;
  },

  /** All members enrolled in the workspace (no pagination/limit, for complete mention parsing). */
  async getAllGroupMembers(groupId) {
    return await sql`
      SELECT u.id, u.full_name AS name, u.avatar_initials
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY u.full_name ASC
    `;
  },

  /** All topics in the workspace (for complete mention parsing). */
  async getAllGroupTopics(groupId) {
    return await sql`
      SELECT d.id, d.title, d.category, d.author_user_id
      FROM discussions d
      WHERE d.group_id = ${groupId}
      ORDER BY d.created_at DESC
    `;
  },

  /** All active tasks in the workspace (for complete mention parsing). */
  async getAllGroupTasks(groupId) {
    return await sql`
      SELECT id, title, assigned_to_user_id
      FROM tasks
      WHERE group_id = ${groupId} AND status <> 'DONE'
      ORDER BY updated_at DESC
    `;
  },

  /** Keep only the given user ids that really belong to the workspace. */
  async filterGroupUsers(groupId, userIds) {
    if (!userIds.length) return [];
    return await sql`
      SELECT u.id, u.full_name
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId} AND u.id = ANY(${userIds}::int[])
    `;
  },

  /** Keep only the given task ids that really belong to the workspace. */
  async filterGroupTasks(groupId, taskIds) {
    if (!taskIds.length) return [];
    return await sql`
      SELECT id, title, assigned_to_user_id
      FROM tasks
      WHERE group_id = ${groupId} AND id = ANY(${taskIds}::int[])
    `;
  },

  async addMention({ groupId, discussionId, commentId, mentionedUserId = null, taskId = null, mentionedTopicId = null, authorUserId = null }) {
    return await sql`
      INSERT INTO discussion_mentions
        (group_id, discussion_id, comment_id, mentioned_user_id, task_id, mentioned_topic_id, author_user_id)
      VALUES
        (${groupId}, ${discussionId}, ${commentId}, ${mentionedUserId}, ${taskId}, ${mentionedTopicId}, ${authorUserId})
    `;
  },

  async deleteTopic(id) {
    return await sql`DELETE FROM discussions WHERE id = ${id}`;
  },

  async findCommentById(id) {
    const [row] = await sql`
      SELECT c.*, d.group_id
      FROM discussion_comments c
      JOIN discussions d ON c.discussion_id = d.id
      WHERE c.id = ${id}
    `;
    return row || null;
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
