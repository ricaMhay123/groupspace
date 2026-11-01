/**
 * Direct Messaging Controller
 */

'use strict';

const messageService = require('./message.service');

const MessageController = {
  async getConversations(req, res) {
    try {
      const groupId = Number(req.params.groupId || req.query.groupId);
      if (!groupId) {
        return res.status(400).json({ success: false, message: 'Valid groupId parameter is required.' });
      }

      const conversations = await messageService.getConversations(groupId, req.user.id);
      return res.json({ success: true, data: conversations });
    } catch (err) {
      console.error('[MessageController.getConversations] Error:', err);
      const status = err.status || 500;
      return res.status(status).json({ success: false, message: err.message || 'Failed to fetch conversations.' });
    }
  },

  async getDirectHistory(req, res) {
    try {
      const groupId = Number(req.params.groupId || req.query.groupId);
      const otherUserId = Number(req.params.otherUserId);

      if (!groupId || !otherUserId) {
        return res.status(400).json({ success: false, message: 'Valid groupId and otherUserId are required.' });
      }

      const messages = await messageService.getDirectHistory(groupId, req.user.id, otherUserId);
      return res.json({ success: true, data: messages });
    } catch (err) {
      console.error('[MessageController.getDirectHistory] Error:', err);
      const status = err.status || 500;
      return res.status(status).json({ success: false, message: err.message || 'Failed to fetch message history.' });
    }
  },

  async sendDirectMessage(req, res) {
    try {
      const groupId = Number(req.params.groupId || req.body.groupId);
      const receiverId = Number(req.body.receiverId || req.body.receiver_id);
      const message = req.body.message;

      if (!groupId || !receiverId || !message) {
        return res.status(400).json({
          success: false,
          message: 'groupId, receiverId, and message content are required.'
        });
      }

      const created = await messageService.sendDirectMessage({
        groupId,
        senderId: req.user.id,
        receiverId,
        message,
        senderName: req.user.full_name || 'Teammate'
      });

      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error('[MessageController.sendDirectMessage] Error:', err);
      const status = err.status || 500;
      return res.status(status).json({ success: false, message: err.message || 'Failed to send direct message.' });
    }
  }
};

module.exports = MessageController;
