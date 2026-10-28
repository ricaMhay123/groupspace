/**
 * Collaborative Notebook Service
 *
 * Business logic for the /api/notebooks resource.
 * All DB access is delegated to notebook.model.js — no raw SQL here.
 */

'use strict';

const { NoteModel, NotebookModel, NotebookFolderModel, NotebookPageModel, NotebookPermissionModel } = require('./notebook.model');
const GroupModel   = require('../groups/group.model');
const { ROLES, NOTEBOOK_ROLES, NOTEBOOK_VISIBILITY, SYSTEM_MESSAGES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Automatically extract the page title from the first non-empty word/phrase/sentence
 * of content if an explicit title is not provided.
 */
function extractAutoTitleFromContent(title, content) {
  const cleanExplicit = sanitizeText(title);
  if (cleanExplicit) return cleanExplicit;

  if (!content) return 'Untitled Page';
  const stripped = String(content)
    .replace(/^<!--GS_SHAPES_JSON:.*?-->/s, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();

  if (!stripped) return 'Untitled Page';
  const lines = stripped.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return 'Untitled Page';

  const firstLine = lines[0];
  const sentenceMatch = firstLine.match(/^(.+?[.!?])(\s|$)/);
  let candidate = sentenceMatch ? sentenceMatch[1] : firstLine;
  if (candidate.length > 55) {
    candidate = candidate.slice(0, 52) + '...';
  }
  return sanitizeText(candidate) || 'Untitled Page';
}

/**
 * Granular Creator-Based Page Permission Check:
 * Only the original page creator (created_by === userId), explicitly permitted members
 * in permitted_editors, or workspace Leaders can edit/save the note canvas.
 */
function canUserEditPage(item, userId, groupRole) {
  if (!item || !userId) return false;
  const role = String(groupRole || '').toLowerCase();
  if (role === ROLES.LEADER) return true;

  const creatorId = item.created_by ?? item.author_user_id;
  if (creatorId !== null && creatorId !== undefined && Number(creatorId) === Number(userId)) {
    return true;
  }

  const permitted = Array.isArray(item.permitted_editors)
    ? item.permitted_editors.map(Number)
    : [];
  if (permitted.includes(Number(userId))) {
    return true;
  }

  return false;
}

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

// ─── Folder Operations ─────────────────────────────────────────────────────────

async function getGroupFolders(groupId) {
  return await NotebookFolderModel.findByGroup(Number(groupId));
}

async function createFolder({ groupId, notebookId, name, userId, userName }) {
  const cleanName = sanitizeText(name);
  if (!cleanName) {
    throw Object.assign(new Error('Folder name is required.'), { httpStatus: 400 });
  }

  const folder = await NotebookFolderModel.create({
    groupId: Number(groupId),
    notebookId: notebookId ? Number(notebookId) : null,
    name: cleanName,
    createdByUserId: userId
  });

  try {
    await GroupModel.logActivity({
      groupId: Number(groupId),
      userId,
      actionType: 'NOTEBOOK_FOLDER_CREATED',
      description: `${userName || 'A member'} created notebook folder: "${cleanName}".`
    });
  } catch (e) {}

  return folder;
}

async function deleteFolder({ folderId, groupId, userId, userRole, userName }) {
  const folder = await NotebookFolderModel.findById(folderId);
  if (!folder || Number(folder.group_id) !== Number(groupId)) {
    throw Object.assign(new Error('Folder not found in this workspace.'), { httpStatus: 404 });
  }

  const role = String(userRole || '').toLowerCase();
  if (folder.created_by_user_id && Number(folder.created_by_user_id) !== Number(userId) && role !== ROLES.LEADER) {
    throw accessDenied('Only the folder creator or a workspace Leader can delete this folder.');
  }

  await NotebookFolderModel.delete(folderId, Number(groupId));

  try {
    await GroupModel.logActivity({
      groupId: Number(groupId),
      userId,
      actionType: 'NOTEBOOK_FOLDER_DELETED',
      description: `${userName || 'A member'} deleted notebook folder "${folder.name}" and its pages.`
    });
  } catch (e) {}

  return { success: true };
}

// ─── Page Operations ───────────────────────────────────────────────────────────

async function getNotebookPages(notebookId, userId, groupRole) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const role = await resolveNotebookRole(notebook, userId, groupRole);
  if (!role) throw accessDenied();

  const pages = await NotebookPageModel.findByNotebook(notebookId);
  return { notebook, pages };
}

async function createPage({ notebookId, folderId, title, content, position, authorUserId, authorName, groupRole, permittedEditors }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  // Any workspace member with access to the notebook can create a new page (they become its creator)
  const role = await resolveNotebookRole(notebook, authorUserId, groupRole);
  if (!role) {
    throw accessDenied(SYSTEM_MESSAGES.NOTEBOOK_ACCESS_DENIED);
  }

  const cleanTitle = extractAutoTitleFromContent(title, content);

  const page = await NotebookPageModel.create({
    notebookId,
    folderId:         folderId || null,
    title:            cleanTitle,
    content:          content || '',
    position:         position ?? 0,
    authorUserId,
    permittedEditors: Array.isArray(permittedEditors) ? permittedEditors : []
  });

  try {
    await GroupModel.logActivity({
      groupId:    notebook.group_id,
      userId:     authorUserId,
      actionType: 'NOTEBOOK_PAGE_CREATED',
      description: `${authorName || 'A member'} added page "${cleanTitle}" to notebook "${notebook.title}".`
    });
  } catch (e) {}

  return page;
}

async function updatePage({ pageId, notebookId, folderId, title, content, position, permittedEditors, editorUserId, editorName, groupRole }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const page = await NotebookPageModel.findById(pageId);
  if (!page || page.notebook_id !== Number(notebookId)) {
    throw Object.assign(new Error('Page not found in this notebook.'), { httpStatus: 404 });
  }

  // Enforce Granular Creator-Based Page Permissions:
  // Only page creator (created_by === editorUserId), permitted_editors, or workspace Leader can edit/save
  if (!canUserEditPage(page, editorUserId, groupRole)) {
    throw accessDenied('Read-Only Mode: Only the page creator, permitted editors, or a workspace Leader can edit this page.');
  }

  const resolvedTitle = (title !== undefined || content !== undefined)
    ? extractAutoTitleFromContent(title, content !== undefined ? content : page.content)
    : undefined;

  return await NotebookPageModel.update(pageId, {
    title:            resolvedTitle,
    content,
    position,
    folderId,
    permittedEditors,
    editorUserId
  });
}

async function deletePage({ pageId, notebookId, userId, groupRole }) {
  const notebook = await NotebookModel.findById(notebookId);
  if (!notebook) throw Object.assign(new Error(SYSTEM_MESSAGES.NOTEBOOK_NOT_FOUND), { httpStatus: 404 });

  const page = await NotebookPageModel.findById(pageId);
  if (!page || page.notebook_id !== Number(notebookId)) {
    throw Object.assign(new Error('Page not found.'), { httpStatus: 404 });
  }

  const role = String(groupRole || '').toLowerCase();
  const creatorId = page.created_by ?? page.author_user_id;
  if (Number(creatorId) !== Number(userId) && role !== ROLES.LEADER) {
    throw accessDenied('Only the page creator or a workspace Leader can delete this page.');
  }

  await NotebookPageModel.delete(pageId);
  return { success: true };
}

/**
 * Granular Page / Note Share Permissions Update
 * Only the original creator or a workspace Leader can update permitted_editors.
 */
async function updatePagePermissions({ pageId, groupId, actorUserId, actorRole, permittedEditors }) {
  const cleanEditors = Array.isArray(permittedEditors)
    ? [...new Set(permittedEditors.map(Number).filter(n => !isNaN(n) && n > 0))]
    : [];
  const isLeader = String(actorRole || '').toLowerCase() === ROLES.LEADER;

  // Check in notebook_pages first
  const page = await NotebookPageModel.findById(pageId);
  if (page) {
    const creatorId = page.created_by ?? page.author_user_id;
    if (Number(creatorId) !== Number(actorUserId) && !isLeader) {
      throw accessDenied('Only the page creator or a workspace Leader can manage share permissions.');
    }
    const updatedPage = await NotebookPageModel.update(pageId, {
      permittedEditors: cleanEditors,
      editorUserId: actorUserId
    });
    // Also sync legacy notes table if a matching note exists
    try {
      const note = await NoteModel.findById(pageId);
      if (note && (!groupId || Number(note.group_id) === Number(groupId))) {
        await NoteModel.update(pageId, { permitted_editors: cleanEditors });
      }
    } catch (e) {}
    return updatedPage;
  }

  // Fallback: check in legacy notes table
  const note = await NoteModel.findById(pageId);
  if (!note || (groupId && Number(note.group_id) !== Number(groupId))) {
    throw Object.assign(new Error('Note or page not found.'), { httpStatus: 404 });
  }
  const creatorId = note.created_by ?? note.author_user_id;
  if (Number(creatorId) !== Number(actorUserId) && !isLeader) {
    throw accessDenied('Only the note creator or a workspace Leader can manage share permissions.');
  }
  return await NoteModel.update(pageId, { permitted_editors: cleanEditors });
}

// ─── Legacy / Flat Note Services (Dashboard Workspace Notes) ───────────────────

async function createNote({ groupId, folderId, title, content, tags, isPinned, authorUserId, authorName, permittedEditors }) {
  const cleanTitle = extractAutoTitleFromContent(title, content);

  const note = await NoteModel.create({
    groupId: Number(groupId),
    folderId: folderId || null,
    title: cleanTitle,
    content: content || '',
    tags: sanitizeText(tags),
    isPinned: Boolean(isPinned),
    authorUserId,
    permittedEditors: Array.isArray(permittedEditors) ? permittedEditors : []
  });

  try {
    await GroupModel.logActivity({
      groupId: Number(groupId),
      userId: authorUserId,
      actionType: 'NOTE_CREATED',
      description: `${authorName || 'A member'} created notebook page: "${cleanTitle}".`
    });
  } catch (e) {}

  return note;
}

async function getGroupNotes(groupId, searchQuery) {
  return await NoteModel.findByGroup(Number(groupId), searchQuery);
}

async function updateNote({ noteId, groupId, folderId, title, content, tags, isPinned, permittedEditors, userId, userRole, userName }) {
  const note = await NoteModel.findById(noteId);
  if (!note || note.group_id !== Number(groupId)) {
    throw Object.assign(new Error('Note not found in this workspace.'), { httpStatus: 404 });
  }

  if (!canUserEditPage(note, userId, userRole)) {
    throw accessDenied('Read-Only Mode: Only the note creator, permitted editors, or a workspace Leader can edit this note.');
  }

  const updates = {};
  if (title !== undefined || content !== undefined) {
    updates.title = extractAutoTitleFromContent(title, content !== undefined ? content : note.content);
  }
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = sanitizeText(tags);
  if (isPinned !== undefined) updates.is_pinned = isPinned ? 1 : 0;
  if (folderId !== undefined) updates.folder_id = folderId;
  if (permittedEditors !== undefined) updates.permitted_editors = permittedEditors;

  const updated = await NoteModel.update(noteId, updates);

  try {
    await GroupModel.logActivity({
      groupId: Number(groupId),
      userId,
      actionType: 'NOTE_UPDATED',
      description: `${userName || 'A member'} updated note: "${updates.title || note.title}".`
    });
  } catch (e) {}

  return updated;
}

async function deleteNote({ noteId, groupId, userId, userRole }) {
  const note = await NoteModel.findById(noteId);
  if (!note || note.group_id !== Number(groupId)) {
    throw Object.assign(new Error('Note not found.'), { httpStatus: 404 });
  }

  const role = String(userRole || '').toLowerCase();
  // Only the author or a workspace leader can delete a note
  if (Number(note.author_user_id) !== Number(userId) && role !== ROLES.LEADER) {
    throw Object.assign(new Error('You do not have permission to delete this note.'), { httpStatus: 403 });
  }

  await NoteModel.delete(noteId);
  return { success: true };
}

module.exports = {
  extractAutoTitleFromContent,
  canUserEditPage,
  resolveNotebookRole,
  getGroupNotebooks,
  createNotebook,
  updateNotebookPermissions,
  deleteNotebook,
  getGroupFolders,
  createFolder,
  deleteFolder,
  getNotebookPages,
  createPage,
  updatePage,
  deletePage,
  updatePagePermissions,
  // Legacy / Dashboard note exports:
  createNote,
  getGroupNotes,
  updateNote,
  deleteNote
};
