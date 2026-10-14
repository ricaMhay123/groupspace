/**
 * Collaborative Notebook Service
 *
 * Business logic for the /api/notebooks resource.
 * All DB access is delegated to notebook.model.js — no raw SQL here.
 */

'use strict';

const { NotebookModel, NotebookPageModel, NotebookPermissionModel } = require('./notebook.model');
const GroupModel   = require('../groups/group.model');
const { ROLES, NOTEBOOK_ROLES, NOTEBOOK_VISIBILITY, SYSTEM_MESSAGES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

// ─── Permission Helpers ────────────────────────────────────────────────────────

/**
 * Resolve the effective notebook role for a user.
 *
 * Priority order:
 *  1. Workspace LEADER always gets 'admin' on every notebook in their group.
 *  2. Notebook creator always gets 'admin'.
 *  3. Explicit notebook_permissions row.
 *  4. If notebook is 'shared' and user is a group member → implicit 'viewer'.
 *  5. Otherwise → null (no access).
 *
 * @param {object} notebook - notebook row from the DB
 * @param {number} userId   - requesting user's ID
 * @param {string} groupRole - workspace-level role ('LEADER' | 'MEMBER')
 * @returns {Promise<string|null>} role string or null
 */
async function resolveNotebookRole(notebook, userId, groupRole) {
  // Workspace leaders are implicit notebook admins
  if (groupRole === ROLES.LEADER) return NOTEBOOK_ROLES.ADMIN;

  // Creator is always an admin
  if (notebook.created_by_user_id === userId) return NOTEBOOK_ROLES.ADMIN;

  // Explicit permission grant takes precedence
  const grant = await NotebookPermissionModel.findOne(notebook.id, userId);
  if (grant) return grant.role;

  // Shared notebooks are readable by all group members
  if (notebook.visibility === NOTEBOOK_VISIBILITY.SHARED) return NOTEBOOK_ROLES.VIEWER;

  return null; // No access
}

/**
 * Throw a standardised 403 error when notebook access is denied.
 * Attach an `httpStatus` property so the controller can forward the right code.
 */
function accessDenied(message = SYSTEM_MESSAGES.NOTEBOOK_ACCESS_DENIED) {
  const err = new Error(message);
  err.httpStatus = 403;
  return err;
}

// ─── Service Functions ─────────────────────────────────────────────────────────

/**
 * GET /api/notebooks/:groupId
 * Returns all notebooks visible to the requesting user in the workspace.
 */
async function getGroupNotebooks(groupId, userId) {
  return await NotebookModel.findByGroupForUser(groupId, userId);
}

/**
 * POST /api/notebooks
 * Creates a new notebook and auto-grants the creator the 'admin' role.
 */
async function createNotebook({ groupId, title, description, visibility, createdByUserId, creatorName }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) throw new Error('Notebook title is required.');

  const safeVisibility = Object.values(NOTEBOOK_VISIBILITY).includes(visibility)
    ? visibility
    : NOTEBOOK_VISIBILITY.SHARED;

  const notebook = await NotebookModel.create({
    groupId,
    title: cleanTitle,
    description: description ? sanitizeText(description) : null,
    visibility: safeVisibility,
    createdByUserId
  });

  // Auto-grant creator the admin role so they can manage the notebook
  await NotebookPermissionModel.upsert({
    notebookId:      notebook.id,
    userId:          createdByUserId,
    role:            NOTEBOOK_ROLES.ADMIN,
    grantedByUserId: createdByUserId
  });

  await GroupModel.logActivity({
    groupId,
    userId: createdByUserId,
    actionType: 'NOTEBOOK_CREATED',
    description: `${creatorName || 'A member'} created notebook: "${cleanTitle}".`
  });

  return notebook;
}

/**
 * PUT /api/notebooks/:id/permissions
 *
 * Allows a notebook admin to:
 *  - Change the notebook's workspace-wide visibility ('shared' | 'private')
 *  - Grant / update individual member roles (viewer | editor | admin)
 *  - Revoke a member's explicit permission (pass role: null)
 *
 * Body shape:
 * {
 *   visibility?: 'shared' | 'private',
 *   grants?: [{ userId: number, role: 'viewer'|'editor'|'admin'|null }]
 * }
 */
async function updateNotebookPermissions({
  notebookId,
  actorUserId,
  actorGroupRole,
  visibility,
  grants = []
}) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  // Only admins can manage permissions
  const actorRole = await resolveNotebookRole(notebook, actorUserId, actorGroupRole);
  if (actorRole !== NOTEBOOK_ROLES.ADMIN) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_ADMIN_REQUIRED);
  }

  // Update visibility if provided
  let updatedNotebook = notebook;
  if (visibility !== undefined) {
    if (!Object.values(NOTEBOOK_VISIBILITY).includes(visibility)) {
      throw new Error(`Invalid visibility value. Must be one of: ${Object.values(NOTEBOOK_VISIBILITY).join(', ')}.`);
    }
    updatedNotebook = await NotebookModel.update(notebookId, { visibility });
  }

  // Process individual grants
  const processedGrants = [];
  for (const grant of grants) {
    if (!grant.userId) continue;

    if (grant.role === null || grant.role === 'revoke') {
      // Revoke — cannot revoke your own admin access
      if (Number(grant.userId) === actorUserId) {
        throw new Error('You cannot revoke your own admin access.');
      }
      await NotebookPermissionModel.revoke(notebookId, grant.userId);
      processedGrants.push({ userId: grant.userId, action: 'revoked' });
    } else {
      if (!Object.values(NOTEBOOK_ROLES).includes(grant.role)) {
        throw new Error(`Invalid role "${grant.role}". Must be one of: ${Object.values(NOTEBOOK_ROLES).join(', ')}.`);
      }
      const result = await NotebookPermissionModel.upsert({
        notebookId,
        userId:          grant.userId,
        role:            grant.role,
        grantedByUserId: actorUserId
      });
      processedGrants.push({ userId: grant.userId, role: result.role, action: 'granted' });
    }
  }

  const currentPermissions = await NotebookPermissionModel.findByNotebook(notebookId);

  return {
    notebook: updatedNotebook,
    permissions: currentPermissions,
    processed: processedGrants
  };
}

/**
 * DELETE /api/notebooks/:id
 * Only the notebook admin or a workspace LEADER can delete a notebook.
 * Cascade deletes all pages and permission rows automatically.
 */
async function deleteNotebook({ notebookId, userId, groupRole, userName }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, userId, groupRole);
  if (role !== NOTEBOOK_ROLES.ADMIN) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_ADMIN_REQUIRED);
  }

  await GroupModel.logActivity({
    groupId:    notebook.group_id,
    userId,
    actionType: 'NOTEBOOK_DELETED',
    description: `${userName || 'A member'} deleted notebook: "${notebook.title}".`
  });

  await NotebookModel.delete(notebookId);
  return { success: true };
}

// ─── Page Operations (bonus, used internally by extended routes) ───────────────

async function getNotebookPages(notebookId, userId, groupRole) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, userId, groupRole);
  if (!role) throw accessDenied();

  const pages = await NotebookPageModel.findByNotebook(notebookId);
  return { notebook, pages };
}

async function createPage({ notebookId, title, content, position, authorUserId, authorName, groupRole }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, authorUserId, groupRole);
  if (!role || role === NOTEBOOK_ROLES.VIEWER) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_EDITOR_REQUIRED);
  }

  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) throw new Error('Page title is required.');

  const page = await NotebookPageModel.create({
    notebookId,
    title:        cleanTitle,
    content:      content || '',
    position:     position ?? 0,
    authorUserId
  });

  await GroupModel.logActivity({
    groupId:    notebook.group_id,
    userId:     authorUserId,
    actionType: 'NOTEBOOK_PAGE_CREATED',
    description: `${authorName || 'A member'} added page "${cleanTitle}" to notebook "${notebook.title}".`
  });

  return page;
}

async function updatePage({ pageId, notebookId, title, content, position, editorUserId, editorName, groupRole }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, editorUserId, groupRole);
  if (!role || role === NOTEBOOK_ROLES.VIEWER) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_EDITOR_REQUIRED);
  }

  const page = await NotebookPageModel.findById(pageId);
  if (!page || page.notebook_id !== Number(notebookId)) {
    throw Object.assign(new Error('Page not found in this notebook.'), { httpStatus: 404 });
  }

  return await NotebookPageModel.update(pageId, {
    title:        title    !== undefined ? sanitizeText(title) : undefined,
    content,
    position,
    editorUserId
  });
}

async function deletePage({ pageId, notebookId, userId, groupRole }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, userId, groupRole);
  if (!role || role === NOTEBOOK_ROLES.VIEWER) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_EDITOR_REQUIRED);
  }

  const page = await NotebookPageModel.findById(pageId);
  if (!page || page.notebook_id !== Number(notebookId)) {
    throw Object.assign(new Error('Page not found.'), { httpStatus: 404 });
  }

  await NotebookPageModel.delete(pageId);
  return { success: true };
}

module.exports = {
  resolveNotebookRole,
  getGroupNotebooks,
  createNotebook,
  updateNotebookPermissions,
  deleteNotebook,
  getNotebookPages,
  createPage,
  updatePage,
  deletePage
};
