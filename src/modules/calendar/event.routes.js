/**
 * Calendar Event Routes
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const eventController = require('./event.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireGroupMembership);

router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.delete('/:eventId', eventController.deleteEvent);

module.exports = router;
