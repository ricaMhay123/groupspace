/**
 * Direct Messaging Service
 * Business logic for 1-on-1 private messaging, membership validation, and feed notifications.
 */

'use strict';

const MessageModel = require('./message.model');

class MessageService {
  /**
   * List teammates & 1-on-1 conversation summaries for the active group.
   */
  async getConversations(groupId, currentUserId) {
    const isMember = await MessageModel.isMember(currentUserId, groupId);
    if (!isMember) {
      throw { status: 403, message: 'You are not a member of this workspace group.' };
    }

    return await MessageModel.getWorkspaceConversations({ groupId, currentUserId });
  }

  /**
   * Fetch 1-on-1 conversation thread between current user and teammate.
   */
  async getDirectHistory(groupId, currentUserId, otherUserId) {
    const isMember = await MessageModel.isMember(currentUserId, groupId);
    if (!isMember) {
      throw { status: 403, message: 'You are not a member of this workspace group.' };
    }

    const otherIsMember = await MessageModel.isMember(otherUserId, groupId);
    if (!otherIsMember) {
      throw { status: 404, message: 'The requested teammate is not a member of this workspace.' };
    }

    // Mark unread messages from other user as read
    await MessageModel.markMessagesAsRead({ groupId, senderId: otherUserId, receiverId: currentUserId });

    return await MessageModel.getConversationMessages({
      groupId,
      userId1: currentUserId,
      userId2: otherUserId
    });
  }

  /**
   * Send a direct message to a teammate in the active group.
   */
  async sendDirectMessage({ groupId, senderId, receiverId, message, senderName = 'Teammate' }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw { status: 400, message: 'Message content cannot be empty.' };
    }

    if (Number(senderId) === Number(receiverId)) {
      throw { status: 400, message: 'Cannot send a direct message to yourself.' };
    }

    // Validate both sender and receiver belong to this workspace
    const senderIsMember = await MessageModel.isMember(senderId, groupId);
    if (!senderIsMember) {
      throw { status: 403, message: 'Sender is not a member of this workspace group.' };
    }

    const receiverIsMember = await MessageModel.isMember(receiverId, groupId);
    if (!receiverIsMember) {
      throw { status: 403, message: 'Recipient is not a member of this workspace group.' };
    }

    const trimmedMsg = message.trim();
    const createdMsg = await MessageModel.createDirectMessage({
      groupId,
      senderId,
      receiverId,
      message: trimmedMsg
    });

    // Create a personal_feed notification item for the receiver
    const preview = trimmedMsg.length > 70 ? trimmedMsg.slice(0, 70) + '…' : trimmedMsg;
    await MessageModel.createFeedNotification({
      userId: receiverId,
      groupId,
      authorUserId: senderId,
      content: `Direct message from ${senderName}: "${preview}"`,
      type: 'direct_message'
    });

    return createdMsg;
  }
}

module.exports = new MessageService();
