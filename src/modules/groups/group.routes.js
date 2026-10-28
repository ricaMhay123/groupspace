/**
 * Group / Workspace Routes
 */

const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership, requireGroupPrimaryLeader } = require('../../middleware/role.middleware');

router.use(authMiddleware);

router.post('/', groupController.create);
router.post('/join', groupController.join);
router.get('/', groupController.getMyGroups);
router.get('/:id', requireGroupMembership, groupController.getDetails);
router.patch('/:id/members/:userId/role', requireGroupPrimaryLeader, groupController.updateRole);
router.patch('/:id/settings', requireGroupPrimaryLeader, groupController.updateSettings);
router.post('/:id/reset-join-code', requireGroupPrimaryLeader, groupController.resetJoinCode);
router.post('/:id/leadership-requests', requireGroupMembership, groupController.requestLeadership);
router.patch('/:id/leadership-requests/:requestId', requireGroupPrimaryLeader, groupController.resolveLeadershipRequest);
router.post('/:id/leave', requireGroupMembership, groupController.leave);
router.delete('/:groupId/members/:userId', requireGroupPrimaryLeader, groupController.removeMember);
router.delete('/:id', requireGroupPrimaryLeader, groupController.deleteWorkspace);
router.delete('/:groupId', requireGroupPrimaryLeader, groupController.deleteWorkspace);

module.exports = router;
