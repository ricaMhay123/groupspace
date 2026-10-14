/**
 * Kanban Task Controller
 *
 * Thin HTTP layer — all business logic lives in task.service.js.
 * Translates service domain errors (err.httpStatus) to correct HTTP responses.
 */

'use strict';

const taskService = require('./task.service');
const { HTTP_STATUS } = require('../../config/constants');

// ─── Helper ────────────────────────────────────────────────────────────────────

/** Map a service domain error to its explicit HTTP status code. */
function errStatus(err) {
  return err.httpStatus || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

// ─── Task CRUD ─────────────────────────────────────────────────────────────────

/**
 * GET /api/groups/:groupId/tasks
 * List all tasks for the workspace visible to the member.
 */
async function getTasks(req, res) {
  try {
    const tasks = await taskService.getGroupTasks(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: tasks });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/groups/:groupId/tasks
 * Create a task.
 *
 * - Leader   → assigned to anyone, status = TODO.
 * - Member   → self-assigned only, status = PENDING_APPROVAL.
 *
 * Body: { title, description?, priority?, assignedToUserId?, dueDate? }
 */
async function create(req, res) {
  try {
    const { title, description, priority, assignedToUserId, dueDate } = req.body;

    const task = await taskService.createTask({
      groupId:          req.params.groupId,
      title,
      description,
      priority,
      assignedToUserId,
      createdByUserId:  req.user.id,
      userRole:         req.membership.role,
      userFullName:     req.user.full_name,
      dueDate
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: req.membership.role === 'LEADER'
        ? 'Task created successfully.'
        : 'Task submitted for leader approval.',
      data: task
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/groups/:groupId/tasks/:taskId/status
 * Move a task to a new Kanban column.
 * Guarded by checkTaskEditPermission middleware.
 *
 * Body: { status }
 */
async function updateStatus(req, res) {
  try {
    const { status } = req.body;

    const task = await taskService.updateTaskStatus({
      taskId:      req.params.taskId,
      groupId:     req.params.groupId,
      status,
      userId:      req.user.id,
      userRole:    req.membership.role,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Task status updated.', data: task });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/groups/:groupId/tasks/:taskId/approve
 * Leader approves or rejects a PENDING_APPROVAL task.
 *
 * Body: { approved: boolean, approvalNotes?: string }
 */
async function reviewApproval(req, res) {
  try {
    const { approved, approvalNotes } = req.body;

    const task = await taskService.reviewTaskApproval({
      taskId:        req.params.taskId,
      groupId:       req.params.groupId,
      approved:      Boolean(approved),
      approvalNotes,
      leaderUserId:  req.user.id,
      leaderFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: approved ? 'Task approved and marked Done.' : 'Task returned to In Progress for revisions.',
      data: task
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/groups/:groupId/tasks/:taskId
 * Delete a task — creator or leader only.
 */
async function remove(req, res) {
  try {
    await taskService.deleteTask({
      taskId:   req.params.taskId,
      groupId:  req.params.groupId,
      userId:   req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

// ─── Flagging ──────────────────────────────────────────────────────────────────

/**
 * POST /api/groups/:groupId/tasks/:taskId/flag
 * Mark a task as "Blocked / Help Needed".
 * Only the assigned member or a leader may flag their own task.
 *
 * Body: { reason?: string }
 */
async function flagTask(req, res) {
  try {
    const { reason } = req.body;
    const taskId = req.params.taskId || req.params.id;

    const task = await taskService.flagTask({
      taskId,
      groupId:  req.params.groupId,
      userId:   req.user.id,
      userRole: req.membership.role,
      reason
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Task flagged as Blocked — other members can now offer assistance.',
      data: task
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/groups/:groupId/tasks/:taskId/flag
 * Remove the "Blocked" flag from a task.
 */
async function unflagTask(req, res) {
  try {
    const taskId = req.params.taskId || req.params.id;
    const task = await taskService.unflagTask({
      taskId,
      groupId:  req.params.groupId,
      userId:   req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Task flag removed.',
      data: task
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

// ─── Peer-Assist Workflow ──────────────────────────────────────────────────────

/**
 * GET /api/groups/:groupId/tasks/:taskId/assist
 * List all peer-assist offers for a task.
 */
async function getAssistOffers(req, res) {
  try {
    const offers = await taskService.getTaskAssistOffers(
      req.params.taskId,
      req.params.groupId
    );
    return res.status(HTTP_STATUS.OK).json({ success: true, data: offers });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/groups/:groupId/tasks/:taskId/assist
 * Offer peer assistance on a flagged task.
 * Any group member except the assignee may call this.
 *
 * Body: { message?: string }
 */
async function offerAssist(req, res) {
  try {
    const { message } = req.body;

    const result = await taskService.offerAssistance({
      taskId:      req.params.taskId,
      groupId:     req.params.groupId,
      userId:      req.user.id,
      userFullName: req.user.full_name,
      message
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Assistance offer submitted.',
      data: result
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/groups/:groupId/tasks/:taskId/assist/:helperId
 * Assignee or leader accepts / declines a specific offer.
 *
 * Body: { decision: 'accept' | 'decline' }
 */
async function respondAssist(req, res) {
  try {
    const { decision } = req.body;

    if (!['accept', 'decline'].includes(decision)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'decision must be "accept" or "decline".'
      });
    }

    const result = await taskService.respondToAssist({
      taskId:        req.params.taskId,
      groupId:       req.params.groupId,
      helperId:      Number(req.params.helperId),
      responderId:   req.user.id,
      responderRole: req.membership.role,
      responderName: req.user.full_name,
      decision
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: decision === 'accept' ? 'Assistance offer accepted.' : 'Assistance offer declined.',
      data: result
    });
  } catch (error) {
    return res.status(errStatus(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  // Task CRUD
  getTasks,
  create,
  updateStatus,
  reviewApproval,
  remove,
  // Flagging
  flagTask,
  unflagTask,
  // Peer-assist
  getAssistOffers,
  offerAssist,
  respondAssist
};
