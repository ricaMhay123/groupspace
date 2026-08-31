/**
 * Group / Workspace Routes
 */

const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership, requireGroupLeader } = require('../../middleware/role.middleware');

router.use(authMiddleware);

router.post('/', groupController.create);
router.post('/join', groupController.join);
router.get('/', groupController.getMyGroups);
router.get('/:id', requireGroupMembership, groupController.getDetails);
router.patch('/:id/members/:userId/role', requireGroupLeader, groupController.updateRole);
router.post('/:id/leave', requireGroupMembership, groupController.leave);

module.exports = router;
