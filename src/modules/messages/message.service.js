/**
 * Direct Messaging Service
 * Business logic for 1-on-1 private messaging, membership validation, attachments, and pinning.
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
  async sendDirectMessage({ groupId, senderId, receiverId, message, attachments = [], senderName = 'Teammate' }) {
    const trimmedMsg = (typeof message === 'string') ? message.trim() : '';
    const safeAttachments = Array.isArray(attachments) ? attachments : [];

    if (!trimmedMsg && safeAttachments.length === 0) {
      throw { status: 400, message: 'Message content cannot be empty unless an attachment is provided.' };
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

    const createdMsg = await MessageModel.createDirectMessage({
      groupId,
      senderId,
      receiverId,
      message: trimmedMsg,
      attachments: safeAttachments
    });

    // Create a personal_feed notification item for the receiver
    const notifText = trimmedMsg || (safeAttachments.length > 0 ? (safeAttachments[0].file_name || 'Attachment') : 'Direct Message');
    const preview = notifText.length > 70 ? notifText.slice(0, 70) + '…' : notifText;
    await MessageModel.createFeedNotification({
      userId: receiverId,
      groupId,
      authorUserId: senderId,
      content: `Direct message from ${senderName}: "${preview}"`,
      type: 'direct_message'
    });

    return createdMsg;
  }

  /**
   * Toggle pin status on a direct message.
   */
  async togglePinMessage({ groupId, messageId, userId }) {
    const isMember = await MessageModel.isMember(userId, groupId);
    if (!isMember) {
      throw { status: 403, message: 'You are not a member of this workspace group.' };
    }

    const updated = await MessageModel.togglePinMessage(messageId, groupId, userId);
    if (!updated) {
      throw { status: 404, message: 'Message not found.' };
    }
    return updated;
  }
}

module.exports = new MessageService();
