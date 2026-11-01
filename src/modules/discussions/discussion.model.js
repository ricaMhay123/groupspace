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

  async addComment({ discussionId, userId, content, attachments = [], parentCommentId = null }) {
    const jsonAttachments = JSON.stringify(Array.isArray(attachments) ? attachments : []);
    const [result] = await sql`
      INSERT INTO discussion_comments (discussion_id, user_id, content, attachments, parent_comment_id)
      VALUES (${discussionId}, ${userId}, ${content}, ${jsonAttachments}::jsonb, ${parentCommentId})
      RETURNING id
    `;
    return Number(result.id);
  },

  /** Find a comment only if it belongs to the given discussion. */
  async findCommentInDiscussion(commentId, discussionId) {
    const [row] = await sql`
      SELECT id FROM discussion_comments
      WHERE id = ${commentId} AND discussion_id = ${discussionId}
    `;
    return row || null;
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

  /**
   * Toggle pin status on a discussion comment.
   */
  async togglePinComment(commentId, discussionId, groupId, userId) {
    const [comment] = await sql`
      SELECT c.id, c.discussion_id, c.user_id, c.is_pinned, d.group_id
      FROM discussion_comments c
      JOIN discussions d ON d.id = c.discussion_id
      WHERE c.id = ${commentId} AND c.discussion_id = ${discussionId} AND d.group_id = ${groupId}
    `;
    if (!comment) return null;

    const nextPinned = !comment.is_pinned;
    const [updated] = await sql`
      UPDATE discussion_comments
      SET is_pinned = ${nextPinned},
          pinned_at = ${nextPinned ? sql`NOW()` : null}
      WHERE id = ${commentId}
      RETURNING id, discussion_id, user_id, content, attachments, is_pinned, pinned_at, created_at
    `;
    return updated;
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

  /** Shared active notebooks in the workspace, optionally filtered by title. */
  async findMentionableNotebooks(groupId, q = '') {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    return await sql`
      SELECT id, title
      FROM (
        SELECT id, title, updated_at
        FROM notebooks
        WHERE group_id = ${groupId}
          AND COALESCE(is_private, FALSE) = FALSE
          AND LOWER(title) LIKE ${pattern}
        UNION
        SELECT id, title, updated_at
        FROM notes
        WHERE group_id = ${groupId}
          AND COALESCE(is_private, FALSE) = FALSE
          AND LOWER(title) LIKE ${pattern}
      ) combined_notebooks
      ORDER BY updated_at DESC
      LIMIT 8
    `;
  },

  /** Active folders in the workspace, optionally filtered by name. */
  async findMentionableFolders(groupId, q = '') {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    return await sql`
      SELECT id, name
      FROM notebook_folders
      WHERE group_id = ${groupId}
        AND LOWER(name) LIKE ${pattern}
      ORDER BY name ASC
      LIMIT 10
    `;
  },

  /**
   * Category 1 - #NB Pages: Query all notebook pages in the active workspace
   * that are NOT inside any folder (folder_id IS NULL).
   * Also optionally queries pages for a specific folder when folderId is specified.
   */
  async findMentionablePages(groupId, q = '', folderId = null) {
    const pattern = `%${String(q).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
    if (folderId !== null && folderId !== undefined) {
      return await sql`
        SELECT id, title, folder_id, notebook_id
        FROM (
          SELECT np.id, np.title, np.folder_id, np.notebook_id, np.position, np.updated_at
          FROM notebook_pages np
          JOIN notebooks n ON np.notebook_id = n.id
          WHERE n.group_id = ${groupId}
            AND np.folder_id = ${Number(folderId)}
            AND LOWER(np.title) LIKE ${pattern}
          UNION
          SELECT n.id, n.title, n.folder_id, NULL as notebook_id, 0 as position, n.updated_at
          FROM notes n
          WHERE n.group_id = ${groupId}
            AND n.folder_id = ${Number(folderId)}
            AND LOWER(n.title) LIKE ${pattern}
        ) sub_pages
        ORDER BY position ASC, updated_at DESC
        LIMIT 20
      `;
    }

    // Category 1: Pages where folder_id IS NULL
    return await sql`
      SELECT id, title, folder_id, notebook_id
      FROM (
        SELECT np.id, np.title, np.folder_id, np.notebook_id, np.updated_at
        FROM notebook_pages np
        JOIN notebooks n ON np.notebook_id = n.id
        WHERE n.group_id = ${groupId}
          AND np.folder_id IS NULL
          AND LOWER(np.title) LIKE ${pattern}
        UNION
        SELECT n.id, n.title, n.folder_id, NULL as notebook_id, n.updated_at
        FROM notes n
        WHERE n.group_id = ${groupId}
          AND n.folder_id IS NULL
          AND LOWER(n.title) LIKE ${pattern}
      ) root_pages
      ORDER BY updated_at DESC
      LIMIT 12
    `;
  },

  /** Query all sub-pages contained inside a specific notebook folder. */
  async findPagesByFolder(groupId, folderId) {
    return await sql`
      SELECT id, title, folder_id, notebook_id
      FROM (
        SELECT np.id, np.title, np.folder_id, np.notebook_id, np.position, np.updated_at
        FROM notebook_pages np
        JOIN notebooks n ON np.notebook_id = n.id
        WHERE n.group_id = ${groupId}
          AND np.folder_id = ${Number(folderId)}
        UNION
        SELECT n.id, n.title, n.folder_id, NULL as notebook_id, 0 as position, n.updated_at
        FROM notes n
        WHERE n.group_id = ${groupId}
          AND n.folder_id = ${Number(folderId)}
      ) folder_pages
      ORDER BY position ASC, updated_at DESC
      LIMIT 30
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
