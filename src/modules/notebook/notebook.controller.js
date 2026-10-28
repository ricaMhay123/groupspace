/**
 * Collaborative Notebook Controller
 *
 * Handlers for /api/notebooks routes.
 * All business logic lives in notebook.service.js.
 */

'use strict';

const notebookService  = require('./notebook.service');
const notebookExport   = require('./notebook.export');
const { HTTP_STATUS }  = require('../../config/constants');
const sql              = require('../../config/db.config');

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Pick the right HTTP status from a service error.
 * Service layer attaches `err.httpStatus` for domain errors; fall back to 500.
 */
function errorStatus(err) {
  return err.httpStatus || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

// ─── Notebook CRUD ─────────────────────────────────────────────────────────────

/**
 * GET /api/notebooks/:groupId
 * Returns notebooks the authenticated user can see in the workspace.
 */
async function getGroupNotebooks(req, res) {
  try {
    const groupId = req.params.groupId;
    const notebooks = await notebookService.getGroupNotebooks(groupId, req.user.id);
    const flatNotes = await notebookService.getGroupNotes(groupId, req.query.search);
    const folders   = await notebookService.getGroupFolders(groupId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notebooks,
      notebooks,
      notes: flatNotes,
      folders
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/notebooks
 * Create a new notebook inside a workspace.
 *
 * Body: { groupId, title, description?, visibility? }
 */
async function createNotebook(req, res) {
  try {
    const { groupId, title, description, visibility } = req.body;

    if (!groupId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'groupId is required.'
      });
    }

    const notebook = await notebookService.createNotebook({
      groupId,
      title,
      description,
      visibility,
      createdByUserId: req.user.id,
      creatorName:     req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Notebook created successfully.',
      data: notebook
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/notebooks/:id/permissions
 * Update share settings and/or individual member roles.
 * Requires notebook 'admin' role (enforced at service level, and again by middleware).
 *
 * Body: { visibility?, grants?: [{ userId, role }] }
 */
async function updatePermissions(req, res) {
  try {
    const { visibility, grants } = req.body;

    const result = await notebookService.updateNotebookPermissions({
      notebookId:     req.params.id,
      actorUserId:    req.user.id,
      actorGroupRole: req.membership.role,
      visibility,
      grants: grants || []
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notebook permissions updated.',
      data: result
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/notebooks/:id
 * Permanently deletes a notebook and all its pages / permission rows.
 * Requires notebook 'admin' role (enforced at service level, and again by middleware).
 */
async function deleteNotebook(req, res) {
  try {
    await notebookService.deleteNotebook({
      notebookId: req.params.id,
      userId:     req.user.id,
      groupRole:  req.membership.role,
      userName:   req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notebook deleted successfully.'
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

// ─── Page Sub-Resource ─────────────────────────────────────────────────────────

/**
 * GET /api/notebooks/:id/pages and GET /api/notebooks/pages/:notebookId
 * Fetch all pages for a notebook (requires at least viewer access).
 */
async function getPages(req, res) {
  try {
    let notebookId = req.params.notebookId || req.params.id || req.query.notebookId;
    let groupId = req.query.groupId || req.query.workspaceId || req.query.workspace_id || req.params.groupId || req.body?.groupId;

    // If notebookId is provided, verify whether it's a notebook or if it points to a group
    if (notebookId && !groupId) {
      try {
        const [nb] = await sql`SELECT group_id FROM notebooks WHERE id = ${notebookId}`;
        if (nb) {
          groupId = nb.group_id;
        } else {
          const [grp] = await sql`SELECT id FROM groups WHERE id = ${notebookId}`;
          if (grp) {
            groupId = grp.id;
            notebookId = null;
          }
        }
      } catch (e) {}
    }

    // If notebookId isn't given directly, find the primary notebook for this group
    if (!notebookId && groupId) {
      try {
        const existing = await notebookService.getGroupNotebooks(groupId, req.user.id);
        if (existing && existing.length > 0) {
          notebookId = existing[0].id;
        }
      } catch (e) {}
    }

    if (!notebookId) {
      return res.status(HTTP_STATUS.OK).json({ success: true, data: { notebook: null, pages: [] }, pages: [] });
    }

    let notebook = null;
    let pages = [];
    let folders = [];
    try {
      const result = await notebookService.getNotebookPages(
        notebookId,
        req.user.id,
        req.membership?.role || 'MEMBER'
      );
      notebook = result.notebook;
      pages = result.pages || [];
      if (notebook && notebook.group_id) {
        folders = await notebookService.getGroupFolders(notebook.group_id);
      } else if (groupId) {
        folders = await notebookService.getGroupFolders(groupId);
      }
    } catch (err) {
      // Empty or non-existent notebook: return empty list safely instead of 500 / 404
      return res.status(HTTP_STATUS.OK).json({ success: true, data: { notebook: null, pages: [], folders: [] }, pages: [], folders: [] });
    }

    return res.status(HTTP_STATUS.OK).json({ success: true, data: { notebook, pages, folders }, pages, folders });
  } catch (error) {
    return res.status(HTTP_STATUS.OK).json({ success: true, data: { notebook: null, pages: [], folders: [] }, pages: [], folders: [] });
  }
}

// ─── Folder Sub-Resource ──────────────────────────────────────────────────────

async function getFolders(req, res) {
  try {
    const groupId = req.params.groupId || req.query.groupId || req.body?.groupId;
    if (!groupId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'groupId is required.' });
    }
    const folders = await notebookService.getGroupFolders(groupId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: folders });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

async function createFolder(req, res) {
  try {
    const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
    const { name, notebookId } = req.body;
    if (!groupId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'groupId is required.' });
    }
    const folder = await notebookService.createFolder({
      groupId,
      notebookId,
      name,
      userId: req.user.id,
      userName: req.user.full_name
    });
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Folder created successfully.',
      data: folder
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

async function deleteFolder(req, res) {
  try {
    const folderId = req.params.folderId || req.params.id;
    const groupId = req.params.groupId || req.query.groupId || req.body?.groupId;
    await notebookService.deleteFolder({
      folderId,
      groupId,
      userId: req.user.id,
      userRole: req.membership?.role,
      userName: req.user.full_name
    });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Folder and all notes inside it deleted.'
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/notebooks/:id/pages and POST /api/notebooks/pages
 * Add a page to a notebook.
 *
 * Body: { title?, content?, position?, folderId?, groupId? }
 */
async function createPage(req, res) {
  try {
    let notebookId = req.params.id || req.params.notebookId || req.body.notebookId || req.query.notebookId;
    let groupId = req.body.groupId || req.body.workspaceId || req.body.workspace_id
      || req.query.groupId || req.query.workspaceId || req.query.workspace_id
      || req.params.groupId;

    // Resolve groupId from notebookId if missing
    if (notebookId && !groupId) {
      try {
        const [nb] = await sql`SELECT group_id FROM notebooks WHERE id = ${notebookId}`;
        if (nb) {
          groupId = nb.group_id;
        } else {
          const [grp] = await sql`SELECT id FROM groups WHERE id = ${notebookId}`;
          if (grp) {
            groupId = grp.id;
            notebookId = null;
          }
        }
      } catch (e) {}
    }

    // If groupId is provided, ensure a notebook exists
    if (!notebookId && groupId) {
      const existing = await notebookService.getGroupNotebooks(groupId, req.user.id);
      if (existing && existing.length > 0) {
        notebookId = existing[0].id;
      } else {
        const nb = await notebookService.createNotebook({
          groupId,
          title: 'Workspace Notebook',
          description: 'Default notebook',
          visibility: 'shared',
          createdByUserId: req.user.id,
          creatorName: req.user.full_name
        });
        notebookId = nb.id;
      }
    }

    if (!notebookId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Workspace ID (groupId) or notebookId is required to add a page.'
      });
    }

    const { title, content, position, folderId, folder_id, permittedEditors, permitted_editors } = req.body;

    const page = await notebookService.createPage({
      notebookId,
      folderId: folderId !== undefined ? folderId : folder_id,
      title,
      content,
      position,
      permittedEditors: permittedEditors !== undefined ? permittedEditors : permitted_editors,
      authorUserId: req.user.id,
      authorName:   req.user.full_name,
      groupRole:    req.membership?.role || 'MEMBER'
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Page created successfully.',
      data: page
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/notebooks/:id/pages/:pageId
 * Update a page's content, folder, or permissions.
 */
async function updatePage(req, res) {
  try {
    const { title, content, position, folderId, folder_id, permittedEditors, permitted_editors } = req.body;

    const page = await notebookService.updatePage({
      pageId:           req.params.pageId,
      notebookId:       req.params.id,
      folderId:         folderId !== undefined ? folderId : folder_id,
      title,
      content,
      position,
      permittedEditors: permittedEditors !== undefined ? permittedEditors : permitted_editors,
      editorUserId:     req.user.id,
      editorName:       req.user.full_name,
      groupRole:        req.membership?.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Page updated.',
      data: page
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/notebooks/pages/:pageId/permissions
 * Update granular creator-based permitted_editors for a page or note.
 */
async function updatePagePermissions(req, res) {
  try {
    const pageId = req.params.pageId || req.params.noteId || req.params.id;
    const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
    const permittedEditors = req.body.permittedEditors !== undefined
      ? req.body.permittedEditors
      : req.body.permitted_editors;

    const updated = await notebookService.updatePagePermissions({
      pageId,
      groupId,
      actorUserId: req.user.id,
      actorRole: req.membership?.role,
      permittedEditors
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Page share permissions updated.',
      data: updated
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/notebooks/:id/pages/:pageId
 * Delete a page (creator or leader).
 */
async function deletePage(req, res) {
  try {
    await notebookService.deletePage({
      pageId:     req.params.pageId,
      notebookId: req.params.id,
      userId:     req.user.id,
      groupRole:  req.membership?.role
    });

    return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Page deleted.' });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

// ─── Export Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/notebooks/export/docx
 * Generate and stream a .docx file for a single notebook page.
 */
async function exportDocx(req, res) {
  try {
    const {
      notebookId,
      pageId,
      htmlContent,
      title,
      font       = 'Arial, sans-serif',
      lineHeight = 1.5,
    } = req.body;

    let resolvedTitle = 'Untitled Page';
    if (notebookId && pageId) {
      try {
        const resolved = await notebookExport.resolvePageForExport(pageId, notebookId);
        resolvedTitle = resolved.title;
      } catch (e) {
        // Fallback to client-supplied title if page is unsaved or in flat notes table
      }
    }

    const documentTitle = (title || resolvedTitle || 'Untitled Page').trim();

    // Build .docx buffer
    const docxBuffer = await notebookExport.generateDocx({
      title:       documentTitle,
      htmlContent: htmlContent || '',
      font,
      lineHeight:  Number(lineHeight) || 1.5,
      creator:     req.user?.full_name || 'GroupSpace',
    });

    // Sanitise filename: strip non-word chars, collapse spaces
    const safeFilename = documentTitle
      .replace(/[<>:"/\\|?*]+/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100);

    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.docx"`);
    res.setHeader('Content-Length',      docxBuffer.length);
    res.setHeader('Cache-Control',       'no-store');

    return res.end(docxBuffer);
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

// ─── Legacy / Flat Note Handlers (for /api/groups/:groupId/notes) ─────────────

async function getNotes(req, res) {
  try {
    const groupId = req.params.groupId;
    const notes = await notebookService.getGroupNotes(groupId, req.query.search);
    const folders = await notebookService.getGroupFolders(groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notes,
      folders
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    const { title, content, tags, isPinned, folderId, folder_id, permittedEditors, permitted_editors } = req.body;
    const note = await notebookService.createNote({
      groupId,
      folderId: folderId !== undefined ? folderId : folder_id,
      title,
      content,
      tags,
      isPinned,
      permittedEditors: permittedEditors !== undefined ? permittedEditors : permitted_editors,
      authorUserId: req.user.id,
      authorName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Note created successfully.',
      data: note
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const groupId = req.params.groupId;
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned, folderId, folder_id, permittedEditors, permitted_editors } = req.body;
    const note = await notebookService.updateNote({
      noteId,
      groupId,
      folderId: folderId !== undefined ? folderId : folder_id,
      title,
      content,
      tags,
      isPinned,
      permittedEditors: permittedEditors !== undefined ? permittedEditors : permitted_editors,
      userId: req.user.id,
      userRole: req.membership?.role,
      userName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Note updated.',
      data: note
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const groupId = req.params.groupId;
    const noteId = req.params.noteId;
    await notebookService.deleteNote({
      noteId,
      groupId,
      userId: req.user.id,
      userRole: req.membership?.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Note deleted.'
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getGroupNotebooks,
  createNotebook,
  updatePermissions,
  deleteNotebook,
  getFolders,
  createFolder,
  deleteFolder,
  getPages,
  createPage,
  updatePage,
  updatePagePermissions,
  deletePage,
  exportDocx,
  // Legacy / Dashboard note handlers:
  getNotes,
  create,
  update,
  remove
};

