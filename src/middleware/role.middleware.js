/**
 * GroupSpace Role Middleware
 * Validates group membership and leader permissions.
 */

const sql = require('../config/db.config');
const { ROLES, HTTP_STATUS, SYSTEM_MESSAGES } = require('../config/constants');

/**
 * Middleware ensuring user is a member of the group specified in req.params.groupId (or req.body.groupId)
 */
async function requireGroupMembership(req, res, next) {
  const groupId = req.params.groupId || req.params.id || req.body.groupId;
  const userId = req.user && req.user.id;

  if (!groupId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Workspace ID is required.'
    });
  }

  if (!userId) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: SYSTEM_MESSAGES.AUTH_REQUIRED
    });
  }

  try {
    // Fetch group
    const [group] = await sql`
      SELECT * FROM groups WHERE id = ${groupId}
    `;

    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: SYSTEM_MESSAGES.GROUP_NOT_FOUND
      });
    }

    // Fetch membership
    const [membership] = await sql`
      SELECT * FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    if (!membership) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: SYSTEM_MESSAGES.USER_NOT_IN_GROUP
      });
    }

    req.group = group;
    req.membership = membership;
    req.isLeader = membership.role === ROLES.LEADER;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error validating workspace permissions.'
    });
  }
}

/**
 * Middleware ensuring user is a workspace LEADER
 */
async function requireGroupLeader(req, res, next) {
  if (!req.membership) {
    return requireGroupMembership(req, res, () => {
      if (!req.isLeader) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: SYSTEM_MESSAGES.LEADER_REQUIRED
        });
      }
      next();
    });
  }

  if (!req.isLeader) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: SYSTEM_MESSAGES.LEADER_REQUIRED
    });
  }
  next();
}

/**
 * Middleware ensuring user has 'editor' or 'admin' notebook-level access.
 *
 * Expects:
 *  - req.user          (set by authMiddleware)
 *  - req.membership    (set by requireGroupMembership)
 *  - req.params.id     (notebook ID in the route)
 *
 * Resolves the effective notebook role via notebookService.resolveNotebookRole()
 * and short-circuits with 403 when the role is 'viewer' or absent.
 */
async function requireNotebookEditorAccess(req, res, next) {
  const notebookId = req.params.id;
  const userId     = req.user && req.user.id;
  const groupRole  = req.membership && req.membership.role;

  if (!notebookId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Notebook ID is required.'
    });
  }

  try {
    // Lazy-require to avoid circular dependency issues at module load time
    const notebookService = require('../modules/notebook/notebook.service');
    const { NotebookModel } = require('../modules/notebook/notebook.model');

    const notebook = await NotebookModel.findById(notebookId);
    if (!notebook) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND
      });
    }

    const role = await notebookService.resolveNotebookRole(notebook, userId, groupRole);

    if (!role || role === 'viewer') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: SYSTEM_MESSAGES.NOTEBOOK_EDITOR_REQUIRED
      });
    }

    // Attach resolved role and notebook so downstream handlers can use them
    req.notebook     = notebook;
    req.notebookRole = role;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error validating notebook permissions.'
    });
  }
}

/**
 * Middleware: enforce task creation rules.
 *
 * Business rules:
 *  - LEADER  → can create tasks assigned to anyone (or unassigned).
 *  - MEMBER  → may only create tasks assigned to themselves.
 *              Assigning to someone else, or leaving assignee blank, is rejected.
 *
 * Expects:
 *  - req.user       (set by authMiddleware)
 *  - req.membership (set by requireGroupMembership)
 *  - req.body.assignedToUserId (optional; string or number)
 */
async function checkTaskCreationPermission(req, res, next) {
  const { role } = req.membership;
  const requesterId = req.user.id;
  const assignedTo  = req.body.assignedToUserId != null
    ? Number(req.body.assignedToUserId)
    : null;

  // Leaders have no restriction
  if (role === ROLES.LEADER) return next();

  // Members must assign to themselves
  if (assignedTo !== requesterId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: SYSTEM_MESSAGES.TASK_CREATION_DENIED
    });
  }

  next();
}

/**
 * Middleware: enforce task edit / status-move rules.
 *
 * Business rules:
 *  - LEADER       → can always edit any task.
 *  - Assigned user → can edit / move their own task.
 *  - Anyone else  → 403.
 *
 * Expects:
 *  - req.user       (set by authMiddleware)
 *  - req.membership (set by requireGroupMembership)
 *  - req.params.taskId  (task PK in the route)
 *
 * Side-effect: attaches the resolved task to req.task.
 */
async function checkTaskEditPermission(req, res, next) {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const { role } = req.membership;

  if (!taskId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'taskId is required.'
    });
  }

  try {
    const { TaskModel } = require('../modules/tasks/task.model');
    const task = await TaskModel.findById(taskId);

    if (!task) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: SYSTEM_MESSAGES.TASK_NOT_FOUND
      });
    }

    // Leaders can always edit
    if (role === ROLES.LEADER) {
      req.task = task;
      return next();
    }

    // Only the assigned user can edit their own task
    if (task.assigned_to_user_id !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: SYSTEM_MESSAGES.TASK_EDIT_DENIED
      });
    }

    req.task = task;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error validating task permissions.'
    });
  }
}

module.exports = {
  requireGroupMembership,
  requireGroupLeader,
  requireNotebookEditorAccess,
  checkTaskCreationPermission,
  checkTaskEditPermission
};
