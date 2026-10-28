/**
 * GroupSpace Role Middleware
 * Validates group membership and leader permissions.
 */

const sql = require('../config/db.config');
const { ROLES, HTTP_STATUS, SYSTEM_MESSAGES } = require('../config/constants');
const { isAdminRole } = require('../config/constants');

/**
 * Middleware ensuring user is a member of the group specified in req.params.groupId (or req.body.groupId)
 */
async function requireGroupMembership(req, res, next) {
  let groupId = req.params.groupId
    || req.params.workspaceId
    || req.params.workspace_id
    || (req.baseUrl && req.baseUrl.includes('/groups') ? req.params.id : null)
    || req.body?.groupId
    || req.body?.workspaceId
    || req.body?.workspace_id
    || req.query?.groupId
    || req.query?.workspaceId
    || req.query?.workspace_id
    || req.headers?.['x-group-id']
    || req.headers?.['x-workspace-id'];
  const taskId = req.params.taskId || (req.baseUrl && req.baseUrl.includes('/tasks') ? req.params.id : null);
  const userId = req.user && req.user.id;

  // If mounted at /api/tasks/:id/flag, resolve groupId from tasks table
  if (!groupId && taskId) {
    try {
      const [taskRow] = await sql`SELECT group_id FROM tasks WHERE id = ${taskId}`;
      if (taskRow) {
        groupId = taskRow.group_id;
        req.params.groupId = groupId;
      }
    } catch (e) {}
  }

  // Resolve groupId from commentId when present
  const commentId = req.params.commentId;
  if (!groupId && commentId) {
    try {
      const [cRow] = await sql`
        SELECT d.group_id 
        FROM discussion_comments c 
        JOIN discussions d ON c.discussion_id = d.id 
        WHERE c.id = ${Number(commentId)}
      `;
      if (cRow) {
        groupId = cRow.group_id;
        req.params.groupId = groupId;
      }
    } catch (e) {}
  }

  // Resolve groupId from folderId when mounted on notebook folder routes
  const candidateFolderId = req.params.folderId || req.body?.folderId;
  if (!groupId && candidateFolderId && !isNaN(Number(candidateFolderId))) {
    try {
      const [fld] = await sql`SELECT group_id FROM notebook_folders WHERE id = ${Number(candidateFolderId)}`;
      if (fld && fld.group_id) {
        groupId = fld.group_id;
        req.params.groupId = groupId;
      }
    } catch (e) {}
  }

  // Resolve groupId from pageId when mounted on notebook page routes
  const candidatePageId = req.params.pageId || req.body?.pageId;
  if (!groupId && candidatePageId && !isNaN(Number(candidatePageId))) {
    try {
      const [pg] = await sql`
        SELECT nb.group_id FROM notebook_pages p
        JOIN notebooks nb ON p.notebook_id = nb.id
        WHERE p.id = ${Number(candidatePageId)}
      `;
      if (pg && pg.group_id) {
        groupId = pg.group_id;
        req.params.groupId = groupId;
      } else {
        const [nt] = await sql`SELECT group_id FROM notes WHERE id = ${Number(candidatePageId)}`;
        if (nt && nt.group_id) {
          groupId = nt.group_id;
          req.params.groupId = groupId;
        }
      }
    } catch (e) {}
  }

  // Resolve groupId from notebook ID when mounted on notebook routes
  const candidateNbId = req.params.notebookId || req.params.id || req.body?.notebookId || req.query?.notebookId;
  if (!groupId && candidateNbId && !isNaN(Number(candidateNbId))) {
    try {
      const [nb] = await sql`SELECT group_id FROM notebooks WHERE id = ${Number(candidateNbId)}`;
      if (nb && nb.group_id) {
        groupId = nb.group_id;
        req.params.groupId = groupId;
      } else {
        const [grp] = await sql`SELECT id FROM groups WHERE id = ${Number(candidateNbId)}`;
        if (grp) {
          groupId = grp.id;
          req.params.groupId = groupId;
        }
      }
    } catch (e) {}
  }

  // Fallback: If groupId is still not provided but user is logged in
  if (!groupId && userId) {
    // If it's a GET request for pages, return safe empty array instead of 500 / error
    if (req.method === 'GET' && (req.path.includes('/pages') || req.baseUrl.includes('/notebooks'))) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { notebook: null, pages: [] },
        pages: []
      });
    }

    try {
      const [userGrp] = await sql`
        SELECT group_id FROM group_members WHERE user_id = ${userId} ORDER BY joined_at ASC LIMIT 1
      `;
      if (userGrp && userGrp.group_id) {
        groupId = userGrp.group_id;
        req.params.groupId = groupId;
      }
    } catch (e) {}
  }

  if (!groupId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Workspace ID is required.'
    });
  }

  req.params.groupId = String(groupId);
  req.groupId = Number(groupId);

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
    req.isLeader = isAdminRole(membership.role);
    req.isPrimaryLeader = String(membership.role || '').toLowerCase() === ROLES.LEADER;
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
 * Middleware ensuring user is the PRIMARY workspace Leader (role 'leader').
 * Used for owner-only actions: role changes, workspace settings, member removal, deletion.
 */
async function requireGroupPrimaryLeader(req, res, next) {
  const check = () => {
    if (!req.isPrimaryLeader) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Only the primary workspace Leader can perform this action.'
      });
    }
    next();
  };
  if (!req.membership) return requireGroupMembership(req, res, check);
  return check();
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
  const requesterId = Number(req.user.id); // identity comes from the JWT cookie, never the body
  const rawAssignee = req.body.assignedToUserId;
  const assignedTo  = (rawAssignee === undefined || rawAssignee === null || rawAssignee === '')
    ? null
    : Number(rawAssignee);

  // Leaders have no restriction
  if (isAdminRole(role)) return next();

  // Members: a blank assignee defaults to themselves
  if (assignedTo === null) {
    req.body.assignedToUserId = requesterId;
    return next();
  }

  // Members must never assign to anyone else
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

    if (!task || (req.params.groupId && String(task.group_id) !== String(req.params.groupId))) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: SYSTEM_MESSAGES.TASK_NOT_FOUND
      });
    }

    // Leaders can edit, but cannot start tasks assigned to teammates
    if (isAdminRole(role)) {
      if (req.body && req.body.status === 'IN_PROGRESS' && task.assigned_to_user_id && Number(task.assigned_to_user_id) !== Number(userId)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Leaders cannot start tasks assigned to teammates.'
        });
      }
      req.task = task;
      return next();
    }

    // Only the assigned user can edit their own task
    if (task.assigned_to_user_id == null || Number(task.assigned_to_user_id) !== Number(userId)) {
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
  requireGroupPrimaryLeader,
  requireNotebookEditorAccess,
  checkTaskCreationPermission,
  checkTaskEditPermission
};
