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
// Must be registered BEFORE parameterized routes.
router.post(
  '/export/docx',
  requireGroupMembership,
  ctrl.exportDocx
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
// PUT /api/notebooks/:id/permissions — admin only
router.put(
  '/:id/permissions',
  requireGroupMembership,
  requireNotebookEditorAccess,
  ctrl.updatePermissions
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

// POST /api/notebooks/:id/pages — editor or admin
router.post(
  '/:id/pages',
  requireGroupMembership,
  requireNotebookEditorAccess,
  ctrl.createPage
);

// PATCH /api/notebooks/:id/pages/:pageId — editor or admin
router.patch(
  '/:id/pages/:pageId',
  requireGroupMembership,
  requireNotebookEditorAccess,
  ctrl.updatePage
);

// DELETE /api/notebooks/:id/pages/:pageId — editor or admin
router.delete(
  '/:id/pages/:pageId',
  requireGroupMembership,
  requireNotebookEditorAccess,
  ctrl.deletePage
);

module.exports = router;
