/**
 * Direct Messaging Router
 * Mounts routes for workspace 1-on-1 conversations and direct messages.
 */

'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authMiddleware } = require('../../middleware/auth.middleware');
const MessageController = require('./message.controller');

// All direct message routes require authenticated session
router.use(authMiddleware);

// Workspace 1-on-1 conversation list & unread counters
router.get('/conversations', MessageController.getConversations);

// Conversation history between logged-in user and specific teammate
router.get('/direct/:otherUserId', MessageController.getDirectHistory);

// Send a direct message to a teammate
router.post('/direct', MessageController.sendDirectMessage);

module.exports = router;
