/**
 * Direct Messaging Data Model
 * Handles 1-on-1 private messages scoped strictly to workspace groups.
 */

'use strict';

const sql = require('../../config/db.config');

const MessageModel = {
  /**
   * Check if user is a member of the given group.
   */
  async isMember(userId, groupId) {
    const rows = await sql`
      SELECT 1 FROM group_members
      WHERE user_id = ${userId} AND group_id = ${groupId}
      LIMIT 1
    `;
    return rows.length > 0;
  },

  /**
   * Insert a new direct message.
   */
  async createDirectMessage({ groupId, senderId, receiverId, message, attachments = [] }) {
    const jsonAttachments = JSON.stringify(Array.isArray(attachments) ? attachments : []);
    const [row] = await sql`
      INSERT INTO direct_messages (group_id, sender_id, receiver_id, message, attachments, is_read, is_pinned, created_at)
      VALUES (${groupId}, ${senderId}, ${receiverId}, ${message}, ${jsonAttachments}::jsonb, FALSE, FALSE, NOW())
      RETURNING id, group_id, sender_id, receiver_id, message, attachments, is_read, is_pinned, pinned_at, created_at
    `;
    return row;
  },

  /**
   * Retrieve conversation history between two users in a group.
   */
  async getConversationMessages({ groupId, userId1, userId2 }) {
    return await sql`
      SELECT 
        m.id,
        m.group_id,
        m.sender_id,
        m.receiver_id,
        m.message,
        COALESCE(m.attachments, '[]'::jsonb) as attachments,
        COALESCE(m.is_pinned, FALSE) as is_pinned,
        m.pinned_at,
        m.is_read,
        m.created_at,
        s.full_name as sender_name,
        s.avatar_initials as sender_initials,
        r.full_name as receiver_name,
        r.avatar_initials as receiver_initials
      FROM direct_messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE m.group_id = ${groupId}
        AND (
          (m.sender_id = ${userId1} AND m.receiver_id = ${userId2})
          OR
          (m.sender_id = ${userId2} AND m.receiver_id = ${userId1})
        )
      ORDER BY m.created_at ASC
    `;
  },

  /**
   * Toggle pin status of a direct message.
   */
  async togglePinMessage(messageId, groupId, userId) {
    const [msg] = await sql`
      SELECT id, group_id, sender_id, receiver_id, is_pinned
      FROM direct_messages
      WHERE id = ${messageId} AND group_id = ${groupId}
    `;
    if (!msg) return null;
    if (Number(msg.sender_id) !== Number(userId) && Number(msg.receiver_id) !== Number(userId)) {
      const err = new Error('Not authorized to pin this message.');
      err.status = 403;
      throw err;
    }
    const nextPinned = !msg.is_pinned;
    const [updated] = await sql`
      UPDATE direct_messages
      SET is_pinned = ${nextPinned},
          pinned_at = ${nextPinned ? sql`NOW()` : null}
      WHERE id = ${messageId} AND group_id = ${groupId}
      RETURNING id, group_id, sender_id, receiver_id, message, COALESCE(attachments, '[]'::jsonb) as attachments, is_pinned, pinned_at, created_at
    `;
    return updated;
  },

  /**
   * Mark all unread messages received from other user as read.
   */
  async markMessagesAsRead({ groupId, senderId, receiverId }) {
    const updated = await sql`
      UPDATE direct_messages
      SET is_read = TRUE
      WHERE group_id = ${groupId}
        AND sender_id = ${senderId}
        AND receiver_id = ${receiverId}
        AND is_read = FALSE
      RETURNING id
    `;
    return updated.length;
  },

  /**
   * Get workspace teammates with last message snippet and unread counts for current user.
   */
  async getWorkspaceConversations({ groupId, currentUserId }) {
    return await sql`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        u.avatar_initials,
        CASE 
          WHEN u.last_active_at IS NOT NULL AND u.last_active_at >= NOW() - INTERVAL '2 minutes' THEN 'online'
          ELSE 'offline'
        END as status,
        gm.role,
        last_msg.message as last_message,
        last_msg.created_at as last_message_at,
        last_msg.sender_id as last_message_sender_id,
        COALESCE(unread.cnt, 0)::int as unread_count
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT message, created_at, sender_id
        FROM direct_messages dm
        WHERE dm.group_id = ${groupId}
          AND (
            (dm.sender_id = ${currentUserId} AND dm.receiver_id = u.id)
            OR
            (dm.sender_id = u.id AND dm.receiver_id = ${currentUserId})
          )
        ORDER BY dm.created_at DESC
        LIMIT 1
      ) last_msg ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt
        FROM direct_messages dm_u
        WHERE dm_u.group_id = ${groupId}
          AND dm_u.sender_id = u.id
          AND dm_u.receiver_id = ${currentUserId}
          AND dm_u.is_read = FALSE
      ) unread ON TRUE
      WHERE gm.group_id = ${groupId}
        AND gm.user_id != ${currentUserId}
      ORDER BY last_msg.created_at DESC NULLS LAST, u.full_name ASC
    `;
  },

  /**
   * Add direct message notification into receiver's personal_feed.
   */
  async createFeedNotification({ userId, groupId, authorUserId, content, type = 'direct_message' }) {
    try {
      const [row] = await sql`
        INSERT INTO personal_feed (user_id, group_id, author_user_id, content, type, created_at)
        VALUES (${userId}, ${groupId}, ${authorUserId}, ${content}, ${type}, NOW())
        RETURNING id
      `;
      return row;
    } catch (err) {
      console.warn('[MessageModel] Notification insertion ignored:', err.message);
      return null;
    }
  }
};

module.exports = MessageModel;
