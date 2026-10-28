/**
 * GroupSpace Application Constants & Status Codes
 */

const ROLES = {
  LEADER: 'leader',        // Workspace owner / primary leader
  CO_LEADER: 'co_leader',  // Administrative co-leader (tasks, approvals, expenses)
  MEMBER: 'member'         // Standard workspace collaborator
};

/** True for roles with administrative capabilities ('leader' and 'co_leader'). */
function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === ROLES.LEADER || r === ROLES.CO_LEADER;
}

// Granular notebook-level permission roles
const NOTEBOOK_ROLES = {
  VIEWER: 'viewer',  // Can read notebook & pages
  EDITOR: 'editor',  // Can create / edit / delete pages
  ADMIN:  'admin'    // Full control: share settings, invite members, delete notebook
};

// Notebook workspace-wide visibility modes
const NOTEBOOK_VISIBILITY = {
  PRIVATE: 'private',  // Only explicitly invited members can see it
  SHARED:  'shared'    // All workspace members can view; only permitted roles can edit
};

const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Marked done by assignee, awaiting Leader approval
  DONE: 'DONE'                          // Final approved status
};

const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

// Peer-assist offer states (task_assistants.status)
const ASSIST_STATUS = {
  OFFERED:  'offered',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
};

const EXPENSE_SPLIT_TYPE = {
  EQUAL: 'EQUAL',
  EXACT: 'EXACT'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

const SYSTEM_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required. Please log in.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHORIZED_ACTION: 'You do not have permission to perform this action.',
  LEADER_REQUIRED: 'Only a workspace Leader can perform this action.',
  GROUP_NOT_FOUND: 'Workspace not found.',
  USER_NOT_IN_GROUP: 'You are not a member of this workspace.',
  NOTEBOOK_NOT_FOUND: 'Notebook not found.',
  NOTEBOOK_ACCESS_DENIED: 'You do not have access to this notebook.',
  NOTEBOOK_EDITOR_REQUIRED: 'You need editor or admin access to modify this notebook.',
  NOTEBOOK_ADMIN_REQUIRED: 'Only a notebook admin can manage permissions.',
  // Task workflow messages
  TASK_NOT_FOUND: 'Task not found in this workspace.',
  TASK_CREATION_DENIED: 'Members may only create tasks assigned to themselves.',
  TASK_EDIT_DENIED: 'Only the assigned member or a workspace Leader can edit this task.',
  TASK_NOT_PENDING: 'This task is not awaiting approval.',
  TASK_ALREADY_FLAGGED: 'This task is already flagged as blocked.',
  TASK_NOT_FLAGGED: 'This task is not currently flagged — no assistance is needed.',
  TASK_SELF_ASSIST: 'You cannot offer peer assistance on your own task.',
  TASK_ASSIST_EXISTS: 'You have already offered assistance on this task.',
  TASK_ASSIST_NOT_FOUND: 'Assist offer not found.',
  TASK_ASSIST_RESPOND_DENIED: 'Only the assigned member or a workspace Leader can respond to assist offers.'
};

module.exports = {
  isAdminRole,
  ROLES,
  NOTEBOOK_ROLES,
  NOTEBOOK_VISIBILITY,
  TASK_STATUS,
  TASK_PRIORITY,
  ASSIST_STATUS,
  EXPENSE_SPLIT_TYPE,
  HTTP_STATUS,
  SYSTEM_MESSAGES
};
