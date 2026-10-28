/**
 * Collaborative Notebook & Workspace Notes Routes
 *
 * Supports two mount points in app.js:
 *   1. /api/notebooks                   — Collaborative Notebook & Pages API
 *   2. /api/groups/:groupId/notes       — Dashboard Flat Notes (backwards compatibility)
 */

'use strict';

const express = require('express');
const router  = express.Router({ mergeParams: true });

const ctrl = require('./notebook.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership, requireNotebookEditorAccess } = require('../../middleware/role.middleware');

// ─── All routes require authentication ────────────────────────────────────────
router.use(authMiddleware);

// ─── POST /api/notebooks/export/docx ─────────────────────────────────────────
// Must be registered BEFORE parameterized routes. Supports both shared group notes and isolated personal notes.
router.post(
  '/export/docx',
  ctrl.exportDocx
);

// ─── Folder Routes (/api/notebooks/folders) ──────────────────────────────────
router.get(
  '/folders/:groupId',
  requireGroupMembership,
  ctrl.getFolders
);

router.get(
  '/folders',
  requireGroupMembership,
  ctrl.getFolders
);

router.post(
  '/folders',
  requireGroupMembership,
  ctrl.createFolder
);

router.delete(
  '/folders/:folderId',
  requireGroupMembership,
  ctrl.deleteFolder
);

// ─── Top-level /pages routes (/api/notebooks/pages) ──────────────────────────
router.post(
  '/pages',
  requireGroupMembership,
  ctrl.createPage
);

router.put(
  '/pages/:pageId/permissions',
  requireGroupMembership,
  ctrl.updatePagePermissions
);

router.get(
  '/pages/:notebookId',
  requireGroupMembership,
  ctrl.getPages
);

router.get(
  '/pages',
  requireGroupMembership,
  ctrl.getPages
);

// ─── GET / (Notes List for /api/groups/:groupId/notes) ────────────────────────
router.get('/', requireGroupMembership, (req, res, next) => {
  if (req.baseUrl.includes('/notes') || req.params.groupId) {
    return ctrl.getNotes(req, res, next);
  }
  return res.status(404).json({ success: false, message: 'Please specify a group ID to list notebooks: GET /api/notebooks/:groupId' });
});

// ─── POST / (Create Note or Create Notebook) ──────────────────────────────────
router.post('/', requireGroupMembership, (req, res, next) => {
  // If request comes from the workspace notes modal or has groupId in params without notebook visibility
  if (req.baseUrl.includes('/notes') || (req.params.groupId && !req.body.visibility)) {
    return ctrl.create(req, res, next);
  }
  return ctrl.createNotebook(req, res, next);
});

// ─── Legacy Note Detail / Update / Delete Routes ──────────────────────────────
router.patch('/:noteId', requireGroupMembership, (req, res, next) => {
  if (req.baseUrl.includes('/notes')) {
    return ctrl.update(req, res, next);
  }
  next();
});

router.put('/:noteId', requireGroupMembership, (req, res, next) => {
  if (req.baseUrl.includes('/notes')) {
    return ctrl.update(req, res, next);
  }
  next();
});

router.delete('/:noteId', requireGroupMembership, (req, res, next) => {
  if (req.baseUrl.includes('/notes')) {
    return ctrl.remove(req, res, next);
  }
  next();
});

// ─── GET /api/notebooks/:groupId ──────────────────────────────────────────────
router.get(
  '/:groupId',
  requireGroupMembership,
  (req, res, next) => {
    if (req.baseUrl.includes('/notes')) {
      return ctrl.getNotes(req, res, next);
    }
    return ctrl.getGroupNotebooks(req, res, next);
  }
);

// ─── Notebook-level operations ────────────────────────────────────────────────
// PUT /api/notebooks/:id/permissions or /api/groups/:groupId/notes/:id/permissions
router.put(
  '/:id/permissions',
  requireGroupMembership,
  (req, res, next) => {
    if (req.baseUrl.includes('/notes') || req.body.permittedEditors !== undefined || req.body.permitted_editors !== undefined) {
      return ctrl.updatePagePermissions(req, res, next);
    }
    return requireNotebookEditorAccess(req, res, () => ctrl.updatePermissions(req, res, next));
  }
);

// DELETE /api/notebooks/:id — admin only
router.delete(
  '/:id',
  requireGroupMembership,
  requireNotebookEditorAccess,
  ctrl.deleteNotebook
);

// ─── Page sub-resource ────────────────────────────────────────────────────────
// GET /api/notebooks/:id/pages — viewer, editor, or admin
router.get(
  '/:id/pages',
  requireGroupMembership,
  ctrl.getPages
);

// POST /api/notebooks/:id/pages — any workspace member can create a page
router.post(
  '/:id/pages',
  requireGroupMembership,
  ctrl.createPage
);

// PUT /api/notebooks/:id/pages/:pageId/permissions — page creator or leader
router.put(
  '/:id/pages/:pageId/permissions',
  requireGroupMembership,
  ctrl.updatePagePermissions
);

// PATCH /api/notebooks/:id/pages/:pageId — page creator, permitted_editors, or leader
router.patch(
  '/:id/pages/:pageId',
  requireGroupMembership,
  ctrl.updatePage
);

// DELETE /api/notebooks/:id/pages/:pageId — page creator or leader
router.delete(
  '/:id/pages/:pageId',
  requireGroupMembership,
  ctrl.deletePage
);

module.exports = router;
