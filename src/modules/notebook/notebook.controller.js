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
    const notebooks = await notebookService.getGroupNotebooks(
      req.params.groupId,
      req.user.id
    );
    return res.status(HTTP_STATUS.OK).json({ success: true, data: notebooks });
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
 * GET /api/notebooks/:id/pages
 * Fetch all pages for a notebook (requires at least viewer access).
 */
async function getPages(req, res) {
  try {
    const { notebook, pages } = await notebookService.getNotebookPages(
      req.params.id,
      req.user.id,
      req.membership.role
    );
    return res.status(HTTP_STATUS.OK).json({ success: true, data: { notebook, pages } });
  } catch (error) {
    return res.status(errorStatus(error)).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/notebooks/:id/pages
 * Add a page to a notebook (requires editor or admin).
 *
 * Body: { title, content?, position? }
 */
async function createPage(req, res) {
  try {
    const { title, content, position } = req.body;

    const page = await notebookService.createPage({
      notebookId:   req.params.id,
      title,
      content,
      position,
      authorUserId: req.user.id,
      authorName:   req.user.full_name,
      groupRole:    req.membership.role
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
 * Update a page's content (requires editor or admin).
 *
 * Body: { title?, content?, position? }
 */
async function updatePage(req, res) {
  try {
    const { title, content, position } = req.body;

    const page = await notebookService.updatePage({
      pageId:       req.params.pageId,
      notebookId:   req.params.id,
      title,
      content,
      position,
      editorUserId: req.user.id,
      editorName:   req.user.full_name,
      groupRole:    req.membership.role
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
 * DELETE /api/notebooks/:id/pages/:pageId
 * Delete a page (requires editor or admin).
 */
async function deletePage(req, res) {
  try {
    await notebookService.deletePage({
      pageId:     req.params.pageId,
      notebookId: req.params.id,
      userId:     req.user.id,
      groupRole:  req.membership.role
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
 *
 * Body: {
 *   notebookId  : number,   // Parent notebook ID (used for access check & filename)
 *   pageId      : number,   // Page to export
 *   htmlContent : string,   // Raw Quill editor HTML from the client
 *   title       : string,   // Page title (becomes H1 + filename)
 *   font?       : string,   // Optional: 'Arial' | 'Calibri' | 'Times New Roman'
 *   lineHeight? : number,   // Optional: 1.0 | 1.15 | 1.5 | 2.0
 * }
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

    if (!notebookId || !pageId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'notebookId and pageId are required.'
      });
    }

    // Verify page exists and belongs to this notebook (server-side guard)
    const { title: resolvedTitle } = await notebookExport.resolvePageForExport(pageId, notebookId);

    // Use client-supplied title if present (may be dirty/unsaved); fall back to DB title
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
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notes
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
    const { title, content, tags, isPinned } = req.body;
    const note = await notebookService.createNote({
      groupId,
      title,
      content,
      tags,
      isPinned,
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
    const { title, content, tags, isPinned } = req.body;
    const note = await notebookService.updateNote({
      noteId,
      groupId,
      title,
      content,
      tags,
      isPinned,
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
  getPages,
  createPage,
  updatePage,
  deletePage,
  exportDocx,
  // Legacy / Dashboard note handlers:
  getNotes,
  create,
  update,
  remove
};

