/**
 * Collaborative Notebook Routes
 *
 * Mounted at /api/notebooks in app.js.
 *
 * Route map:
 *   POST   /api/notebooks/export/docx             — generate & stream .docx for a page
 *
 *   GET    /api/notebooks/:groupId                — list group notebooks visible to user
 *   POST   /api/notebooks                         — create notebook (body: { groupId, ... })
 *   PUT    /api/notebooks/:id/permissions         — update share settings & member roles
 *   DELETE /api/notebooks/:id                     — delete notebook
 *
 *   GET    /api/notebooks/:id/pages               — list all pages (viewer+)
 *   POST   /api/notebooks/:id/pages               — add a page (editor+)
 *   PATCH  /api/notebooks/:id/pages/:pageId       — update a page (editor+)
 *   DELETE /api/notebooks/:id/pages/:pageId       — delete a page (editor+)
 */

'use strict';

const express = require('express');
const router  = express.Router();

const ctrl = require('./notebook.controller');
const { authMiddleware }               = require('../../middleware/auth.middleware');
const { requireGroupMembership, requireNotebookEditorAccess } = require('../../middleware/role.middleware');

// ─── All routes require authentication ────────────────────────────────────────
router.use(authMiddleware);

// ─── POST /api/notebooks/export/docx ─────────────────────────────────────────
// Must be registered BEFORE /:groupId to avoid Express treating "export" as a groupId.
// Viewers can export too — auth check is performed inside the service layer.
router.post(
  '/export/docx',
  requireGroupMembership,
  ctrl.exportDocx
);

// ─── GET /api/notebooks/:groupId ──────────────────────────────────────────────
// Uses requireGroupMembership so only workspace members can list notebooks.
router.get(
  '/:groupId',
  requireGroupMembership,
  ctrl.getGroupNotebooks
);

// ─── POST /api/notebooks ──────────────────────────────────────────────────────
// groupId comes from the request body; membership is verified inside the handler.
// We validate group membership here via middleware (groupId is in req.body).
router.post(
  '/',
  requireGroupMembership,
  ctrl.createNotebook
);

// ─── Notebook-level operations (require group membership) ─────────────────────
// The :id segment is the notebook's primary key.

// PUT /api/notebooks/:id/permissions — admin only (enforced in service layer)
router.put(
  '/:id/permissions',
  requireGroupMembership,       // validate workspace membership
  requireNotebookEditorAccess,  // require at least editor (admin check is in service)
  ctrl.updatePermissions
);

// DELETE /api/notebooks/:id — admin only (enforced in service layer)
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
