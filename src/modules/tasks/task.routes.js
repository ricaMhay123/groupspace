/**
 * Kanban Task Routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('./task.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership, requireGroupLeader } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireGroupMembership);

router.get('/', taskController.getTasks);
router.post('/', taskController.create);
router.patch('/:taskId/status', taskController.updateStatus);
router.post('/:taskId/approve', requireGroupLeader, taskController.reviewApproval);
router.delete('/:taskId', taskController.remove);

module.exports = router;
