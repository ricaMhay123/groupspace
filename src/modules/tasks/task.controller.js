/**
 * Kanban Task Controller
 */

const taskService = require('./task.service');
const { HTTP_STATUS } = require('../../config/constants');

async function getTasks(req, res) {
  try {
    const tasks = await taskService.getGroupTasks(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { title, description, priority, assignedToUserId, dueDate } = req.body;
    const task = await taskService.createTask({
      groupId: req.params.groupId,
      title,
      description,
      priority,
      assignedToUserId,
      createdByUserId: req.user.id,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Task created successfully.',
      data: task
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const task = await taskService.updateTaskStatus({
      taskId: req.params.taskId,
      groupId: req.params.groupId,
      status,
      userId: req.user.id,
      userRole: req.membership.role,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Task status updated.',
      data: task
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function reviewApproval(req, res) {
  try {
    const { approved, approvalNotes } = req.body;
    const task = await taskService.reviewTaskApproval({
      taskId: req.params.taskId,
      groupId: req.params.groupId,
      approved: Boolean(approved),
      approvalNotes,
      leaderUserId: req.user.id,
      leaderFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: approved ? 'Task approved as Done!' : 'Task returned to In Progress for revisions.',
      data: task
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    await taskService.deleteTask({
      taskId: req.params.taskId,
      groupId: req.params.groupId,
      userId: req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getTasks,
  create,
  updateStatus,
  reviewApproval,
  remove
};
