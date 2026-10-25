/**
 * Kanban Task Service
 *
 * All business logic for the task Kanban board, including:
 *  - Role-based task creation (leader vs member rules)
 *  - Dual-approval workflow (PENDING_APPROVAL → DONE)
 *  - Flagging tasks as "Blocked / Help Needed"
 *  - Peer-assist offer & response workflow
 */

'use strict';

const { TaskModel, TaskAssistantModel } = require('./task.model');
const GroupModel   = require('../groups/group.model');
const {
  TASK_STATUS, TASK_PRIORITY, ROLES, ASSIST_STATUS, SYSTEM_MESSAGES
} = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a domain error with an explicit HTTP status code attached.
 * @param {string} message
 * @param {number} [httpStatus=400]
 */
function domainError(message, httpStatus = 400) {
  const err = new Error(message);
  err.httpStatus = httpStatus;
  return err;
}

/**
 * Resolve a task from the DB and verify it belongs to the expected group.
 * Throws a 404 domain error when not found.
 */
async function _resolveTask(taskId, groupId) {
  const task = await TaskModel.findById(taskId);
  if (!task || String(task.group_id) !== String(groupId)) {
    throw domainError(SYSTEM_MESSAGES.TASK_NOT_FOUND, 404);
  }
  return task;
}

// ─── Task CRUD ─────────────────────────────────────────────────────────────────

/**
 * Create a task enforcing role-based assignment rules.
 *
 * Creation rules (double-enforced — middleware also checks these):
 *  - LEADER  : can assign to anyone or leave unassigned.
 *  - MEMBER  : can only assign to themselves; task enters PENDING_APPROVAL
 *              so a leader must approve it before it becomes actionable.
 */
async function createTask({ groupId, title, description, priority, assignedToUserId,
                            createdByUserId, userRole, userFullName, dueDate }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) throw domainError('Task title is required.');

  // Validate assignee membership if provided
  if (assignedToUserId) {
    const isMember = await GroupModel.findMember(groupId, assignedToUserId);
    if (!isMember) throw domainError('Assigned user is not a member of this workspace.');
  }

  let isLeader = userRole === ROLES.LEADER;
  if (!userRole && createdByUserId) {
    const creatorMember = await GroupModel.findMember(groupId, createdByUserId);
    if (creatorMember && creatorMember.role === ROLES.LEADER) {
      isLeader = true;
    }
  }

  // Members self-assign; task starts in PENDING_APPROVAL
  const resolvedAssignee = isLeader
    ? (assignedToUserId ? Number(assignedToUserId) : null)
    : createdByUserId;                         // member self-assigns

  const initialStatus = isLeader
    ? TASK_STATUS.TODO                         // leader-created tasks go straight to board
    : TASK_STATUS.PENDING_APPROVAL;            // member-created tasks await leader approval

  const taskId = await TaskModel.create({
    groupId,
    title:           cleanTitle,
    description:     sanitizeText(description),
    priority:        TASK_PRIORITY[priority] || TASK_PRIORITY.MEDIUM,
    status:          initialStatus,
    assignedToUserId: resolvedAssignee,
    createdByUserId,
    dueDate:         dueDate || null
  });

  await GroupModel.logActivity({
    groupId,
    userId:      createdByUserId,
    actionType:  'TASK_CREATED',
    description: `${userFullName || 'A member'} created task: "${cleanTitle}"` +
                 (isLeader ? '.' : ' (pending leader approval).')
  });

  return await TaskModel.findById(taskId);
}

/** Return all tasks for a group. */
async function getGroupTasks(groupId) {
  return await TaskModel.findByGroup(groupId);
}

/**
 * Update a task's Kanban status column.
 *
 * Status-move rules:
 *  - MEMBER can move their own tasks to: TODO, IN_PROGRESS, PENDING_APPROVAL.
 *  - Only a LEADER can set status to DONE (enforced here + middleware).
 *  - A task in PENDING_APPROVAL can only be moved by a LEADER or back to
 *    IN_PROGRESS by the assignee (for self-correction before resubmitting).
 */
async function updateTaskStatus({ taskId, groupId, status, userId, userRole, userFullName }) {
  const task = await _resolveTask(taskId, groupId);

  if (!TASK_STATUS[status]) {
    throw domainError(`Invalid status. Allowed: ${Object.values(TASK_STATUS).join(', ')}`);
  }

  const isLeader   = userRole === ROLES.LEADER;
  const isAssignee = task.assigned_to_user_id === userId;

  // Only leader or assignee may move the task
  if (!isLeader && !isAssignee) {
    throw domainError(SYSTEM_MESSAGES.TASK_EDIT_DENIED, 403);
  }

  // Only leaders can mark a task DONE
  if (status === TASK_STATUS.DONE && !isLeader) {
    throw domainError(
      'Dual-Approval Required: only a Leader can mark a task as Done. Submit for review instead.',
      403
    );
  }

  const updateFields = { status };
  if (status === TASK_STATUS.DONE) {
    updateFields.approved_by_user_id = userId;
  }

  const updated = await TaskModel.update(taskId, updateFields);

  const actionMap = {
    [TASK_STATUS.TODO]:             'moved task back to To Do',
    [TASK_STATUS.IN_PROGRESS]:      'started working on task',
    [TASK_STATUS.PENDING_APPROVAL]: 'submitted task for Leader Approval',
    [TASK_STATUS.DONE]:             'approved task as Done'
  };

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType:  'TASK_STATUS_CHANGED',
    description: `${userFullName || 'A member'} ${actionMap[status] || 'updated'}: "${task.title}".`
  });

  return updated;
}

/**
 * Leader approves or rejects a task currently in PENDING_APPROVAL.
 *
 * - approved = true  → status becomes DONE.
 * - approved = false → status reverts to IN_PROGRESS with rejection notes.
 */
async function reviewTaskApproval({ taskId, groupId, approved, approvalNotes, leaderUserId, leaderFullName }) {
  const task = await _resolveTask(taskId, groupId);

  if (task.status !== TASK_STATUS.PENDING_APPROVAL) {
    throw domainError(SYSTEM_MESSAGES.TASK_NOT_PENDING, 400);
  }

  const cleanNotes = sanitizeText(approvalNotes);

  if (approved) {
    await TaskModel.update(taskId, {
      status:              TASK_STATUS.DONE,
      approved_by_user_id: leaderUserId,
      approval_notes:      cleanNotes || 'Approved by workspace leader.'
    });

    await GroupModel.logActivity({
      groupId,
      userId:      leaderUserId,
      actionType:  'TASK_APPROVED',
      description: `Leader ${leaderFullName || ''} approved task "${task.title}".`
    });
  } else {
    await TaskModel.update(taskId, {
      status:         TASK_STATUS.IN_PROGRESS,
      approval_notes: cleanNotes || 'Changes requested by leader.'
    });

    await GroupModel.logActivity({
      groupId,
      userId:      leaderUserId,
      actionType:  'TASK_REJECTED',
      description: `Leader ${leaderFullName || ''} sent back task "${task.title}" for revision: ${cleanNotes || 'Needs update'}.`
    });
  }

  return await TaskModel.findById(taskId);
}

/** Delete a task — creator or leader only. */
async function deleteTask({ taskId, groupId, userId, userRole }) {
  const task = await _resolveTask(taskId, groupId);

  if (task.created_by_user_id !== userId && userRole !== ROLES.LEADER) {
    throw domainError(SYSTEM_MESSAGES.UNAUTHORIZED_ACTION, 403);
  }

  await TaskModel.delete(taskId);
  return { success: true };
}

// ─── Flagging (Blocked / Help Needed) ─────────────────────────────────────────

/**
 * Mark a task as "Blocked / Help Needed" (is_flagged = true).
 *
 * Rules:
 *  - Only the task's assigned member (or a leader) may flag it.
 *  - Already-flagged tasks return a 409-level domain error.
 */
async function flagTask({ taskId, groupId, userId, userRole, reason }) {
  const task = await _resolveTask(taskId, groupId);
  const isLeader = userRole === ROLES.LEADER;

  if (!isLeader && task.assigned_to_user_id !== userId) {
    throw domainError(SYSTEM_MESSAGES.TASK_EDIT_DENIED, 403);
  }

  if (task.is_flagged) {
    throw domainError(SYSTEM_MESSAGES.TASK_ALREADY_FLAGGED, 409);
  }

  const updated = await TaskModel.update(taskId, {
    is_flagged:    true,
    flagged_reason: sanitizeText(reason) || null,
    flagged_at:    new Date().toISOString()
  });

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType:  'TASK_FLAGGED',
    description: `Task "${task.title}" has been flagged as Blocked${reason ? `: ${sanitizeText(reason)}` : '.'}`
  });

  return updated;
}

/**
 * Remove the "Blocked" flag from a task (is_flagged = false).
 * Allowed by: assigned user or leader.
 */
async function unflagTask({ taskId, groupId, userId, userRole }) {
  const task = await _resolveTask(taskId, groupId);
  const isLeader = userRole === ROLES.LEADER;

  if (!isLeader && task.assigned_to_user_id !== userId) {
    throw domainError(SYSTEM_MESSAGES.TASK_EDIT_DENIED, 403);
  }

  const updated = await TaskModel.update(taskId, {
    is_flagged:    false,
    flagged_reason: null,
    flagged_at:    null
  });

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType:  'TASK_UNFLAGGED',
    description: `Task "${task.title}" is no longer blocked.`
  });

  return updated;
}

// ─── Peer-Assist Workflow ──────────────────────────────────────────────────────

/**
 * Offer peer assistance on a flagged task.
 *
 * Rules:
 *  - Task must be flagged (is_flagged = true).
 *  - Helper cannot be the task's own assignee.
 *  - Duplicate offers are rejected (unique DB constraint surfaces as domain error).
 */
async function offerAssistance({ taskId, groupId, userId, userFullName, message }) {
  const task = await _resolveTask(taskId, groupId);

  if (!task.is_flagged) {
    throw domainError(SYSTEM_MESSAGES.TASK_NOT_FLAGGED, 400);
  }

  if (task.assigned_to_user_id === userId) {
    throw domainError(SYSTEM_MESSAGES.TASK_SELF_ASSIST, 403);
  }

  // Check for existing offer
  const existing = await TaskAssistantModel.findOffer(taskId, userId);
  if (existing) {
    throw domainError(SYSTEM_MESSAGES.TASK_ASSIST_EXISTS, 409);
  }

  const offer = await TaskAssistantModel.create({
    taskId,
    userId,
    message: sanitizeText(message)
  });

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType:  'TASK_ASSIST_OFFERED',
    description: `${userFullName || 'A member'} offered peer assistance on task "${task.title}".`
  });

  return { task, offer };
}

/**
 * Respond to a peer-assist offer (accept or decline).
 *
 * Rules:
 *  - Only the task's assignee or a Leader can respond.
 *  - The offer must be in 'offered' state (not already accepted/declined).
 */
async function respondToAssist({ taskId, groupId, helperId, responderId, responderRole, responderName, decision }) {
  const task = await _resolveTask(taskId, groupId);
  const isLeader   = responderRole === ROLES.LEADER;
  const isAssignee = task.assigned_to_user_id === responderId;

  if (!isLeader && !isAssignee) {
    throw domainError(SYSTEM_MESSAGES.TASK_ASSIST_RESPOND_DENIED, 403);
  }

  const offer = await TaskAssistantModel.findOffer(taskId, helperId);
  if (!offer) {
    throw domainError(SYSTEM_MESSAGES.TASK_ASSIST_NOT_FOUND, 404);
  }

  if (offer.status !== ASSIST_STATUS.OFFERED) {
    throw domainError(`This offer has already been ${offer.status}.`, 409);
  }

  const newStatus = decision === 'accept' ? ASSIST_STATUS.ACCEPTED : ASSIST_STATUS.DECLINED;
  const updated   = await TaskAssistantModel.updateStatus(taskId, helperId, newStatus);

  await GroupModel.logActivity({
    groupId,
    userId:      responderId,
    actionType:  decision === 'accept' ? 'TASK_ASSIST_ACCEPTED' : 'TASK_ASSIST_DECLINED',
    description: `${responderName || 'The assignee'} ${decision === 'accept' ? 'accepted' : 'declined'} peer assistance from ${offer.helper_name || 'a member'} on task "${task.title}".`
  });

  // If accepted: clear the flag because help is on the way
  if (decision === 'accept' && task.is_flagged) {
    await TaskModel.update(taskId, {
      is_flagged:    false,
      flagged_reason: null,
      flagged_at:    null
    });
  }

  return { task: await TaskModel.findById(taskId), offer: updated };
}

/** List all assist offers for a task. */
async function getTaskAssistOffers(taskId, groupId) {
  await _resolveTask(taskId, groupId); // ownership guard
  return await TaskAssistantModel.findByTask(taskId);
}

module.exports = {
  // Task CRUD
  createTask,
  getGroupTasks,
  updateTaskStatus,
  reviewTaskApproval,
  deleteTask,
  // Flagging
  flagTask,
  unflagTask,
  // Peer-assist
  offerAssistance,
  respondToAssist,
  getTaskAssistOffers
};
