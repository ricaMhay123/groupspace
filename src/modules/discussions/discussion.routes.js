/**
 * Discussion & Activity Feed Routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const discussionController = require('./discussion.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireGroupMembership);

router.get('/', discussionController.getTopics);
router.post('/', discussionController.createTopic);
router.get('/activity', discussionController.getActivity);
router.get('/:topicId', discussionController.getTopicDetails);
router.post('/:topicId/comments', discussionController.postComment);
router.delete('/:topicId', discussionController.removeTopic);

module.exports = router;
