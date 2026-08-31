/**
 * GroupSpace Application Constants & Status Codes
 */

const ROLES = {
  LEADER: 'LEADER', // Workspace admin / leader
  MEMBER: 'MEMBER'  // Standard workspace collaborator
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
  INTERNAL_SERVER_ERROR: 500
};

const SYSTEM_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required. Please log in.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHORIZED_ACTION: 'You do not have permission to perform this action.',
  LEADER_REQUIRED: 'Only a workspace Leader can perform this action.',
  GROUP_NOT_FOUND: 'Workspace not found.',
  USER_NOT_IN_GROUP: 'You are not a member of this workspace.'
};

module.exports = {
  ROLES,
  TASK_STATUS,
  TASK_PRIORITY,
  EXPENSE_SPLIT_TYPE,
  HTTP_STATUS,
  SYSTEM_MESSAGES
};
