/**
 * Kanban Task Service with Dual-Approval Workflow
 */

const TaskModel = require('./task.model');
const GroupModel = require('../groups/group.model');
const { TASK_STATUS, TASK_PRIORITY, ROLES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

async function createTask({ groupId, title, description, priority, assignedToUserId, createdByUserId, userFullName }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Task title is required.');
  }

  // Validate assignee is a group member if provided
  if (assignedToUserId) {
    const isMember = await GroupModel.findMember(groupId, assignedToUserId);
    if (!isMember) {
      throw new Error('Assigned user is not a member of this workspace.');
    }
  }

  const taskId = await TaskModel.create({
    groupId,
    title: cleanTitle,
    description: sanitizeText(description),
    priority: TASK_PRIORITY[priority] || TASK_PRIORITY.MEDIUM,
    assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
    createdByUserId,
    dueDate: null
  });

  await GroupModel.logActivity({
    groupId,
    userId: createdByUserId,
    actionType: 'TASK_CREATED',
    description: `${userFullName || 'A member'} created task: "${cleanTitle}".`
  });

  return await TaskModel.findById(taskId);
}

async function getGroupTasks(groupId) {
  return await TaskModel.findByGroup(groupId);
}

async function updateTaskStatus({ taskId, groupId, status, userId, userRole, userFullName }) {
  const task = await TaskModel.findById(taskId);
  if (!task || task.group_id !== Number(groupId)) {
    throw new Error('Task not found in this workspace.');
  }

  if (!TASK_STATUS[status]) {
    throw new Error(`Invalid status. Allowed values: ${Object.values(TASK_STATUS).join(', ')}`);
  }

  // Dual Approval Rule:
  // A standard member can only transition tasks to TODO, IN_PROGRESS, or PENDING_APPROVAL.
  // Directly marking as DONE requires LEADER role.
  if (status === TASK_STATUS.DONE && userRole !== ROLES.LEADER) {
    throw new Error('Dual-Approval Required: Only a Workspace Leader can approve tasks as DONE. Please submit for review (PENDING_APPROVAL).');
  }

  const updateFields = { status };

  if (status === TASK_STATUS.DONE) {
    updateFields.approved_by_user_id = userId;
  }

  await TaskModel.update(taskId, updateFields);

  const actionMap = {
    [TASK_STATUS.TODO]: 'moved task to To Do',
    [TASK_STATUS.IN_PROGRESS]: 'started working on task',
    [TASK_STATUS.PENDING_APPROVAL]: 'submitted task for Leader Approval',
    [TASK_STATUS.DONE]: 'approved task as DONE'
  };

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'TASK_STATUS_CHANGED',
    description: `${userFullName || 'A member'} ${actionMap[status] || 'updated task'}: "${task.title}".`
  });

  return await TaskModel.findById(taskId);
}

/**
 * Leader Dual-Approval Handler
 * Allows leader to approve (DONE) or reject (back to IN_PROGRESS with feedback)
 */
async function reviewTaskApproval({ taskId, groupId, approved, approvalNotes, leaderUserId, leaderFullName }) {
  const task = await TaskModel.findById(taskId);
  if (!task || task.group_id !== Number(groupId)) {
    throw new Error('Task not found in this workspace.');
  }

  if (task.status !== TASK_STATUS.PENDING_APPROVAL) {
    throw new Error('Task is not currently awaiting approval.');
  }

  const cleanNotes = sanitizeText(approvalNotes);

  if (approved) {
    await TaskModel.update(taskId, {
      status: TASK_STATUS.DONE,
      approved_by_user_id: leaderUserId,
      approval_notes: cleanNotes || 'Approved by workspace leader.'
    });

    await GroupModel.logActivity({
      groupId,
      userId: leaderUserId,
      actionType: 'TASK_APPROVED',
      description: `Leader ${leaderFullName || ''} approved task "${task.title}".`
    });
  } else {
    // Rejected: push back to IN_PROGRESS
    await TaskModel.update(taskId, {
      status: TASK_STATUS.IN_PROGRESS,
      approval_notes: cleanNotes || 'Changes requested by leader.'
    });

    await GroupModel.logActivity({
      groupId,
      userId: leaderUserId,
      actionType: 'TASK_REJECTED',
      description: `Leader ${leaderFullName || ''} requested revisions on task "${task.title}": ${cleanNotes || 'Needs update'}.`
    });
  }

  return await TaskModel.findById(taskId);
}

async function deleteTask({ taskId, groupId, userId, userRole }) {
  const task = await TaskModel.findById(taskId);
  if (!task || task.group_id !== Number(groupId)) {
    throw new Error('Task not found.');
  }

  // Only the creator or a leader can delete a task
  if (task.created_by_user_id !== userId && userRole !== ROLES.LEADER) {
    throw new Error('You do not have permission to delete this task.');
  }

  await TaskModel.delete(taskId);
  return { success: true };
}

module.exports = {
  createTask,
  getGroupTasks,
  updateTaskStatus,
  reviewTaskApproval,
  deleteTask
};
