/**
 * Kanban Task Routes
 *
 * Mounted at /api/groups/:groupId/tasks  in app.js.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  Route                                │ Auth              │ Description     │
 * ├───────────────────────────────────────┼───────────────────┼─────────────────┤
 * │  GET    /                             │ member            │ List tasks      │
 * │  POST   /                             │ member (creation) │ Create task     │
 * │  PATCH  /:taskId/status               │ assignee / leader │ Move column     │
 * │  PUT    /:taskId/approve              │ leader only       │ Approve/reject  │
 * │  DELETE /:taskId                      │ creator / leader  │ Delete task     │
 * │                                       │                   │                 │
 * │  POST   /:taskId/flag                 │ assignee / leader │ Set flag        │
 * │  DELETE /:taskId/flag                 │ assignee / leader │ Clear flag      │
 * │                                       │                   │                 │
 * │  GET    /:taskId/assist               │ member            │ List offers     │
 * │  POST   /:taskId/assist               │ any member ≠ self │ Offer help      │
 * │  PATCH  /:taskId/assist/:helperId     │ assignee / leader │ Accept/decline  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

'use strict';

const express = require('express');
const router  = express.Router({ mergeParams: true }); // inherit :groupId from parent

const ctrl = require('./task.controller');
const { authMiddleware }          = require('../../middleware/auth.middleware');
const {
  requireGroupMembership,
  requireGroupLeader,
  checkTaskCreationPermission,
  checkTaskEditPermission
} = require('../../middleware/role.middleware');

// ─── All routes require authentication + group membership ─────────────────────
router.use(authMiddleware);
router.use(requireGroupMembership);

// ─── Task CRUD ────────────────────────────────────────────────────────────────

// GET /  — list all group tasks (any member)
router.get('/', ctrl.getTasks);

// POST / — create task; checkTaskCreationPermission enforces self-assign rule for members
router.post('/', checkTaskCreationPermission, ctrl.create);

// PATCH /:taskId/status — move Kanban column; checkTaskEditPermission gates non-assignee/non-leader
router.patch('/:taskId/status', checkTaskEditPermission, ctrl.updateStatus);

// PUT /:taskId/approve — leader approves or rejects a PENDING_APPROVAL task
router.put('/:taskId/approve', requireGroupLeader, ctrl.reviewApproval);

// DELETE /:taskId — delete; creator-or-leader check is inside the service
router.delete('/:taskId', ctrl.remove);

// ─── Flagging (Blocked / Help Needed) ────────────────────────────────────────

// POST /:taskId/flag  — flag as blocked (assignee or leader)
router.post('/:taskId/flag', ctrl.flagTask);

// DELETE /:taskId/flag — clear flag (assignee or leader)
router.delete('/:taskId/flag', ctrl.unflagTask);

// ─── Peer-Assist Workflow ─────────────────────────────────────────────────────

// GET  /:taskId/assist              — list all offers (any member)
router.get('/:taskId/assist', ctrl.getAssistOffers);

// POST /:taskId/assist              — volunteer to help (any member except assignee)
router.post('/:taskId/assist', ctrl.offerAssist);

// PATCH /:taskId/assist/:helperId   — accept / decline an offer (assignee or leader)
router.patch('/:taskId/assist/:helperId', ctrl.respondAssist);

module.exports = router;
